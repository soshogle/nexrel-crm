'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Instagram, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InstagramConnectProps {
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export function InstagramConnect({ onConnectionSuccess, onDisconnect }: InstagramConnectProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/soshogle/instagram/status');
      if (response.ok) {
        const data = await response.json();
        console.log('📸 Instagram status:', data);
        if (data.isConnected && data.connection) {
          setIsConnected(true);
          setUsername(data.connection.username || 'Instagram Account');
        }
      }
    } catch (error) {
      console.error('Error checking Instagram status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/soshogle/instagram/oauth');
      if (!response.ok) {
        throw new Error('Failed to get Instagram authorization URL');
      }

      const data = await response.json();
      if (data.authUrl) {
        // Open Instagram OAuth in popup
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
          data.authUrl,
          'Instagram OAuth',
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
              if (urlParams.get('instagram_success')) {
                toast.success(`Instagram connected: @${urlParams.get('username')}`);
                if (onConnectionSuccess) {
                  onConnectionSuccess();
                }
                // Clean up URL
                window.history.replaceState({}, '', window.location.pathname);
              } else if (urlParams.get('instagram_error')) {
                toast.error(`Failed to connect Instagram: ${urlParams.get('instagram_error')}`);
              }
            }, 1000);
          }
        }, 500);
      }
    } catch (error: any) {
      console.error('Instagram connection error:', error);
      toast.error(error.message || 'Failed to connect Instagram');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/soshogle/instagram/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Instagram');
      }

      setIsConnected(false);
      setUsername('');
      toast.success('Instagram account disconnected');
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error: any) {
      console.error('Error disconnecting Instagram:', error);
      toast.error(error.message || 'Failed to disconnect Instagram');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-pink-500/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-3">
                <Instagram className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Instagram Connected</CardTitle>
                <CardDescription>Manage Instagram Direct Messages</CardDescription>
              </div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-gradient-to-r from-purple-600/10 to-pink-600/10 p-4 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Connected Account</p>
                <p className="text-lg font-semibold text-white">@{username}</p>
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
                  'Disconnect Instagram'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Instagram?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove access to your Instagram Direct Messages. You can reconnect at any time.
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
          <div className="rounded-full bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-3">
            <Instagram className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">Connect Instagram</CardTitle>
            <CardDescription>Enable Instagram Direct Messages in Soshogle</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-gray-400">
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5" />
            Send and receive Instagram Direct Messages
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5" />
            Manage conversations from one dashboard
          </p>
          <p className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5" />
            Automated responses and campaigns
          </p>
        </div>

        <Button
          onClick={handleConnect}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          disabled={isConnecting}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="mr-2 h-4 w-4" />
              Connect Instagram
            </>
          )}
        </Button>

        <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
          <p className="text-xs text-blue-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            You'll need an Instagram Business or Creator account to connect.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
