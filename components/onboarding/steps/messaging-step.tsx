'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GmailConnect } from '@/components/gmail/gmail-connect';
import { Mail, MessageSquare, Calendar, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface MessagingStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function MessagingStep({ onNext, onBack }: MessagingStepProps) {
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check connection statuses
    Promise.all([
      fetch('/api/gmail/status').then(res => res.json()),
      fetch('/api/calendar/status').then(res => res.json()),
    ])
      .then(([gmailData, calendarData]) => {
        setIsGmailConnected(gmailData.isConnected || false);
        setIsCalendarConnected(calendarData.isConnected || false);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleGmailSuccess = () => {
    setIsGmailConnected(true);
    toast.success('Gmail connected successfully!');
  };

  const handleSkip = () => {
    toast.info('You can connect Gmail anytime from Settings');
    onNext();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold gradient-text mb-4">
            Connect Your Email & Calendar
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Loading connection status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold gradient-text mb-4">
          Connect Your Email & Calendar
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Connect Gmail and Google Calendar to unlock the full power of your CRM.
          Send emails, schedule appointments, and sync your communications seamlessly.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20">
                <Mail className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="font-semibold text-white">Gmail Integration</h3>
              <p className="text-sm text-gray-400">
                Send & receive emails directly from the CRM
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                <Calendar className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Calendar Sync</h3>
              <p className="text-sm text-gray-400">
                Sync appointments with Google Calendar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-gradient-to-r from-green-500/20 to-teal-500/20">
                <MessageSquare className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Unified Inbox</h3>
              <p className="text-sm text-gray-400">
                All communications in one place
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gmail Connection */}
      <div>
        <GmailConnect 
          isConnected={isGmailConnected}
          onConnectionSuccess={handleGmailSuccess}
        />
      </div>

      {/* Calendar Status (if connected) */}
      {isCalendarConnected && (
        <Card className="bg-gradient-to-br from-blue-500/10 via-gray-900 to-purple-500/10 border-blue-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">Google Calendar Connected</CardTitle>
                  <CardDescription className="text-sm text-gray-400">
                    Your calendar is synced
                  </CardDescription>
                </div>
              </div>
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Benefits */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          What You'll Get
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Send emails with your Gmail signature and branding</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Track email opens and click-through rates</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Automatic conversation threading and history</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Schedule appointments directly in Google Calendar</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Works seamlessly with Google Workspace</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <span>Secure OAuth 2.0 • No password storage</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-gray-700 hover:bg-gray-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-400 hover:text-white"
          >
            Skip for now
          </Button>
          <Button
            onClick={onNext}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-center text-gray-500">
        🔒 Your credentials are encrypted and never stored on our servers.
        You can disconnect anytime from Settings.
      </p>
    </div>
  );
}
