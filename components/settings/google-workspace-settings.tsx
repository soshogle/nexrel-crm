'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GmailConnect } from '@/components/gmail/gmail-connect';
import { GoogleCalendarConnect } from '@/components/calendar/google-calendar-connect';
import { Mail, Calendar, AlertCircle, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function GoogleWorkspaceSettings() {
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const [gmailRes, calendarRes] = await Promise.all([
        fetch('/api/gmail/status'),
        fetch('/api/calendar/status'),
      ]);

      if (gmailRes.ok) {
        const gmailData = await gmailRes.json();
        setIsGmailConnected(gmailData.isConnected || false);
      }

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json();
        setIsCalendarConnected(calendarData.isConnected || false);
      }
    } catch (error) {
      console.error('Failed to check Google Workspace connections:', error);
      toast.error('Failed to load connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleGmailSuccess = () => {
    setIsGmailConnected(true);
    checkConnections();
  };

  const handleGmailDisconnect = () => {
    setIsGmailConnected(false);
    checkConnections();
  };

  const handleCalendarSuccess = () => {
    setIsCalendarConnected(true);
    checkConnections();
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a recipient email address');
      return;
    }

    if (!isGmailConnected) {
      toast.error('Please connect Gmail first');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingTest(true);
    try {
      console.log('🧪 Sending test email to:', testEmail);
      const response = await fetch('/api/gmail/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(
          <div>
            <strong>✅ Test email sent successfully!</strong>
            <p className="text-sm mt-1">Check {testEmail} inbox for the test message</p>
          </div>,
          { duration: 5000 }
        );
        console.log('✅ Test email sent:', data);
      } else {
        console.error('❌ Test email failed:', data);
        toast.error(
          <div>
            <strong>❌ Test email failed</strong>
            <p className="text-sm mt-1">{data.error || 'Check server logs for details'}</p>
          </div>,
          { duration: 5000 }
        );
      }
    } catch (error: any) {
      console.error('❌ Test email error:', error);
      toast.error('Failed to send test email: ' + error.message);
    } finally {
      setIsSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Google Workspace Integration</h3>
          <p className="text-sm text-muted-foreground">
            Loading connection status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Google Workspace Integration</h3>
        <p className="text-sm text-muted-foreground">
          Connect Gmail and Google Calendar to centralize your communications and scheduling.
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">
                Works with Google Workspace and Personal Gmail
              </p>
              <p className="text-sm text-gray-400">
                Secure OAuth 2.0 authentication ensures your credentials are never stored on our servers.
                You can disconnect at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gmail Connection */}
      <div>
        <h4 className="text-md font-medium mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-red-400" />
          Gmail
        </h4>
        <GmailConnect 
          isConnected={isGmailConnected}
          onConnectionSuccess={handleGmailSuccess}
          onDisconnect={handleGmailDisconnect}
        />
      </div>

      {/* Test Email Section */}
      {isGmailConnected && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4 text-green-400" />
              Test Gmail OAuth
            </CardTitle>
            <CardDescription>
              Send a test email to verify that your Gmail OAuth connection is working properly
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Recipient Email</Label>
              <div className="flex gap-2">
                <Input
                  id="test-email"
                  type="email"
                  placeholder="Enter email address to test"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={isSendingTest}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest || !testEmail}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {isSendingTest ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Test
                    </>
                  )}
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <span>
                  This will send a test email via your connected Gmail account using OAuth. 
                  Check the recipient's inbox to confirm delivery.
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Google Calendar Connection */}
      <div>
        <h4 className="text-md font-medium mb-4 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-400" />
          Google Calendar
        </h4>
        <GoogleCalendarConnect 
          isConnected={isCalendarConnected}
          onConnectionSuccess={handleCalendarSuccess}
        />
      </div>
    </div>
  );
}
