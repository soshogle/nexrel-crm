'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell, Shield, Clock, User, CheckCircle, XCircle, Loader2,
  ChevronRight, Building2, X, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  hitlQueryKeys,
  fetchHITLPendingData,
  parsePanelNotifications,
} from '@/lib/hitl-queries';
import type { HITLNotification } from '@/lib/api-validation';
import { useRouter } from 'next/navigation';

const HITL_ACCENT = 'bg-purple-600';

const URGENCY_STYLES: Record<string, string> = {
  URGENT: 'border-l-4 border-l-red-500 bg-red-50',
  HIGH: 'border-l-4 border-l-orange-500 bg-orange-50/50',
  NORMAL: 'border-l-4 border-l-purple-500',
  LOW: 'border-l-4 border-l-gray-300',
};

interface NormalizedApproval {
  id: string;
  executionId: string;
  taskName: string;
  message: string;
  contactName?: string;
  contactEmail?: string;
  dealTitle?: string;
  dealAddress?: string;
  workflowName?: string;
  urgency: string;
  createdAt: string;
  leadId?: string;
  dealId?: string;
  instanceId?: string;
}

function normalizeNotification(n: any): NormalizedApproval {
  const taskExec = n.taskExecution;
  return {
    id: n.id || '',
    executionId: n.executionId || taskExec?.id || '',
    taskName: taskExec?.task?.name || n.taskName || 'Approval Required',
    message: n.message || taskExec?.task?.description || 'This task requires your approval to proceed.',
    contactName:
      taskExec?.workflowInstance?.lead?.businessName ||
      taskExec?.workflowInstance?.lead?.contactPerson ||
      n.contactName || undefined,
    contactEmail: taskExec?.workflowInstance?.lead?.email || undefined,
    dealTitle:
      taskExec?.workflowInstance?.deal?.title ||
      n.dealAddress || undefined,
    dealAddress: n.dealAddress || undefined,
    workflowName: taskExec?.workflowInstance?.workflow?.name || undefined,
    urgency: n.urgency || 'NORMAL',
    createdAt: n.createdAt || '',
    leadId: taskExec?.workflowInstance?.lead?.id || undefined,
    dealId: taskExec?.workflowInstance?.deal?.id || undefined,
    instanceId: taskExec?.workflowInstance?.id || undefined,
  };
}

