/**
 * Failover Events Tab Component
 * Shows failover events history and allows approval/rollback
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, RotateCcw, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface FailoverEvent {
  id: string;
  triggerType: 'CRITICAL' | 'DEGRADED' | 'MANUAL';
  detectedAt: string;
  approvalWindowStarted: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTING' | 'COMPLETED' | 'CANCELLED' | 'ROLLED_BACK';
  affectedAgentsCount: number;
  totalActiveAgentsCount: number;
  testResultsDuringWindow: any;
  failoverExecutedAt: string | null;
  rollbackAt: string | null;
  fromAccount: { id: string; name: string; accountSid: string } | null;
  toAccount: { id: string; name: string; accountSid: string } | null;
  notes: string | null;
  errorMessage: string | null;
}

export default function FailoverEventsTab() {
  const [events, setEvents] = useState<FailoverEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
    // Refresh every 5 seconds for pending events
    const interval = setInterval(() => {
      fetchEvents();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/admin/twilio-failover/events');
      const data = await response.json();
      if (data.success) {
        setEvents(data.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveFailover = async (eventId: string) => {
    setProcessing(eventId);
    try {
      const response = await fetch('/api/admin/twilio-failover/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Failover approved and executing');
        fetchEvents();
      } else {
        toast.error(data.error || 'Failed to approve failover');
      }
    } catch (error) {
      toast.error('Failed to approve failover');
    } finally {
      setProcessing(null);
    }
  };

  const rollbackFailover = async (eventId: string) => {
    if (!confirm('Are you sure you want to rollback this failover?')) return;
    
    setProcessing(eventId);
    try {
      const response = await fetch('/api/admin/twilio-failover/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Failover rolled back successfully');
        fetchEvents();
      } else {
        toast.error(data.error || 'Failed to rollback');
      }
    } catch (error) {
      toast.error('Failed to rollback failover');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge className="bg-yellow-600"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'APPROVED':
        return <Badge className="bg-blue-600">Approved</Badge>;
      case 'EXECUTING':
        return <Badge className="bg-purple-600"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Executing</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-gray-600"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      case 'ROLLED_BACK':
        return <Badge className="bg-orange-600"><RotateCcw className="h-3 w-3 mr-1" />Rolled Back</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTriggerTypeBadge = (type: string) => {
    switch (type) {
      case 'CRITICAL':
        return <Badge className="bg-red-600">Critical</Badge>;
      case 'DEGRADED':
        return <Badge className="bg-yellow-600">Degraded</Badge>;
      case 'MANUAL':
        return <Badge className="bg-blue-600">Manual</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getRemainingTime = (startedAt: string | null) => {
    if (!startedAt) return null;
    const start = new Date(startedAt).getTime();
    const now = Date.now();
    const elapsed = now - start;
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const remaining = windowMs - elapsed;
    if (remaining <= 0) return 'Expired';
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            No failover events yet
          </CardContent>
        </Card>
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTriggerTypeBadge(event.triggerType)}
                  {getStatusBadge(event.status)}
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(event.detectedAt).toLocaleString()}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-400">From Account</div>
                  <div className="font-medium">{event.fromAccount?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">To Account</div>
                  <div className="font-medium">{event.toAccount?.name || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Affected Agents</div>
                  <div className="font-medium">
                    {event.affectedAgentsCount} / {event.totalActiveAgentsCount}
                  </div>
                </div>
                {event.approvalWindowStarted && event.status === 'PENDING_APPROVAL' && (
                  <div>
                    <div className="text-sm text-gray-400">Time Remaining</div>
                    <div className="font-medium text-yellow-500">
                      {getRemainingTime(event.approvalWindowStarted)}
                    </div>
                  </div>
                )}
              </div>

              {event.testResultsDuringWindow && Array.isArray(event.testResultsDuringWindow) && event.testResultsDuringWindow.length > 0 && (
                <div>
                  <div className="text-sm text-gray-400 mb-2">Test Results During Approval Window</div>
                  <div className="space-y-1">
                    {event.testResultsDuringWindow.slice(-5).map((result: any, idx: number) => (
                      <div key={idx} className="text-xs bg-gray-800 p-2 rounded">
                        {new Date(result.timestamp).toLocaleTimeString()}: {result.accountHealth} - 
                        Failure Rate: {(result.failureRate * 100).toFixed(1)}% - 
                        Failed: {result.failedAgents}, Degraded: {result.degradedAgents}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {event.notes && (
                <div>
                  <div className="text-sm text-gray-400">Notes</div>
                  <div className="text-sm">{event.notes}</div>
                </div>
              )}

              {event.errorMessage && (
                <div className="text-sm text-red-400">
                  Error: {event.errorMessage}
                </div>
              )}

              <div className="flex gap-2">
                {event.status === 'PENDING_APPROVAL' && (
                  <Button
                    onClick={() => approveFailover(event.id)}
                    disabled={processing === event.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing === event.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Approve Failover'
                    )}
                  </Button>
                )}
                {event.status === 'COMPLETED' && !event.rollbackAt && (
                  <Button
                    onClick={() => rollbackFailover(event.id)}
                    disabled={processing === event.id}
                    variant="outline"
                    className="border-orange-600 text-orange-600 hover:bg-orange-600/10"
                  >
                    {processing === event.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Rollback
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
