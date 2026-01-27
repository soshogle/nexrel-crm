'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GoogleCalendarConnect } from '@/components/calendar/google-calendar-connect';
import { ArrowRight, ArrowLeft, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarStepProps {
  onNext: () => void;
  onBack: () => void;
}

export default function CalendarStep({ onNext, onBack }: CalendarStepProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkConnection = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.isConnected);
      }
    } catch (error) {
      console.error('Error checking calendar status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleConnectionSuccess = () => {
    setIsConnected(true);
    toast.success('Calendar connected successfully!');
  };

  const handleSkip = () => {
    toast.info('You can connect your calendar anytime from Settings');
    onNext();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-purple-500/20 rounded-full">
            <Calendar className="h-12 w-12 text-purple-500" />
          </div>
        </div>
        <h2 className="text-3xl font-bold gradient-text">Connect Your Calendar</h2>
        <p className="text-muted-foreground text-lg">
          Sync your appointments automatically with Google Calendar for seamless scheduling
        </p>
      </div>

      <div className="space-y-4">
        {!isChecking && (
          <GoogleCalendarConnect
            isConnected={isConnected}
            onConnectionSuccess={handleConnectionSuccess}
          />
        )}

        {isConnected && (
          <Card className="border-green-500/50 bg-green-500/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                <p className="font-medium">
                  Great! Your calendar is now connected and ready to sync
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What You Get</CardTitle>
            <CardDescription>Benefits of connecting your calendar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-1 bg-blue-500/20 rounded mt-1">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="font-medium">Two-Way Sync</p>
                <p className="text-sm text-muted-foreground">
                  Appointments created in your CRM appear in Google Calendar and vice versa
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-purple-500/20 rounded mt-1">
                <CheckCircle2 className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="font-medium">Real-Time Updates</p>
                <p className="text-sm text-muted-foreground">
                  Changes sync automatically, keeping both calendars up to date
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-1 bg-green-500/20 rounded mt-1">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Conflict Prevention</p>
                <p className="text-sm text-muted-foreground">
                  Avoid double-booking by seeing all your appointments in one place
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex gap-3">
          {!isConnected && (
            <Button variant="ghost" onClick={handleSkip} size="lg">
              Skip for now
            </Button>
          )}
          <Button onClick={onNext} size="lg">
            {isConnected ? 'Continue' : 'Skip & Continue'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
