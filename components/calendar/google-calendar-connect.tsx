'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Loader2, CheckCircle2, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GoogleCalendarConnectProps {
  isConnected?: boolean;
  onConnectionSuccess?: () => void;
}

export function GoogleCalendarConnect({ 
  isConnected = false, 
  onConnectionSuccess 
}: GoogleCalendarConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [redirectUri, setRedirectUri] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get OAuth URL
      const response = await fetch('/api/calendar/google-oauth');
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initialize OAuth');
      }

      const { url, redirectUri: uri } = await response.json();
      if (uri) setRedirectUri(uri);

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        url,
        'Google Calendar OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Please allow popups to connect your calendar');
        setIsConnecting(false);
        return;
      }

      // Poll for popup closure and check connection status
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setIsConnecting(false);
          
          // Check URL params for success
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('calendar_success') === 'true') {
            toast.success('Google Calendar connected successfully!');
            onConnectionSuccess?.();
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (urlParams.get('calendar_error')) {
            toast.error('Failed to connect calendar. Please try again.');
          }
        }
      }, 500);

      // Cleanup after 5 minutes
      setTimeout(() => {
        clearInterval(pollTimer);
        if (!popup.closed) {
          popup.close();
        }
        setIsConnecting(false);
      }, 300000);
    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      toast.error('Failed to connect calendar');
      setIsConnecting(false);
    }
  };

  if (isConnected) {
    return (
      <Card className="border-green-500/50 bg-green-500/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Calendar Connected</CardTitle>
              <CardDescription>Your calendar is synced and ready to use</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect Google Calendar</CardTitle>
            <CardDescription>
              Sync your appointments automatically with Google Calendar
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Connect with Google
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          ✓ Two-way sync: Appointments sync both ways
          <br />
          ✓ Automatic updates: Changes sync in real-time
          <br />
          ✓ Secure: Your data is encrypted and private
        </p>
        <Collapsible
          className="mt-4"
          onOpenChange={async (open) => {
            if (open && !redirectUri) {
              try {
                const res = await fetch('/api/calendar/google-oauth');
                const data = await res.json();
                if (data.redirectUri) setRedirectUri(data.redirectUri);
              } catch {
                /* ignore */
              }
            }
          }}
        >
          <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            Seeing &quot;redirect_uri_mismatch&quot;? Click for setup help
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <p className="text-xs text-muted-foreground mb-2">
              Add this exact URL to Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs:
            </p>
            <code className="block text-xs bg-muted px-2 py-1.5 rounded break-all">
              {redirectUri || 'Loading...'}
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              See <code className="bg-muted px-1 rounded">docs/GOOGLE_CALENDAR_OAUTH_SETUP.md</code> for full instructions.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
