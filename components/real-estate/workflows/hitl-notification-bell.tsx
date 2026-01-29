'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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

interface HITLNotification {
  id: string;
  taskExecution: {
    id: string;
    task: {
      name: string;
      description: string;
    };
    workflowInstance: {
      id: string;
      lead?: { businessName: string; contactPerson: string | null; email: string | null } | null;
      deal?: { title: string } | null;
    };
  };
  message: string;
  notificationType: string;
  status: string;
  createdAt: string;
}

export function HITLNotificationBell() {
  const { data: session } = useSession() || {};
  const [notifications, setNotifications] = useState<HITLNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is in real estate industry
  const isRealEstateUser = (session?.user as any)?.industry === 'REAL_ESTATE';

  // Fetch pending HITL notifications
  const fetchNotifications = async () => {
    if (!isRealEstateUser) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/real-estate/workflows/hitl/pending');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching HITL notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Poll for notifications every 30 seconds
  useEffect(() => {
    if (isRealEstateUser) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isRealEstateUser]);

  // Fetch when popover opens
  useEffect(() => {
    if (open && isRealEstateUser) {
      fetchNotifications();
    }
  }, [open, isRealEstateUser]);

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
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to approve');
      }
    } catch (error) {
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
        body: JSON.stringify({ reason: 'Rejected via notification bell' }),
      });
      
      if (res.ok) {
        toast.success('Task rejected. Workflow paused.');
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to reject');
      }
    } catch (error) {
      toast.error('Failed to reject task');
    } finally {
      setProcessingId(null);
    }
  };

  // Don't render for non-real-estate users
  if (!isRealEstateUser) return null;

  const pendingCount = notifications.length;

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
              {notifications.map((notification) => (
                <div key={notification.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {notification.taskExecution.task.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {notification.message}
                      </p>
                      
                      {/* Context: Lead or Deal */}
                      {notification.taskExecution.workflowInstance.lead && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                          <User className="h-3 w-3" />
                          <span>
                            {notification.taskExecution.workflowInstance.lead.businessName}{' '}
                            {notification.taskExecution.workflowInstance.lead.contactPerson || ''}
                          </span>
                        </div>
                      )}
                      {notification.taskExecution.workflowInstance.deal && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                          <span className="font-medium">
                            Deal: {notification.taskExecution.workflowInstance.deal.title}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 h-8 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(notification.id)}
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
                          onClick={() => handleReject(notification.id)}
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
