'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Instagram, CheckCircle2, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InstagramConnectProps {
  isConnected?: boolean;
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export default function InstagramConnect({
  isConnected: initialConnected = false,
  onConnectionSuccess,
  onDisconnect,
}: InstagramConnectProps) {
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/instagram/status');
      const data = await response.json();

      console.log('📧 Instagram status API response:', data);

      if (data.isConnected) {
        setIsConnected(true);
        setConnectionDetails(data);
        console.log('✅ Instagram account connected:', data.displayName);
      } else {
        setIsConnected(false);
        setConnectionDetails(null);
      }
    } catch (error) {
      console.error('Error checking Instagram status:', error);
      toast.error('Failed to check Instagram connection status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      toast.info('Redirecting to Instagram...');

      // Get OAuth URL from backend
      const response = await fetch('/api/instagram/oauth');
      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        setIsConnecting(false);
        return;
      }

      // Open Instagram OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        data.authUrl,
        'instagram-connect',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure
      const checkPopup = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(checkPopup);
          setIsConnecting(false);

          // Check if connection was successful
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('instagram_success') === 'true') {
            setIsConnected(true);
            toast.success('Instagram connected successfully!');
            checkConnectionStatus(); // Refresh connection details
            if (onConnectionSuccess) {
              onConnectionSuccess();
            }
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } else if (urlParams.get('instagram_error')) {
            const error = urlParams.get('instagram_error');
            toast.error(`Instagram connection failed: ${error}`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }, 500);
    } catch (error: any) {
      console.error('Instagram connection error:', error);
      toast.error(error.message || 'Failed to connect Instagram');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      const response = await fetch('/api/instagram/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect Instagram');
      }

      setIsConnected(false);
      setConnectionDetails(null);
      toast.success('Instagram disconnected successfully');
      if (onDisconnect) {
        onDisconnect();
      }
    } catch (error: any) {
      console.error('Error disconnecting Instagram:', error);
      toast.error(error.message || 'Failed to disconnect Instagram');
    } finally {
      setIsDisconnecting(false);
      setShowDisconnectDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (isConnected && connectionDetails) {
    return (
      <div className="space-y-4">
        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-purple-600" />
              Instagram Connected
            </CardTitle>
            <CardDescription>
              Your Instagram account is linked and ready for messaging
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-200">Connected Account</p>
                  <p className="text-lg font-semibold text-white">
                    {connectionDetails.displayName || 'Instagram Account'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                Active
              </Badge>
            </div>

            {connectionDetails.tokenExpiresAt && (
              <div className="text-xs text-gray-400">
                Token expires: {new Date(connectionDetails.tokenExpiresAt).toLocaleDateString()}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Disconnect Instagram
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Disconnect Instagram?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will remove Instagram messaging from your CRM. You can always reconnect later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-red-600 hover:bg-red-700"
              >
                Disconnect
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <Card className="border-purple-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Instagram className="h-5 w-5 text-purple-600" />
          Connect Instagram
        </CardTitle>
        <CardDescription>
          Link your Instagram account to send and receive direct messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-gray-400">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
            Send and receive Instagram DMs
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
            Manage all conversations in one place
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-purple-500" />
            Auto-create leads from Instagram messages
          </p>
        </div>

        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Instagram className="mr-2 h-4 w-4" />
              Connect with Instagram
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}