'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, XCircle, Loader2, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface MetaConnectProps {
  onConnectionSuccess?: () => void;
  onDisconnect?: () => void;
}

export default function MetaConnect({ onConnectionSuccess, onDisconnect }: MetaConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [showCredentialsForm, setShowCredentialsForm] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [existingAppId, setExistingAppId] = useState('');
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setIsLoading(true);
      const [statusRes, credentialsRes] = await Promise.all([
        fetch('/api/meta/status'),
        fetch('/api/meta/credentials'),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        console.log('📊 Meta status:', statusData);
        setIsConnected(statusData.isConnected);
        setConnection(statusData.connection);
        setHasCredentials(statusData.hasCredentials);
      }

      if (credentialsRes.ok) {
        const credData = await credentialsRes.json();
        if (credData.hasCredentials) {
          setExistingAppId(credData.appId);
        }
      }
    } catch (error: any) {
      console.error('❌ Meta status check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!appId.trim() || !appSecret.trim()) {
      toast.error('Please enter both App ID and App Secret');
      return;
    }

    try {
      setIsSavingCredentials(true);
      const response = await fetch('/api/meta/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, appSecret }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save credentials');
      }

      const data = await response.json();
      toast.success(data.message);
      setHasCredentials(true);
      setExistingAppId(appId);
      setShowCredentialsForm(false);
      setAppId('');
      setAppSecret('');
    } catch (error: any) {
      console.error('❌ Save credentials failed:', error);
      toast.error(error.message || 'Failed to save credentials');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const handleConnect = async () => {
    if (!hasCredentials) {
      setShowCredentialsForm(true);
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch('/api/meta/oauth');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate OAuth');
      }

      const data = await response.json();
      const { url } = data;

      // Open OAuth popup
      const width = 600;
      const height = 700;
      const left = window.innerWidth / 2 - width / 2;
      const top = window.innerHeight / 2 - height / 2;

      const popup = window.open(
        url,
        'Meta OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setIsLoading(false);
          checkStatus();

          // Check URL for success
          const urlParams = new URLSearchParams(window.location.search);
          if (urlParams.get('success') === 'meta_connected') {
            toast.success('Meta account connected successfully!');
            onConnectionSuccess?.();
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (urlParams.get('error')) {
            toast.error(`Connection failed: ${urlParams.get('error')}`);
          }
        }
      }, 500);
    } catch (error: any) {
      console.error('❌ Meta connection failed:', error);
      toast.error(error.message || 'Failed to connect Meta account');
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/meta/disconnect', { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to disconnect');
      }

      toast.success('Meta account disconnected');
      setIsConnected(false);
      setConnection(null);
      setShowDisconnectDialog(false);
      onDisconnect?.();
    } catch (error: any) {
      console.error('❌ Disconnect failed:', error);
      toast.error(error.message || 'Failed to disconnect Meta account');
    }
  };

  // Credentials form
  if (showCredentialsForm && !hasCredentials) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-500" />
            Meta App Credentials
          </CardTitle>
          <CardDescription>
            Enter your Meta App ID and App Secret to enable Instagram, Facebook, and WhatsApp integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-500/10 border-blue-500/50">
            <AlertDescription className="text-sm">
              <strong>How to get your credentials:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Meta for Developers</a></li>
                <li>Create a new app or select an existing one</li>
                <li>Go to Settings → Basic</li>
                <li>Copy your App ID and App Secret</li>
                <li>Make sure to add permissions for Instagram, Facebook Pages, and WhatsApp Business</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="appId">App ID</Label>
            <Input
              id="appId"
              type="text"
              placeholder="Enter your Meta App ID"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appSecret">App Secret</Label>
            <Input
              id="appSecret"
              type="password"
              placeholder="Enter your Meta App Secret"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className="bg-gray-800 border-gray-700"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSaveCredentials}
              disabled={isSavingCredentials}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isSavingCredentials ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Credentials'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCredentialsForm(false)}
              className="border-gray-700"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading && !isConnected) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </CardContent>
      </Card>
    );
  }

  // Connected state
  if (isConnected && connection) {
    const metadata = connection.metadata || {};
    return (
      <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Meta Connected
          </CardTitle>
          <CardDescription>Your Meta account is connected and active</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Account:</span>
              <Badge className="bg-blue-500 text-white">{connection.displayName}</Badge>
            </div>

            {metadata.facebookPageName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Facebook className="h-3 w-3" />
                  Facebook Page:
                </span>
                <span className="text-sm font-medium">{metadata.facebookPageName}</span>
              </div>
            )}

            {metadata.instagramAccountId && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Instagram className="h-3 w-3" />
                  Instagram:
                </span>
                <Badge variant="outline" className="border-pink-500 text-pink-400">
                  Connected
                </Badge>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Status:</span>
              <Badge className="bg-green-500 text-white">Active</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(true)}
              className="flex-1 border-red-500 text-red-400 hover:bg-red-500/10"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>

          <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
            <AlertDialogContent className="bg-gray-900 border-gray-800">
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect Meta Account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your Instagram, Facebook, and WhatsApp connections. You can reconnect anytime.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect} className="bg-red-600 hover:bg-red-700">
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    );
  }

  // Not connected state
  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex gap-1">
            <Facebook className="h-5 w-5 text-blue-500" />
            <Instagram className="h-5 w-5 text-pink-500" />
            <MessageCircle className="h-5 w-5 text-green-500" />
          </div>
          Connect Meta Platforms
        </CardTitle>
        <CardDescription>
          Connect Instagram, Facebook Pages, and WhatsApp Business all at once
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasCredentials && existingAppId && (
          <Alert className="bg-green-500/10 border-green-500/50">
            <AlertDescription className="text-sm">
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
              Credentials configured (App ID: {existingAppId})
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2 text-sm text-gray-400">
          <p className="font-medium text-white">What you'll get:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Instagram Direct Messages</li>
            <li>Facebook Page messages and comments</li>
            <li>WhatsApp Business messaging</li>
            <li>Unified inbox for all platforms</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : hasCredentials ? (
              'Connect with Meta'
            ) : (
              'Setup Credentials'
            )}
          </Button>
          {hasCredentials && (
            <Button
              variant="outline"
              onClick={() => setShowCredentialsForm(true)}
              className="border-gray-700"
            >
              Update Credentials
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
