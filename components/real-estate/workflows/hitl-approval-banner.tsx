'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Shield, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  hitlQueryKeys,
  fetchHITLPendingData,
  parseBannerNotifications,
  type BannerNotification,
} from '@/lib/hitl-queries';

export function HITLApprovalBanner() {
  const { data: session } = useSession() || {};
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [processingId, setProcessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isRealEstateUser = (session?.user as any)?.industry === 'REAL_ESTATE';

  const { data, isLoading } = useQuery({
    queryKey: hitlQueryKeys.pending(),
    queryFn: fetchHITLPendingData,
    enabled: !!isRealEstateUser,
    refetchInterval: 30_000, // 30s poll
    staleTime: 15_000, // 15s - show cached while refetching (stale-while-revalidate)
  });

  const notifications: BannerNotification[] = data
    ? parseBannerNotifications(data)
    : [];

  const handleApprove = async (executionId: string) => {
    setProcessingId(executionId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${executionId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Approved via banner' }),
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

  const handleReject = async (executionId: string) => {
    setProcessingId(executionId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${executionId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Rejected via banner', pauseWorkflow: false }),
      });

      if (res.ok) {
        toast.success('Task rejected');
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

  const visibleNotifications = notifications.filter((n) => !dismissedIds.has(n.id));

  if (!isRealEstateUser || visibleNotifications.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      {visibleNotifications.slice(0, 1).map((notification) => (
        <motion.div
          key={notification.id}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-50 via-amber-100 to-amber-50 border-b-2 border-amber-300 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">HITL Approval Required</span>
                    <Badge className="bg-amber-500 text-white text-xs">
                      {notification.urgency}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 truncate">
                    <strong>{notification.taskName}</strong> - {notification.message}
                  </p>
                  {notification.contactName && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      Contact: {notification.contactName}
                      {notification.dealAddress && ` • ${notification.dealAddress}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleApprove(notification.executionId)}
                  disabled={processingId === notification.executionId}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {processingId === notification.executionId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(notification.executionId)}
                  disabled={processingId === notification.executionId}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDismissedIds((prev) => new Set(prev).add(notification.id))}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
