'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, Loader2, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GmailConnectProps {
  isConnected: boolean;
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export function GmailConnect({ isConnected: initialIsConnected, onConnectionSuccess, onDisconnect }: GmailConnectProps) {
  const [isConnected, setIsConnected] = useState(initialIsConnected);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [emailAddress, setEmailAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsConnected(initialIsConnected);
  }, [initialIsConnected]);

  useEffect(() => {
    // Check for success/error params in URL
    const params = new URLSearchParams(window.location.search);
    const gmailSuccess = params.get('gmail_success');
    const gmailError = params.get('gmail_error');

    if (gmailSuccess === 'true') {
      toast.success('Gmail connected successfully!');
      setIsConnected(true);
      fetchConnectionDetails();
      onConnectionSuccess?.();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gmailError) {
      toast.error(`Gmail connection failed: ${gmailError}`);
      setIsConnecting(false);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onConnectionSuccess]);

  const fetchConnectionDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/gmail/status');
      if (!response.ok) {
        throw new Error('Failed to fetch Gmail status');
      }

      const data = await response.json();
      console.log('📧 Gmail status API response:', data);
      
      if (data.isConnected && data.connection) {
        const email = data.connection.emailAddress || data.connection.displayName || data.connection.channelIdentifier || 'Gmail Account';
        console.log('✅ Setting email address:', email);
        console.log('📊 Connection data:', {
          emailAddress: data.connection.emailAddress,
          displayName: data.connection.displayName,
          channelIdentifier: data.connection.channelIdentifier,
        });
        setIsConnected(true);
        setEmailAddress(email);
      } else {
        console.log('❌ Gmail not connected or no connection data');
        setIsConnected(false);
        setEmailAddress(null);
      }
    } catch (error) {
      console.error('Error fetching Gmail connection details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch connection details on mount
    fetchConnectionDetails();
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      // Get OAuth URL
      const response = await fetch('/api/gmail/oauth');
      if (!response.ok) {
        throw new Error('Failed to get OAuth URL');
      }

      const { authUrl } = await response.json();
      
      // Open OAuth in popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;
      
      const popup = window.open(
        authUrl,
        'Gmail OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        toast.error('Please allow popups for this site');
        setIsConnecting(false);
        return;
      }

      // Poll for popup closure
      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          setIsConnecting(false);
          
          // Check if connection was successful by looking at URL params
          const params = new URLSearchParams(window.location.search);
          if (params.get('gmail_success') === 'true') {
            setIsConnected(true);
            fetchConnectionDetails();
            onConnectionSuccess?.();
          }
        }
      }, 500);

    } catch (error) {
      console.error('Error connecting Gmail:', error);
      toast.error('Failed to connect Gmail');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      
      const response = await fetch('/api/gmail/disconnect', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to disconnect Gmail');
      }

      toast.success('Gmail disconnected successfully');
      setIsConnected(false);
      setEmailAddress(null);
      onDisconnect?.();
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      toast.error(error.message || 'Failed to disconnect Gmail');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border border-purple-200 bg-purple-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-500/20">
                <Mail className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-lg text-gray-900">Gmail Connected</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  Gmail Account
                </CardDescription>
              </div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Your Gmail account is connected and ready to send/receive emails.
            </p>
            
            {/* Connected Email Address */}
            <div className="flex items-center gap-2 px-4 py-3 bg-pink-50 rounded-lg border border-purple-200">
              <div className="p-1.5 rounded bg-pink-500/20">
                <Mail className="h-4 w-4 text-pink-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-0.5">Connected Email</p>
                <p className="text-sm font-semibold text-gray-900">
                  {emailAddress || 'Loading email...'}
                </p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={isDisconnecting}
                className="w-full border-purple-200 text-gray-700 hover:bg-purple-50 hover:border-purple-300"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Disconnect Gmail
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white border-purple-200">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-gray-900">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Disconnect Gmail?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  Are you sure you want to disconnect your Gmail account? You will no longer be able to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Send emails from your Gmail account</li>
                    <li>Read and manage your inbox</li>
                    <li>Sync contacts and conversations</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    You can reconnect anytime by clicking the "Connect with Gmail" button.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-purple-200 text-gray-700 hover:bg-purple-50">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDisconnect}
                  className="bg-red-600 hover:bg-red-700 text-white"
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
    <Card className="border border-purple-200/50 bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-500/20">
            <Mail className="h-6 w-6 text-pink-500" />
          </div>
          <div>
            <CardTitle className="text-lg text-gray-900">Connect Gmail</CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Connect your Gmail account to send and receive emails
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Send emails directly from your Gmail account
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Read and manage your inbox
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Sync contacts and conversations
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Works with Google Workspace
          </p>
        </div>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="lg"
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Connect with Gmail
            </>
          )}
        </Button>
        <p className="text-xs text-gray-600 text-center">
          Secure OAuth 2.0 authentication • No password storage
        </p>
      </CardContent>
    </Card>
  );
}
