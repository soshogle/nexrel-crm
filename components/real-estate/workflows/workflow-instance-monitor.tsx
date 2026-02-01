'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  Shield,
  XCircle,
  User,
  Home,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow, format } from 'date-fns';

interface WorkflowInstance {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  workflow: {
    id: string;
    name: string;
    workflowType: string;
    tasks: { id: string; name: string; order: number }[];
  };
  lead?: {
    id: string;
    businessName: string;
    contactPerson: string | null;
    email: string;
  } | null;
  deal?: {
    id: string;
    title: string;
    value: number;
  } | null;
  executions: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    task: {
      id: string;
      name: string;
      order: number;
      isHITL: boolean;
    };
  }[];
}

export function WorkflowInstanceMonitor() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null);

  const fetchInstances = async () => {
    try {
      const res = await fetch('/api/real-estate/workflows/instances');
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances || []);
      }
    } catch (error) {
      console.error('Error fetching workflow instances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstances();
    const interval = setInterval(fetchInstances, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return 'bg-blue-500';
      case 'COMPLETED':
        return 'bg-green-500';
      case 'PAUSED':
        return 'bg-amber-500';
      case 'FAILED':
        return 'bg-red-500';
      case 'WAITING_HITL':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RUNNING':
        return <Play className="h-4 w-4" />;
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PAUSED':
        return <Pause className="h-4 w-4" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4" />;
      case 'WAITING_HITL':
        return <Shield className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'RUNNING':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'WAITING_HITL':
        return <Shield className="h-4 w-4 text-amber-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'SKIPPED':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const calculateProgress = (instance: WorkflowInstance) => {
    const totalTasks = instance.workflow.tasks.length;
    const completedTasks = instance.executions.filter(
      (te) => te.status === 'COMPLETED'
    ).length;
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-blue-500" />
            Active Workflows
          </h2>
          <p className="text-gray-400 mt-1">
            Monitor workflow instances running on leads and deals
          </p>
        </div>
        <Button variant="outline" onClick={fetchInstances}>
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {instances.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-white">No Active Workflows</h3>
            <p className="text-gray-400 mt-2">
              Start a workflow from the Workflow Builder to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {instances.map((instance) => (
            <Card
              key={instance.id}
              className="bg-gray-900 border-gray-800 overflow-hidden"
            >
              <CardHeader
                className="cursor-pointer hover:bg-gray-800/50 transition-colors"
                onClick={() =>
                  setExpandedInstance(
                    expandedInstance === instance.id ? null : instance.id
                  )
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Status Badge */}
                    <Badge
                      className={`${getStatusColor(instance.status)} text-white`}
                    >
                      {getStatusIcon(instance.status)}
                      <span className="ml-1">{instance.status.replace('_', ' ')}</span>
                    </Badge>

                    {/* Workflow Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        {instance.workflow.workflowType === 'BUYER_PIPELINE' ? (
                          <Home className="h-4 w-4 text-blue-500" />
                        ) : (
                          <FileText className="h-4 w-4 text-green-500" />
                        )}
                        <CardTitle className="text-lg text-white">
                          {instance.workflow.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {instance.lead && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {instance.lead.businessName} {instance.lead.contactPerson || ""}
                          </span>
                        )}
                        {instance.deal && (
                          <span>Deal: {instance.deal.title}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progress */}
                    <div className="text-right">
                      <p className="text-sm text-gray-400">Progress</p>
                      <p className="text-lg font-semibold text-white">
                        {Math.round(calculateProgress(instance))}%
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-5 w-5 text-gray-500 transition-transform ${
                        expandedInstance === instance.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                <Progress
                  value={calculateProgress(instance)}
                  className="mt-4 h-2"
                />
              </CardHeader>

              {/* Expanded Task List */}
              {expandedInstance === instance.id && (
                <CardContent className="border-t border-gray-800 pt-4">
                  <div className="space-y-2">
                    {instance.workflow.tasks
                      .sort((a, b) => a.order - b.order)
                      .map((task) => {
                        const execution = instance.executions.find(
                          (te) => te.task.id === task.id
                        );
                        return (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-white">
                                {task.order}
                              </div>
                              {getTaskStatusIcon(execution?.status || 'PENDING')}
                              <span className="text-white">{task.name}</span>
                              {execution?.task.isHITL && (
                                <Shield className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                            <div className="text-sm text-gray-400">
                              {execution?.completedAt && (
                                <span>
                                  Completed{' '}
                                  {formatDistanceToNow(
                                    new Date(execution.completedAt),
                                    { addSuffix: true }
                                  )}
                                </span>
                              )}
                              {execution?.status === 'RUNNING' && (
                                <span className="text-blue-400">In progress...</span>
                              )}
                              {execution?.status === 'WAITING_HITL' && (
                                <span className="text-amber-400">Waiting for approval</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between text-sm text-gray-500">
                    <span>Started {format(new Date(instance.startedAt), 'PPp')}</span>
                    {instance.completedAt && (
                      <span>
                        Completed {format(new Date(instance.completedAt), 'PPp')}
                      </span>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
