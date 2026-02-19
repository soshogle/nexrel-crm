'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  hitlQueryKeys,
  fetchHITLPendingData,
  parsePanelNotifications,
} from '@/lib/hitl-queries';
import {
  Shield,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  FileText,
  Home,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface HITLNotification {
  id: string;
  taskExecution: {
    id: string;
    task: {
      id: string;
      name: string;
      description: string;
      taskType: string;
      order: number;
    };
    workflowInstance: {
      id: string;
      status: string;
      workflow: {
        name: string;
        workflowType: string;
      };
      lead?: {
        id: string;
        businessName: string;
        contactPerson: string | null;
        email: string;
        phone: string;
      } | null;
      deal?: {
        id: string;
        title: string;
        value: number;
      } | null;
    };
  };
  message: string;
  notificationType: string;
  status: string;
  createdAt: string;
}

export function HITLApprovalPanel() {
  const { data: session } = useSession() || {};
  const [selectedNotification, setSelectedNotification] = useState<HITLNotification | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: hitlQueryKeys.pending(),
    queryFn: fetchHITLPendingData,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const notifications: HITLNotification[] = data
    ? (parsePanelNotifications(data) as HITLNotification[])
    : [];
  const loading = isLoading;

  const handleApprove = async (notificationId: string) => {
    setProcessingId(notificationId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${notificationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || 'Approved' }),
      });

      if (res.ok) {
        toast.success('Task approved! Workflow will continue.');
        await queryClient.invalidateQueries({ queryKey: hitlQueryKeys.pending() });
        setSelectedNotification(null);
        setNotes('');
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? 'Failed to approve');
      }
    } catch (error) {
      toast.error('Failed to approve task');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (notificationId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingId(notificationId);
    try {
      const res = await fetch(`/api/real-estate/workflows/hitl/${notificationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (res.ok) {
        toast.success('Task rejected. Workflow paused.');
        await queryClient.invalidateQueries({ queryKey: hitlQueryKeys.pending() });
        setSelectedNotification(null);
        setShowRejectDialog(false);
        setRejectReason('');
      } else {
        const err = await res.json();
        toast.error(err.message ?? err.error ?? 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject task');
    } finally {
      setProcessingId(null);
    }
  };

  const getWorkflowTypeIcon = (type: string) => {
    return type === 'BUYER_PIPELINE' ? (
      <Home className="h-4 w-4 text-blue-500" />
    ) : (
      <FileText className="h-4 w-4 text-green-500" />
    );
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
            <Shield className="h-6 w-6 text-amber-600" />
            HITL Approval Queue
          </h2>
          <p className="text-gray-600 mt-1">
            Review and approve human-in-the-loop tasks to continue workflows
          </p>
        </div>
        <Badge className="bg-amber-100 text-amber-700 border-amber-300">
          {notifications.length} Pending
        </Badge>
      </div>

      {notifications.length === 0 ? (
        <Card className="bg-white border-2 border-purple-200 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900">All Clear!</h3>
            <p className="text-gray-600 mt-2">No pending HITL approvals at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {notifications
            .filter((n) => n?.taskExecution?.task)
            .map((notification) => (
            <Card
              key={notification.id}
              className="bg-white border-2 border-purple-200 hover:border-amber-400 transition-all cursor-pointer shadow-md hover:shadow-lg"
              onClick={() => setSelectedNotification(notification)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Shield className="h-6 w-6 text-amber-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getWorkflowTypeIcon(notification.taskExecution?.workflowInstance?.workflow?.workflowType)}
                      <span className="text-sm text-gray-600 font-medium">
                        {notification.taskExecution?.workflowInstance?.workflow?.name ?? 'Workflow'}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-sm text-gray-500">
                        Step {notification.taskExecution?.task?.order ?? 0}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-gray-900">
                      {notification.taskExecution?.task?.name ?? 'Task'}
                    </h3>

                    <p className="text-gray-600 text-sm mt-1">
                      {notification.message}
                    </p>

                    {/* Context */}
                    <div className="flex items-center gap-4 mt-3">
                      {notification.taskExecution?.workflowInstance?.lead && (
                        <div className="flex items-center gap-1 text-sm text-purple-600 font-medium">
                          <User className="h-4 w-4" />
                          <span>
                            {(notification.taskExecution.workflowInstance.lead as { businessName?: string; contactPerson?: string | null }).businessName}{' '}
                            {(notification.taskExecution.workflowInstance.lead as { businessName?: string; contactPerson?: string | null }).contactPerson || ''}
                          </span>
                        </div>
                      )}
                      {notification.taskExecution?.workflowInstance?.deal && (
                        <div className="flex items-center gap-1 text-sm text-green-600 font-medium">
                          <span>
                            ${notification.taskExecution?.workflowInstance?.deal?.value?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApprove(notification.id);
                      }}
                      disabled={processingId === notification.id}
                    >
                      {processingId === notification.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNotification(notification);
                        setShowRejectDialog(true);
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedNotification && !showRejectDialog}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      >
        <DialogContent className="bg-white border-2 border-purple-200 max-w-2xl shadow-xl">
          {selectedNotification && (
            <>
              <DialogHeader className="bg-gradient-to-r from-purple-50 to-white p-4 -m-6 mb-4 rounded-t-lg border-b-2 border-purple-200">
                <DialogTitle className="text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  {selectedNotification.taskExecution?.task?.name ?? 'Task'}
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Review the details below before approving or rejecting this task.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Task Description */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <h4 className="text-sm font-bold text-gray-900 mb-2">Task Description</h4>
                    <p className="text-gray-700">
                    {selectedNotification.taskExecution?.task?.description || 'No description provided.'}
                  </p>
                </div>

                {/* Lead/Deal Info */}
                {selectedNotification.taskExecution?.workflowInstance?.lead && (
                  <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                    <h4 className="text-sm font-bold text-purple-700 mb-2 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Lead Information
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Name: </span>
                        <span className="text-gray-900 font-medium">
                          {(selectedNotification.taskExecution.workflowInstance.lead as { businessName?: string; contactPerson?: string | null }).businessName}{' '}
                          {(selectedNotification.taskExecution.workflowInstance.lead as { businessName?: string; contactPerson?: string | null }).contactPerson || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Email: </span>
                        <span className="text-gray-900 font-medium">
                          {selectedNotification.taskExecution?.workflowInstance?.lead?.email}
                        </span>
                      </div>
                      {selectedNotification.taskExecution?.workflowInstance?.lead?.phone && (
                        <div>
                          <span className="text-gray-600">Phone: </span>
                          <span className="text-gray-900 font-medium">
                            {selectedNotification.taskExecution?.workflowInstance?.lead?.phone}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-gray-900 font-medium">Approval Notes (optional)</Label>
                  <Textarea
                    placeholder="Add any notes for this approval..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-white border-purple-200 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-md"
                  onClick={() => handleApprove(selectedNotification.id)}
                  disabled={processingId === selectedNotification.id}
                >
                  {processingId === selectedNotification.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Approve & Continue Workflow
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setShowRejectDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-white border-2 border-red-200 shadow-xl">
          <DialogHeader className="bg-gradient-to-r from-red-50 to-white p-4 -m-6 mb-4 rounded-t-lg border-b-2 border-red-200">
            <DialogTitle className="text-gray-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Reject Task
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              Please provide a reason for rejecting this task. The workflow will be paused.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-gray-900 font-medium">Rejection Reason *</Label>
              <Textarea
                placeholder="Explain why this task is being rejected..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="bg-white border-red-200 text-gray-900 min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-purple-200 text-gray-700 hover:bg-purple-50"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600"
              onClick={() => selectedNotification && handleReject(selectedNotification.id)}
              disabled={!rejectReason.trim() || processingId === selectedNotification?.id}
            >
              {processingId === selectedNotification?.id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Reject Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
