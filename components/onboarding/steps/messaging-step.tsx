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
          <h2 className="text-3xl font-bold mb-4">
            <span className="text-gray-700">Connect Your </span>
            <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">Email & Calendar</span>
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
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
        <h2 className="text-3xl font-bold mb-4">
          <span className="text-gray-700">Connect Your </span>
          <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">Email & Calendar</span>
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Connect Gmail and Google Calendar to unlock the full power of your CRM.
          Send emails, schedule appointments, and sync your communications seamlessly.
        </p>
      </div>

      {/* Features Overview */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-pink-500/20">
                <Mail className="h-6 w-6 text-pink-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Gmail Integration</h3>
              <p className="text-sm text-gray-600">
                Send & receive emails directly from the CRM
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Calendar Sync</h3>
              <p className="text-sm text-gray-600">
                Sync appointments with Google Calendar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <MessageSquare className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="font-semibold text-gray-900">Unified Inbox</h3>
              <p className="text-sm text-gray-600">
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
        <Card className="border border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calendar className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <CardTitle className="text-lg text-gray-900">Google Calendar Connected</CardTitle>
                  <CardDescription className="text-sm text-gray-600">
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
      <div className="border border-purple-200 rounded-xl p-6 bg-purple-50/50">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          What You'll Get
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
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
          className="border-purple-200 text-gray-700 hover:bg-purple-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-600 hover:text-gray-900 hover:bg-purple-50"
          >
            Skip for now
          </Button>
          <Button
            onClick={onNext}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-center text-gray-600">
        🔒 Your credentials are encrypted and never stored on our servers.
        You can disconnect anytime from Settings.
      </p>
    </div>
  );
}
