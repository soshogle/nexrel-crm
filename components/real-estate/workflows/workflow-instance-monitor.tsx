'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { parseWorkflowInstances, parseWorkflowExecutions } from '@/lib/api-validation';

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

  const abortRef = useRef<AbortController | null>(null);

  const fetchInstances = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/real-estate/workflows/instances', { signal });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseWorkflowInstances(data.instances);
        // Normalize template -> workflow for display (API returns template)
        const normalized = parsed
          .filter((inst) => inst?.id)
          .map((inst) => {
            const executions = parseWorkflowExecutions(inst.executions);
            const tasks = (inst.template?.tasks ?? []).map((t: { id?: string; name?: string; displayOrder?: number }) => ({
              id: t.id ?? '',
              name: t.name ?? 'Task',
              order: t.displayOrder ?? 0,
            }));
            return {
              id: inst.id ?? '',
              status: inst.status ?? 'UNKNOWN',
              startedAt: inst.startedAt ?? '',
              completedAt: inst.completedAt ?? null,
              workflow: {
                id: inst.templateId ?? '',
                name: inst.template?.name ?? 'Workflow',
                workflowType: 'BUYER_PIPELINE' as const,
                tasks,
              },
              lead: inst.lead as WorkflowInstance['lead'],
              deal: inst.deal as WorkflowInstance['deal'],
              executions: executions
                .filter((e): e is NonNullable<typeof e> => e != null)
                .map((e) => ({
                  id: e.id ?? '',
                  status: e.status ?? 'PENDING',
                  startedAt: e.startedAt ?? null,
                  completedAt: e.completedAt ?? null,
                  task: {
                    id: e.task?.id ?? e.taskId ?? '',
                    name: e.task?.name ?? 'Task',
                    order: e.task?.displayOrder ?? 0,
                    isHITL: e.task?.isHITL ?? false,
                  },
                })),
            };
          });
        if (!signal?.aborted) setInstances(normalized);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error fetching workflow instances:', err);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    abortRef.current = new AbortController();
    const ac = abortRef.current;
    fetchInstances(ac.signal);
    const interval = setInterval(() => fetchInstances(ac.signal), 15000);
    return () => {
      clearInterval(interval);
      ac.abort();
    };
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
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border-2 border-purple-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-6 w-6 text-purple-600" />
            Active Workflows
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor workflow instances running on leads and deals
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchInstances}
          className="border-purple-200 text-gray-700 hover:bg-purple-50"
        >
          <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {instances.length === 0 ? (
        <Card className="bg-white border-2 border-purple-200 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-purple-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">No Active Workflows</h3>
            <p className="text-gray-600 mt-2">
              Start a workflow from the Workflow Builder to see it here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {instances.map((instance) => (
            <Card
              key={instance.id}
              className="bg-white border-2 border-purple-200 overflow-hidden shadow-md hover:shadow-lg transition-all"
            >
              <CardHeader
                className="cursor-pointer hover:bg-purple-50 transition-colors"
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
                      className={`${getStatusColor(instance.status)} text-white border-2 border-white`}
                    >
                      {getStatusIcon(instance.status)}
                      <span className="ml-1">{instance.status.replace('_', ' ')}</span>
                    </Badge>

                    {/* Workflow Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        {instance.workflow.workflowType === 'BUYER_PIPELINE' ? (
                          <Home className="h-4 w-4 text-purple-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-purple-600" />
                        )}
                        <CardTitle className="text-lg text-gray-900">
                          {instance.workflow.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-1 text-gray-600">
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
                      <p className="text-sm text-gray-600">Progress</p>
                      <p className="text-lg font-bold text-purple-600">
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
                <CardContent className="border-t-2 border-purple-200 pt-4 bg-purple-50/30">
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
                            className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-sm font-bold text-white border-2 border-white shadow-sm">
                                {task.order}
                              </div>
                              {getTaskStatusIcon(execution?.status || 'PENDING')}
                              <span className="text-gray-900 font-medium">{task.name}</span>
                              {execution?.task.isHITL && (
                                <Shield className="h-4 w-4 text-amber-600" />
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
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
                                <span className="text-purple-600 font-medium">In progress...</span>
                              )}
                              {execution?.status === 'WAITING_HITL' && (
                                <span className="text-amber-600 font-medium">Waiting for approval</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-purple-200 flex justify-between text-sm text-gray-600">
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
