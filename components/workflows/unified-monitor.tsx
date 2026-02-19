/**
 * Unified Monitoring Component
 * Shows all automation activity in real-time with countdown timers
 * Consolidates: AI Jobs, Workflow Instances, Task Executions, Drip Enrollments
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  parseWorkflowInstances,
  parseWorkflowExecutions,
  parseIndustryWorkflowInstances,
} from '@/lib/api-validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Zap,
  Users,
  Mail,
  Calendar,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface MonitoringItem {
  id: string;
  type: 'ai_job' | 'workflow_instance' | 'task_execution' | 'drip_enrollment';
  title: string;
  status: string;
  progress?: number;
  nextActionAt?: Date | string | null;
  startedAt?: Date | string;
  completedAt?: Date | string | null;
  metadata?: any;
}

interface UnifiedMonitorProps {
  userId: string;
  industry?: string;
}

export function UnifiedMonitor({ userId, industry }: UnifiedMonitorProps) {
  const [items, setItems] = useState<MonitoringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'running' | 'completed'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ai_job' | 'workflow_instance' | 'task_execution' | 'drip_enrollment'>('all');

  const abortRef = useRef<AbortController | null>(null);

  const fetchMonitoringData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);

      const isRE = industry === 'REAL_ESTATE' || !industry;

      // Fetch all data sources in parallel (with AbortController for cleanup)
      const [
        aiJobsRes,
        workflowInstancesRes,
        reWorkflowInstancesRes,
        dripEnrollmentsRes,
      ] = await Promise.all([
        fetch('/api/ai-employees/jobs?limit=50', { signal }),
        fetch('/api/workflows/instances/active?limit=50&status=all', { signal }).catch(() => ({ ok: false, json: () => ({ instances: [] }) })),
        isRE ? fetch('/api/real-estate/workflows/instances?limit=50', { signal }).catch(() => ({ ok: false, json: () => ({ instances: [] }) })) : Promise.resolve({ ok: false, json: () => ({ instances: [] }) }),
        fetch('/api/workflows/enrollments/active?limit=50&status=all', { signal }).catch(() => ({ ok: false, json: () => ({ enrollments: [] }) })),
      ]);

      if (signal?.aborted) return;

      const aiJobsData = aiJobsRes.ok ? await aiJobsRes.json() : { data: [] };
      const workflowInstancesData = workflowInstancesRes.ok ? await workflowInstancesRes.json() : { instances: [] };
      const reWorkflowInstancesData = reWorkflowInstancesRes.ok ? await reWorkflowInstancesRes.json() : { instances: [] };
      const dripEnrollmentsData = dripEnrollmentsRes.ok ? await dripEnrollmentsRes.json() : { enrollments: [] };

      // Normalize RE workflow instances (with Zod validation for safety)
      const reInstances = parseWorkflowInstances(reWorkflowInstancesData.instances);
      const normalizedREInstances = reInstances.map((inst) => {
        const executions = parseWorkflowExecutions(inst.executions);
        return {
          id: inst.id,
          templateId: inst.templateId,
          workflowName: inst.template?.name || 'Workflow',
          status: inst.status,
          startedAt: inst.startedAt,
          completedAt: inst.completedAt,
          lead: inst.lead,
          deal: inst.deal,
          totalTasks: inst.template?.tasks?.length || 0,
          executions: executions.map((e) => ({
            id: e.id,
            taskId: e.taskId,
            taskName: e.task?.name || 'Task',
            status: e.status,
            scheduledFor: e.scheduledFor || e.startedAt,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
          })),
        };
      });

      // Normalize industry workflow instances (with Zod validation)
      const industryInstances = parseIndustryWorkflowInstances(workflowInstancesData.instances);
      const normalizedIndustryInstances = industryInstances.map((inst) => ({
        id: inst.id,
        templateId: inst.templateId,
        workflowName: inst.workflowName || 'Workflow',
        status: inst.status,
        startedAt: inst.startedAt,
        completedAt: inst.completedAt,
        lead: inst.lead,
        deal: inst.deal,
        totalTasks: inst.totalTasks ?? 0,
        executions: (inst.executions || []).map((e) => ({
          id: e.id,
          taskId: e.taskId,
          taskName: e.taskName || 'Task',
          status: e.status,
          scheduledFor: e.scheduledFor || e.startedAt,
          startedAt: e.startedAt,
          completedAt: e.completedAt,
        })),
      }));

      // Merge workflow instances (RE + industry)
      const allWorkflowInstances = [...normalizedREInstances, ...normalizedIndustryInstances];

      // Transform AI Jobs
      const aiJobItems: MonitoringItem[] = (aiJobsData.data || []).filter(Boolean).map((job: any) => ({
        id: job?.id,
        type: 'ai_job' as const,
        title: `${job?.employee?.name || 'AI Employee'} - ${(job?.jobType || '').replace(/_/g, ' ')}`,
        status: job?.status,
        progress: job?.progress,
        startedAt: job?.startedAt,
        completedAt: job?.completedAt,
        metadata: {
          jobType: job?.jobType,
          input: job?.input,
          employee: job?.employee,
        },
      }));

      // Transform Workflow Instances (RE + industry)
      const workflowItems: MonitoringItem[] = allWorkflowInstances.filter(Boolean).flatMap((instance: any) => {
        const items: MonitoringItem[] = [];
        
        // Main instance
        items.push({
          id: instance?.id,
          type: 'workflow_instance' as const,
          title: `${instance?.workflowName} - ${instance?.lead?.businessName || instance?.deal?.title || 'Workflow'}`,
          status: instance?.status,
          startedAt: instance?.startedAt,
          completedAt: instance?.completedAt,
          metadata: {
            workflowId: instance?.templateId,
            lead: instance?.lead,
            deal: instance?.deal,
            totalTasks: instance?.totalTasks,
            currentTask: instance?.executions?.find((e: any) => e?.status === 'IN_PROGRESS'),
          },
        });

        // Add pending/upcoming task executions
        instance?.executions?.forEach((execution: any) => {
          if (execution?.status === 'PENDING' || execution?.status === 'IN_PROGRESS') {
            items.push({
              id: execution?.id,
              type: 'task_execution' as const,
              title: `${execution?.taskName} - ${instance?.workflowName}`,
              status: execution?.status,
              nextActionAt: execution?.scheduledFor,
              startedAt: execution?.startedAt,
              metadata: {
                workflowInstanceId: instance?.id,
                workflowName: instance?.workflowName,
                taskId: execution?.taskId,
              },
            });
          }
        });

        return items;
      });

      // Transform Drip Enrollments
      const dripItems: MonitoringItem[] = (dripEnrollmentsData.enrollments || []).filter(Boolean).map((enrollment: any) => ({
        id: enrollment?.id,
        type: 'drip_enrollment' as const,
        title: `${enrollment?.workflowName} - ${enrollment?.lead?.businessName || 'Lead'}`,
        status: enrollment?.status,
        nextActionAt: enrollment?.nextSendAt,
        startedAt: enrollment?.enrolledAt,
        completedAt: enrollment?.completedAt,
        metadata: {
          workflowId: enrollment?.workflowId,
          workflowName: enrollment?.workflowName,
          lead: enrollment?.lead,
          currentStep: enrollment?.currentStep,
          abTestGroup: enrollment?.abTestGroup,
        },
      }));

      // Combine and sort by urgency (next action time)
      const allItems = [...aiJobItems, ...workflowItems, ...dripItems].sort((a, b) => {
        const aTime = a.nextActionAt ? new Date(a.nextActionAt).getTime() : Infinity;
        const bTime = b.nextActionAt ? new Date(b.nextActionAt).getTime() : Infinity;
        return aTime - bTime;
      });

      if (!signal?.aborted) setItems(allItems);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Error fetching monitoring data:', err);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    abortRef.current = new AbortController();
    const ac = abortRef.current;
    fetchMonitoringData(ac.signal);
    const interval = setInterval(() => fetchMonitoringData(ac.signal), 5000);
    return () => {
      clearInterval(interval);
      ac.abort();
    };
  }, [industry]);

  // Calculate countdown timer
  const getCountdown = (nextActionAt: Date | string | null | undefined) => {
    if (!nextActionAt) return null;
    const now = new Date();
    const next = new Date(nextActionAt);
    const diff = next.getTime() - now.getTime();
    
    if (diff <= 0) return 'Now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getStatusBadge = (status: string, type: string) => {
    const statusColors: Record<string, string> = {
      'RUNNING': 'bg-blue-500',
      'ACTIVE': 'bg-green-500',
      'PENDING': 'bg-yellow-500',
      'IN_PROGRESS': 'bg-blue-500',
      'COMPLETED': 'bg-green-600',
      'FAILED': 'bg-red-500',
      'PAUSED': 'bg-amber-500',
      'CANCELLED': 'bg-gray-500',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-500'}>
        {(status || '').replace(/_/g, ' ')}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai_job':
        return <Zap className="h-4 w-4" />;
      case 'workflow_instance':
        return <Play className="h-4 w-4" />;
      case 'task_execution':
        return <Calendar className="h-4 w-4" />;
      case 'drip_enrollment':
        return <Mail className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredItems = items.filter(item => {
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    if (filter === 'all') return true;
    if (filter === 'active' && (item.status === 'ACTIVE' || item.status === 'RUNNING' || item.status === 'IN_PROGRESS')) return true;
    if (filter === 'pending' && item.status === 'PENDING') return true;
    if (filter === 'running' && (item.status === 'RUNNING' || item.status === 'IN_PROGRESS')) return true;
    if (filter === 'completed' && item.status === 'COMPLETED') return true;
    return false;
  });

  const activeItems = filteredItems.filter(i => 
    i.status === 'ACTIVE' || i.status === 'RUNNING' || i.status === 'IN_PROGRESS' || i.status === 'PENDING'
  );
  const completedItems = filteredItems.filter(i => i.status === 'COMPLETED' || i.status === 'FAILED');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Unified Activity Monitor</CardTitle>
              <CardDescription>
                Real-time monitoring of all automation activity
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMonitoringData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <TabsList className="bg-gray-800/80">
                <TabsTrigger value="all" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">All Types</TabsTrigger>
                <TabsTrigger value="ai_job" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">AI Jobs</TabsTrigger>
                <TabsTrigger value="workflow_instance" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Workflows</TabsTrigger>
                <TabsTrigger value="task_execution" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Tasks</TabsTrigger>
                <TabsTrigger value="drip_enrollment" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Drip Campaigns</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="bg-gray-800/80">
                <TabsTrigger value="all" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">All Status</TabsTrigger>
                <TabsTrigger value="active" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Active</TabsTrigger>
                <TabsTrigger value="pending" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Pending</TabsTrigger>
                <TabsTrigger value="running" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Running</TabsTrigger>
                <TabsTrigger value="completed" className="text-orange-500 data-[state=inactive]:hover:text-orange-400 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-lg">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Active Items with Countdowns */}
      {activeItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-600" />
              Active ({activeItems.length})
            </CardTitle>
            <CardDescription>Items currently running or scheduled</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeItems.map((item) => {
                const countdown = getCountdown(item.nextActionAt);
                const progress = item.progress || 0;
                
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-white border-2 border-purple-200 rounded-lg hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{item.title}</span>
                          {getStatusBadge(item.status, item.type)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {item.type === 'drip_enrollment' && item.metadata?.currentStep && (
                            <span>Step {item.metadata.currentStep}</span>
                          )}
                          {progress > 0 && (
                            <span>{progress}% complete</span>
                          )}
                          {item.startedAt && (
                            <span>Started {formatDistanceToNow(new Date(item.startedAt), { addSuffix: true })}</span>
                          )}
                        </div>
                        {progress > 0 && (
                          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    {countdown && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-lg">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-purple-700">
                          {countdown}
                        </span>
                        {item.nextActionAt && (
                          <span className="text-xs text-muted-foreground">
                            ({format(new Date(item.nextActionAt), 'h:mm a')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Items */}
      {completedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Recent Completed ({completedItems.length})
            </CardTitle>
            <CardDescription>Last 20 completed items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedItems.slice(0, 20).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-gray-100 rounded">
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.title}</span>
                        {getStatusBadge(item.status, item.type)}
                      </div>
                      {item.completedAt && (
                        <span className="text-xs text-muted-foreground">
                          Completed {formatDistanceToNow(new Date(item.completedAt), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Clock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Activity</h3>
            <p className="text-muted-foreground text-center">
              No {filter !== 'all' ? filter : ''} {typeFilter !== 'all' ? (typeFilter || '').replace('_', ' ') : 'items'} found
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
