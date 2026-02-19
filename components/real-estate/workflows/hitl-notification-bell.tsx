'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Shield, Clock, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
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

export function HITLNotificationBell() {
  const { data: session } = useSession() || {};
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isRealEstateUser = (session?.user as any)?.industry === 'REAL_ESTATE';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: hitlQueryKeys.pending(),
    queryFn: fetchHITLPendingData,
    enabled: !!isRealEstateUser,
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });

  const notifications: HITLNotification[] = data
    ? parsePanelNotifications(data)
    : [];

  const handleApprove = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${notificationId}/approve`, {
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

  const handleReject = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${notificationId}/reject`, {
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

  if (!isRealEstateUser) return null;

  const pendingCount = notifications.length;
  const loading = isLoading || (open && isFetching);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-600" />
          {pendingCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-amber-500 text-white text-xs"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold">HITL Approvals</h3>
            </div>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Human-in-the-Loop tasks waiting for your approval
          </p>
        </div>

        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500 opacity-50" />
              <p className="text-sm">No pending approvals</p>
              <p className="text-xs text-gray-400 mt-1">All HITL gates are clear</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications
                .filter((n) => n?.taskExecution?.task)
                .map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {notification.taskExecution?.task?.name ?? 'Task'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {notification.message}
                        </p>

                        {notification.taskExecution?.workflowInstance?.lead && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                            <User className="h-3 w-3" />
                            <span>
                              {notification.taskExecution.workflowInstance.lead.businessName}{' '}
                              {notification.taskExecution.workflowInstance.lead.contactPerson || ''}
                            </span>
                          </div>
                        )}
                        {notification.taskExecution?.workflowInstance?.deal && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                            <span className="font-medium">
                              Deal: {notification.taskExecution.workflowInstance.deal.title}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(notification.createdAt ?? ''), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1 h-8 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApprove(notification.id ?? '')}
                            disabled={processingId === notification.id}
                          >
                            {processingId === notification.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => handleReject(notification.id ?? '')}
                            disabled={processingId === notification.id}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setOpen(false);
                window.location.href = '/dashboard/ai-employees?tab=workflows';
              }}
            >
              View all in Workflow Builder
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