export function HITLNotificationBell() {
  const { data: session } = useSession() || {};
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const hasAutoOpened = useRef(false);
  const router = useRouter();

  const isRealEstateUser = (session?.user as any)?.industry === 'REAL_ESTATE';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: hitlQueryKeys.pending(),
    queryFn: fetchHITLPendingData,
    enabled: !!isRealEstateUser,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });

  // Normalize from both sources: enriched notifications + pendingApprovals
  const approvals: NormalizedApproval[] = React.useMemo(() => {
    if (!data) return [];

    const seen = new Set<string>();
    const result: NormalizedApproval[] = [];

    // Primary: enriched notifications
    const notifs = Array.isArray(data.notifications) ? data.notifications : [];
    for (const n of notifs) {
      if (!n || !n.id) continue;
      const normalized = normalizeNotification(n);
      seen.add(normalized.executionId);
      result.push(normalized);
    }

    // Secondary: pendingApprovals (task executions not already covered)
    const pending = Array.isArray(data.pendingApprovals) ? data.pendingApprovals : [];
    for (const exec of pending) {
      if (!exec || !exec.id || seen.has(exec.id)) continue;
      result.push({
        id: exec.id,
        executionId: exec.id,
        taskName: exec.task?.name || 'Approval Required',
        message: exec.task?.description || 'This task requires your approval to proceed.',
        contactName: exec.instance?.lead?.businessName || exec.instance?.lead?.contactPerson || undefined,
        contactEmail: exec.instance?.lead?.email || undefined,
        dealTitle: exec.instance?.deal?.title || undefined,
        workflowName: exec.instance?.template?.name || undefined,
        urgency: 'NORMAL',
        createdAt: exec.createdAt || '',
        leadId: exec.instance?.lead?.id || undefined,
        dealId: exec.instance?.deal?.id || undefined,
        instanceId: exec.instance?.id || undefined,
      });
    }

    return result;
  }, [data]);

  useEffect(() => {
    if (approvals.length > 0 && !hasAutoOpened.current) {
      hasAutoOpened.current = true;
      setOpen(true);
    }
    if (approvals.length === 0) hasAutoOpened.current = false;
  }, [approvals.length]);

  const handleApprove = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(id);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via notification bell' }),
      });
      if (res.ok) {
        toast.success('Task approved! Workflow will continue.');
        await queryClient.invalidateQueries({ queryKey: hitlQueryKeys.pending() });
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? 'Failed to approve');
      }
    } catch {
      toast.error('Failed to approve task');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setProcessingId(id);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Rejected via notification bell' }),
      });
      if (res.ok) {
        toast.success('Task rejected. Workflow paused.');
        await queryClient.invalidateQueries({ queryKey: hitlQueryKeys.pending() });
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? 'Failed to reject');
      }
    } catch {
      toast.error('Failed to reject task');
    } finally {
      setProcessingId(null);
    }
  };

  const navigateToApproval = (approval: NormalizedApproval) => {
    setOpen(false);
    if (approval.leadId) {
      router.push(`/dashboard/leads/${approval.leadId}`);
    } else if (approval.dealId) {
      router.push(`/dashboard/deals/${approval.dealId}`);
    } else {
      router.push('/dashboard/ai-employees?tab=workflows');
    }
  };

  if (!isRealEstateUser) return null;

  const pendingCount = approvals.length;
  const loading = isLoading || (open && isFetching);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {pendingCount > 0 && (
            <Badge className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 ${HITL_ACCENT} text-white text-xs`}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0 rounded-xl shadow-xl border border-gray-200" align="end">
        {/* Header */}
        <div className={`p-4 border-b rounded-t-xl ${HITL_ACCENT} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <h3 className="font-semibold">HITL Approvals</h3>
              {pendingCount > 0 && (
                <Badge className="bg-white/20 text-white text-xs">{pendingCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin text-white/80" />}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/10 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-white/90 mt-1">
            Tasks waiting for your approval before workflows can proceed
          </p>
        </div>

        {/* Content */}
        {approvals.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="text-sm font-medium">No pending approvals</p>
            <p className="text-xs text-gray-400 mt-1">All HITL gates are clear</p>
          </div>
        ) : (
          <div>
            {/* Primary approval — shown in full */}
            {(() => {
              const approval = approvals[0];
              const isProcessing = processingId === approval.id;
              const urgencyStyle = URGENCY_STYLES[approval.urgency] || URGENCY_STYLES.NORMAL;
              return (
                <div className={`p-4 ${urgencyStyle}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      approval.urgency === 'URGENT' ? 'bg-red-100' :
                      approval.urgency === 'HIGH' ? 'bg-orange-100' : 'bg-purple-100'
                    }`}>
                      {approval.urgency === 'URGENT' ? (
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Shield className="h-5 w-5 text-purple-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm text-gray-900 truncate">{approval.taskName}</p>
                        {approval.urgency === 'URGENT' && <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">URGENT</Badge>}
                        {approval.urgency === 'HIGH' && <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">HIGH</Badge>}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{approval.message}</p>
                      {approval.contactName && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                          <User className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{approval.contactName}</span>
                        </div>
                      )}
                      {approval.dealTitle && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-green-600">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{approval.dealTitle}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{approval.createdAt ? formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true }) : 'Just now'}</span>
                        {approval.workflowName && <><span className="mx-1">&bull;</span><span className="truncate">{approval.workflowName}</span></>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="flex-1 h-8 bg-green-600 hover:bg-green-700 text-white" onClick={(e) => handleApprove(approval.id, e)} disabled={isProcessing}>
                          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle className="h-3 w-3 mr-1" />Approve</>}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 h-8 border-red-300 text-red-600 hover:bg-red-50" onClick={(e) => handleReject(approval.id, e)} disabled={isProcessing}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" className="w-full h-7 text-xs mt-2 text-gray-500" onClick={() => navigateToApproval(approval)}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {approval.leadId ? 'Open Lead' : approval.dealId ? 'Open Deal' : 'View in Workflows'}
                        <ChevronRight className="h-3 w-3 ml-auto" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Remaining approvals — compact, scrollable */}
            {approvals.length > 1 && (
              <>
                <div className="px-4 py-1.5 bg-gray-100 border-y text-xs text-gray-500 font-medium">
                  {approvals.length - 1} more pending
                </div>
                <ScrollArea className="max-h-[180px]">
                  <div className="divide-y">
                    {approvals.slice(1).map((approval) => {
                      const isProcessing = processingId === approval.id;
                      return (
                        <div key={approval.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              approval.urgency === 'URGENT' ? 'bg-red-100' : approval.urgency === 'HIGH' ? 'bg-orange-100' : 'bg-purple-100'
                            }`}>
                              {approval.urgency === 'URGENT' ? <AlertTriangle className="h-4 w-4 text-red-600" /> : <Shield className="h-4 w-4 text-purple-600" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm text-gray-900 truncate">{approval.taskName}</p>
                                {approval.urgency === 'URGENT' && <Badge className="bg-red-100 text-red-700 text-[10px] px-1 py-0">URGENT</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                {approval.contactName && <span className="truncate">{approval.contactName}</span>}
                                {approval.contactName && approval.createdAt && <span>&bull;</span>}
                                {approval.createdAt && <span>{formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5 flex-shrink-0">
                              <Button size="sm" className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white" onClick={(e) => { e.stopPropagation(); handleApprove(approval.id, e); }} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-red-300 text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleReject(approval.id, e); }} disabled={isProcessing}>
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        {approvals.length > 0 && (
          <div className="p-3 border-t bg-gray-50 rounded-b-xl">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
              onClick={() => {
                setOpen(false);
                router.push('/dashboard/ai-employees?tab=workflows');
              }}
            >
              View all approvals in Workflow Builder
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
