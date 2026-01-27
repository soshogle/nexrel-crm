'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2, Facebook, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FacebookConnectProps {
  isConnected?: boolean;
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export default function FacebookConnect({ 
  isConnected: initialConnected = false,
  onConnectionSuccess,
  onDisconnect 
}: FacebookConnectProps) {
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [pageName, setPageName] = useState<string>('');

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      console.log('🔍 Checking Facebook connection status...');
      const response = await fetch('/api/facebook/status');
      const data = await response.json();
      console.log('📊 Facebook status API response:', data);
      
      setIsConnected(data.isConnected);
      if (data.isConnected && data.pageName) {
        console.log('✅ Setting page name:', data.pageName);
        setPageName(data.pageName);
      }
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get OAuth URL
      const response = await fetch('/api/facebook/oauth');
      const data = await response.json();

      if (data.authUrl) {
        // Open OAuth popup
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
        const pollTimer = setInterval(() => {
          if (popup?.closed) {
            clearInterval(pollTimer);
            setIsConnecting(false);

            // Check if connection was successful
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('facebook_success') === 'true') {
              toast.success('Facebook Messenger connected successfully!');
              checkConnectionStatus();
              if (onConnectionSuccess) onConnectionSuccess();

              // Clean up URL params
              window.history.replaceState({}, '', window.location.pathname);
            } else if (urlParams.get('facebook_error')) {
              toast.error(`Failed to connect Facebook: ${urlParams.get('facebook_error')}`);
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error connecting Facebook:', error);
      toast.error('Failed to initiate Facebook connection');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/facebook/disconnect', {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Facebook Messenger disconnected successfully');
        setIsConnected(false);
        setPageName('');
        if (onDisconnect) onDisconnect();
      } else {
        throw new Error('Failed to disconnect Facebook');
      }
    } catch (error) {
      console.error('Error disconnecting Facebook:', error);
      toast.error('Failed to disconnect Facebook Messenger');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-500" />
            Facebook Messenger
          </CardTitle>
          <CardDescription>Loading connection status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-500" />
              Facebook Messenger
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage your Facebook Messenger integration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pageName && (
            <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Connected Page</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-500">
                  {pageName}
                </Badge>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-gray-400">
              Your Facebook page is connected and ready to receive and send messages.
            </p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
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
                    Disconnect Facebook
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-gray-900 border-gray-800">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Disconnect Facebook Messenger?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This will disconnect your Facebook page. You won't be able to send or receive messages through Facebook Messenger until you reconnect.
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
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Facebook className="h-5 w-5 text-blue-500" />
          Facebook Messenger
        </CardTitle>
        <CardDescription>
          Connect your Facebook page to send and receive messages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-400">
            Connect your Facebook page to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
            <li>Send and receive Facebook Messenger messages</li>
            <li>Manage customer conversations from one place</li>
            <li>Track message history and engagement</li>
            <li>Automate responses with AI</li>
          </ul>
        </div>

        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Facebook className="mr-2 h-4 w-4" />
              Connect with Facebook
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
