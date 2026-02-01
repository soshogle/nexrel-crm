'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationStats {
  pendingCount: number;
  totalCompleted: number;
  emailsSent: number;
}

interface NotificationResults {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export default function NotificationsPage() {
  const { data: session, status } = useSession() || {};
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lastResults, setLastResults] = useState<NotificationResults | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/calls/send-notifications');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      toast.error('Failed to load notification stats');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  const handleSendNotifications = async (sendAll: boolean = false) => {
    try {
      setSending(true);
      setLastResults(null);

      const response = await fetch('/api/calls/send-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendAll })
      });

      if (!response.ok) throw new Error('Failed to send notifications');

      const data = await response.json();
      setLastResults(data.results);

      if (data.results.success > 0) {
        toast.success(`Successfully sent ${data.results.success} email notification(s)`);
      }

      if (data.results.failed > 0) {
        toast.error(`Failed to send ${data.results.failed} notification(s)`);
      }

      if (data.results.skipped > 0) {
        toast.info(`Skipped ${data.results.skipped} notification(s)`);
      }

      // Refresh stats
      await fetchStats();
    } catch (error: any) {
      toast.error('Failed to send notifications');
      console.error(error);
    } finally {
      setSending(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please sign in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Manage email notifications for completed calls
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
        >
          <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Notifications</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed calls awaiting email
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.emailsSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Out of {stats?.totalCompleted || 0} completed calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats && stats.totalCompleted > 0
                ? Math.round((stats.emailsSent / stats.totalCompleted) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Percentage of calls with emails sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Send Email Notifications</CardTitle>
          <CardDescription>
            Manually trigger email notifications for completed calls that haven't been sent yet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => handleSendNotifications(false)}
              disabled={sending || (stats?.pendingCount || 0) === 0}
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Pending ({stats?.pendingCount || 0})
                </>
              )}
            </Button>

            <Button
              onClick={() => handleSendNotifications(true)}
              disabled={sending || (stats?.totalCompleted || 0) === 0}
              variant="outline"
              className="flex-1"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RefreshCcw className="w-4 h-4 mr-2" />
                  Resend All
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>Send Pending:</strong> Sends emails only for calls that haven't received notifications yet</p>
            <p>• <strong>Resend All:</strong> Sends emails for all completed calls, including those already sent (useful for testing)</p>
          </div>
        </CardContent>
      </Card>

      {/* Last Results Card */}
      {lastResults && (
        <Card>
          <CardHeader>
            <CardTitle>Last Send Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Successful</span>
                </div>
                <Badge variant="outline" className="bg-green-50">
                  {lastResults.success}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Failed</span>
                </div>
                <Badge variant="outline" className="bg-red-50">
                  {lastResults.failed}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Skipped</span>
                </div>
                <Badge variant="outline" className="bg-yellow-50">
                  {lastResults.skipped}
                </Badge>
              </div>

              {lastResults.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2 text-red-600">Errors:</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {lastResults.errors.map((error, index) => (
                      <div key={index} className="bg-red-50 p-2 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This system sends email notifications for completed calls based on existing call data stored in the database.
          </p>
          <p>
            Emails are sent automatically by the Twilio webhook when calls complete. However, if the webhook fails or 
            is skipped, you can use this page to manually send notifications.
          </p>
          <p>
            <strong>Requirements for sending:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Call must be completed</li>
            <li>Voice agent must have "Send Recording Email" enabled</li>
            <li>Recording email address must be configured</li>
            <li>Call must have transcript or conversation data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
