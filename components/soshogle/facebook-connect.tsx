'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Facebook, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FacebookConnectProps {
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export function FacebookConnect({ onConnectionSuccess, onDisconnect }: FacebookConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pageName, setPageName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/soshogle/facebook/status');
      if (response.ok) {
        const data = await response.json();
        console.log('📘 Facebook status:', data);
        if (data.isConnected && data.connection) {
          setIsConnected(true);
          setPageName(data.connection.pageName || 'Facebook Page');
        }
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/soshogle/facebook/oauth');
      if (!response.ok) {
        throw new Error('Failed to get Facebook authorization URL');
      }

      const data = await response.json();
      if (data.authUrl) {
        // Open Facebook OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.authUrl,
          'Facebook OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );

        // Poll for popup closure
        const pollTimer = window.setInterval(() => {
          if (popup && popup.closed !== false) {
            window.clearInterval(pollTimer);
            setIsConnecting(false);
            // Check if connection was successful
            setTimeout(() => {
              checkConnectionStatus();
              // Check URL params for success message
              const urlParams = new URLSearchParams(window.location.search);
              if (urlParams.get('facebook_success')) {
                toast.success(`Facebook connected: ${urlParams.get('page')}`);
                if (onConnectionSuccess) {
                  onConnectionSuccess();
                }
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
              } else if (urlParams.get('facebook_error')) {
                toast.error(`Failed to connect Facebook: ${urlParams.get('facebook_error')}`);
              }
            }, 1000);
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Facebook connection error:', error);
      toast.error(error.message || 'Failed to connect Facebook');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/soshogle/facebook/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Facebook');
      }

      setIsConnected(false);
      setPageName('');
      toast.success('Facebook Messenger disconnected');
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error: any) {
      console.error('Error disconnecting Facebook:', error);
      toast.error(error.message || 'Failed to disconnect Facebook');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-blue-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-600 p-3">
                <Facebook className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Facebook Messenger Connected</CardTitle>
                <CardDescription>Manage Messenger conversations</CardDescription>
              </div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-blue-600/10 to-blue-400/10 p-4 border border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Connected Page</p>
                <p className="text-lg font-semibold text-white">{pageName}</p>
              </div>
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full"
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect Facebook'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Facebook Messenger?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove access to your Facebook Messenger conversations. You can reconnect at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-600 p-3">
            <Facebook className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect Facebook Messenger</CardTitle>
            <CardDescription>Enable Messenger conversations in Soshogle</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-gray-400">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
            Send and receive Facebook Messenger messages
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
            Centralized conversation management
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
            Automated responses and campaigns
          </p>
        </div>

        <Button
          onClick={handleConnect}
          className="w-full bg-blue-600 hover:bg-blue-700"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Facebook className="mr-2 h-4 w-4" />
              Connect Facebook
            </>
          )}
        </Button>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
          <p className="text-xs text-blue-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            You'll need a Facebook Page to connect Messenger.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
