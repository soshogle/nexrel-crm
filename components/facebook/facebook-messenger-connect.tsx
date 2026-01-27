'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Facebook, CheckCircle2, RefreshCw, Loader2, MessageSquare, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface FacebookPage {
  id: string;
  displayName: string;
  channelIdentifier: string;
  lastSyncedAt: Date | null;
}

export function FacebookMessengerConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/facebook/status');
      const data = await response.json();

      console.log('📊 Facebook status:', data);

      setIsConnected(data.isConnected);
      setPages(data.pages || []);
    } catch (error) {
      console.error('Error checking Facebook status:', error);
      toast.error('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
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
          if (popup && popup.closed) {
            clearInterval(pollTimer);
            // Check connection status after popup closes
            setTimeout(() => checkConnection(), 1000);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error connecting to Facebook:', error);
      toast.error('Failed to initiate Facebook connection');
    }
  };

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      toast.info('Starting message sync...');

      const response = await fetch('/api/facebook/sync', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Messages synced successfully!');
        await checkConnection(); // Refresh last synced times
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Failed to sync messages');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!isConnected) {
    return (
      <Card className="border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Facebook className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle>Facebook Messenger</CardTitle>
              <CardDescription>
                Connect your Facebook Pages to manage Messenger conversations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">What you'll get:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Receive and send Messenger messages</li>
              <li>• View all conversations in one place</li>
              <li>• Sync historical messages</li>
              <li>• Manage multiple Facebook Pages</li>
            </ul>
          </div>
          
          <Button onClick={handleConnect} className="w-full" size="lg">
            <Facebook className="mr-2 h-5 w-5" />
            Connect with Facebook
          </Button>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You'll need admin access to your Facebook Page to connect Messenger.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Facebook className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Facebook Messenger</CardTitle>
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              <CardDescription>
                {pages.length} {pages.length === 1 ? 'page' : 'pages'} connected
              </CardDescription>
            </div>
          </div>
          <Button onClick={handleSync} disabled={isSyncing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync Messages'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Connected Pages:</h4>
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">{page.displayName}</p>
                  <p className="text-xs text-muted-foreground">ID: {page.channelIdentifier}</p>
                </div>
              </div>
              {page.lastSyncedAt && (
                <div className="text-xs text-muted-foreground">
                  Last synced: {new Date(page.lastSyncedAt).toLocaleString()}
                </div>
              )}
            </div>
          ))}

          <div className="pt-4">
            <Button onClick={handleConnect} variant="outline" size="sm" className="w-full">
              <Facebook className="mr-2 h-4 w-4" />
              Add Another Page
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
