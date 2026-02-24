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
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDistanceToNow, format } from 'date-fns';
import { parseIndustryWorkflowInstances } from '@/lib/api-validation';

interface WorkflowInstance {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  workflowName: string;
  totalTasks: number;
  lead?: { businessName?: string; contactPerson?: string | null } | null;
  deal?: { title?: string; value?: number } | null;
  executions: Array<{
    id: string;
    taskName: string;
    status: string;
    completedAt: string | null;
  }>;
}

export function IndustryWorkflowMonitor() {
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInstance, setExpandedInstance] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchInstances = async (signal?: AbortSignal) => {
    try {
      const res = await fetch('/api/workflows/instances/active?limit=50&status=all', { signal });
      if (res.ok) {
        const data = await res.json();
        const parsed = parseIndustryWorkflowInstances(data.instances || []);
        const normalized: WorkflowInstance[] = parsed
          .filter((inst) => inst?.id)
          .map((inst) => ({
            id: inst.id ?? '',
            status: inst.status ?? 'UNKNOWN',
            startedAt: (inst as any).startedAt ?? '',
            completedAt: (inst as any).completedAt ?? null,
            workflowName: inst.workflowName ?? 'Workflow',
            totalTasks: inst.totalTasks ?? 0,
            lead: inst.lead as WorkflowInstance['lead'],
            deal: inst.deal as WorkflowInstance['deal'],
            executions: (inst.executions ?? []).map((e: any) => ({
              id: e.id ?? '',
              taskName: e.taskName ?? 'Task',
              status: e.status ?? 'PENDING',
              completedAt: e.completedAt ?? null,
            })),
          }));
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
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const calculateProgress = (instance: WorkflowInstance) => {
    const completed = instance.executions.filter((e) => e.status === 'COMPLETED').length;
    return instance.totalTasks > 0 ? (completed / instance.totalTasks) * 100 : 0;
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
          onClick={() => fetchInstances()}
          className="border-purple-200 text-gray-700 hover:bg-purple-50"
        >
          <Loader2 className="h-4 w-4 mr-2" />
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
                  setExpandedInstance(expandedInstance === instance.id ? null : instance.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge
                      className={`${getStatusColor(instance.status)} text-white border-2 border-white`}
                    >
                      {getStatusIcon(instance.status)}
                      <span className="ml-1">{instance.status.replace('_', ' ')}</span>
                    </Badge>
                    <div>
                      <CardTitle className="text-lg text-gray-900">
                        {instance.workflowName}
                      </CardTitle>
                      <CardDescription className="mt-1 text-gray-600">
                        {instance.lead && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {instance.lead.businessName} {instance.lead.contactPerson || ''}
                          </span>
                        )}
                        {instance.deal && (
                          <span>Deal: {instance.deal.title}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
                <Progress value={calculateProgress(instance)} className="mt-4 h-2" />
              </CardHeader>

              {expandedInstance === instance.id && (
                <CardContent className="border-t-2 border-purple-200 pt-4 bg-purple-50/30">
                  <div className="space-y-2">
                    {instance.executions.map((exec, idx) => (
                      <div
                        key={exec.id || idx}
                        className="flex items-center justify-between p-3 bg-white border border-purple-200 rounded-lg shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                            {idx + 1}
                          </div>
                          {getTaskStatusIcon(exec.status)}
                          <span className="text-gray-900 font-medium">{exec.taskName}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {exec.completedAt && (
                            <span>
                              Completed{' '}
                              {formatDistanceToNow(new Date(exec.completedAt), { addSuffix: true })}
                            </span>
                          )}
                          {exec.status === 'RUNNING' && (
                            <span className="text-purple-600 font-medium">In progress...</span>
                          )}
                          {exec.status === 'WAITING_HITL' && (
                            <span className="text-amber-600 font-medium">Waiting for approval</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-purple-200 text-sm text-gray-600">
                    Started {instance.startedAt ? format(new Date(instance.startedAt), 'PPp') : '—'}
                    {instance.completedAt && (
                      <span className="ml-4">
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
