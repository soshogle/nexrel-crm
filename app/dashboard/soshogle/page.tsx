'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Instagram, 
  Facebook, 
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  Link2,
  Settings,
  ExternalLink,
  Webhook
} from 'lucide-react';
import WebhookTestPanel from '@/components/instagram/webhook-test-panel';

interface ChannelConnection {
  id: string;
  channelType: string;
  providerType: string;
  displayName: string | null;
  channelIdentifier: string | null;
  status: string;
  isActive: boolean;
  metadata: any;
  createdAt: string;
  lastSyncedAt: string | null;
}

interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
}

export default function SoshoglePage() {
  const { data: session } = useSession() || {};
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectingChannel, setConnectingChannel] = useState<string | null>(null);

  // Check if user is super admin
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    fetchConnections();
    fetchStats();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/soshogle/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/soshogle/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleConnect = async (provider: 'INSTAGRAM' | 'FACEBOOK' | 'WHATSAPP') => {
    setConnectingChannel(provider);
    try {
      // Use specific Instagram endpoint
      const endpoint = provider === 'INSTAGRAM' 
        ? '/api/instagram/oauth' 
        : `/api/soshogle/oauth/${provider.toLowerCase()}`;
      
      // Initiate OAuth flow
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }));
        
        // Check if it's a configuration error
        if (response.status === 500 && data.error?.includes('not configured')) {
          toast.error(
            `${provider} OAuth is not configured yet. Please add your ${provider} App credentials to the environment variables.`,
            { duration: 6000 }
          );
        } else {
          toast.error(data.error || `Failed to connect ${provider}`);
        }
        setConnectingChannel(null);
        return;
      }

      const data = await response.json();
      
      // Open OAuth URL in popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      const popup = window.open(
        data.authUrl,
        `${provider} OAuth`,
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Poll for popup closure
      const checkPopup = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkPopup);
          setConnectingChannel(null);
          // Check if connection was successful
          const urlParams = new URLSearchParams(window.location.search);
          
          // Check for Instagram success (different param)
          const instagramSuccess = provider === 'INSTAGRAM' && urlParams.get('instagram_success') === 'true';
          const soshoglSuccess = urlParams.get('soshogle_connected') === 'success';
          
          if (instagramSuccess || soshoglSuccess) {
            toast.success(`${provider} connected successfully!`);
            fetchConnections();
            fetchStats();
            // Clean up URL
            window.history.replaceState({}, '', window.location.pathname);
          } else if (urlParams.get('soshogle_connected') === 'error' || urlParams.get('instagram_error')) {
            const error = urlParams.get('error') || urlParams.get('instagram_error') || 'Connection failed';
            toast.error(error);
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
      }, 500);
    } catch (error: any) {
      console.error(`Error connecting ${provider}:`, error);
      toast.error(`Failed to connect ${provider}: ${error.message}`);
      setConnectingChannel(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/soshogle/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Connection removed successfully');
        fetchConnections();
        fetchStats();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Failed to disconnect channel');
    }
  };

  const handleRefresh = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/soshogle/connections/${connectionId}/refresh`, {
        method: 'POST',
      });

      if (response.ok) {
        toast.success('Connection refreshed successfully');
        fetchConnections();
      } else {
        throw new Error('Failed to refresh');
      }
    } catch (error) {
      console.error('Error refreshing connection:', error);
      toast.error('Failed to refresh connection');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toUpperCase()) {
      case 'INSTAGRAM':
        return <Instagram className="h-5 w-5" />;
      case 'FACEBOOK':
        return <Facebook className="h-5 w-5" />;
      case 'WHATSAPP':
        return <MessageCircle className="h-5 w-5" />;
      default:
        return <MessageSquare className="h-5 w-5" />;
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toUpperCase()) {
      case 'INSTAGRAM':
        return 'from-purple-600 to-pink-600';
      case 'FACEBOOK':
        return 'from-blue-600 to-blue-700';
      case 'WHATSAPP':
        return 'from-green-600 to-green-700';
      default:
        return 'from-gray-600 to-gray-700';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold gradient-text mb-2">
          Soshogle Multi-Channel
        </h1>
        <p className="text-gray-400">
          Connect and manage your social media messaging channels in one place
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Total Connections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">
                {stats.totalConnections}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Active Channels
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {stats.activeConnections}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Messages Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-500">
                {stats.messagesReceived}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400">
                Messages Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">
                {stats.messagesSent}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="connections" className="space-y-4">
        <TabsList className="bg-gray-900">
          <TabsTrigger value="connections">
            <Link2 className="h-4 w-4 mr-2" />
            Connections
          </TabsTrigger>
          {isSuperAdmin && (
            <>
              <TabsTrigger value="webhook">
                <Webhook className="h-4 w-4 mr-2" />
                Webhook Test
              </TabsTrigger>
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="connections" className="space-y-4">
          {/* Connect Social Media Channels */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-purple-500" />
                Connect Social Media
              </CardTitle>
              <CardDescription>
                Click on a platform below to connect your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Instagram */}
                <Card className="border-2 border-gray-700 bg-gray-800/50 hover:border-purple-500/50 transition-all cursor-pointer"
                  onClick={() => !connectingChannel && handleConnect('INSTAGRAM')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600">
                        <Instagram className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-white">Instagram</h3>
                        <p className="text-xs text-gray-400 mt-1">Direct Messages</p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect('INSTAGRAM');
                        }}
                        disabled={connectingChannel === 'INSTAGRAM'}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      >
                        {connectingChannel === 'INSTAGRAM' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect Instagram'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Facebook */}
                <Card className="border-2 border-gray-700 bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer"
                  onClick={() => !connectingChannel && handleConnect('FACEBOOK')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-blue-600">
                        <Facebook className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-white">Facebook</h3>
                        <p className="text-xs text-gray-400 mt-1">Messenger</p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect('FACEBOOK');
                        }}
                        disabled={connectingChannel === 'FACEBOOK'}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        {connectingChannel === 'FACEBOOK' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect Facebook'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* WhatsApp */}
                <Card className="border-2 border-gray-700 bg-gray-800/50 hover:border-green-500/50 transition-all cursor-pointer"
                  onClick={() => !connectingChannel && handleConnect('WHATSAPP')}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 rounded-full bg-green-600">
                        <MessageCircle className="h-8 w-8 text-white" />
                      </div>
                      <div className="text-center">
                        <h3 className="font-semibold text-white">WhatsApp</h3>
                        <p className="text-xs text-gray-400 mt-1">Business API</p>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect('WHATSAPP');
                        }}
                        disabled={connectingChannel === 'WHATSAPP'}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {connectingChannel === 'WHATSAPP' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connect WhatsApp'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {/* Active Connections */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>
                Manage your connected social media channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connections.length === 0 ? (
                <Alert className="bg-gray-800 border-gray-700">
                  <AlertDescription className="text-gray-300">
                    No channels connected yet. Connect Instagram, Facebook, or WhatsApp above to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {connections.map((connection) => (
                    <div
                      key={connection.id}
                      className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg hover:border-purple-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg bg-gradient-to-r ${getProviderColor(connection.providerType)}`}>
                          {getProviderIcon(connection.providerType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">
                              {connection.displayName || connection.providerType}
                            </h3>
                            {connection.status === 'CONNECTED' && connection.isActive ? (
                              <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {connection.channelIdentifier || 'No identifier'}
                          </p>
                          {connection.lastSyncedAt && (
                            <p className="text-xs text-gray-500">
                              Last synced: {new Date(connection.lastSyncedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefresh(connection.id)}
                          className="border-gray-700 hover:border-purple-500"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(connection.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isSuperAdmin && (
          <>
            <TabsContent value="webhook" className="space-y-4">
              <WebhookTestPanel 
                verifyToken={process.env.NEXT_PUBLIC_INSTAGRAM_VERIFY_TOKEN}
              />
              
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Instagram Webhook Setup Guide</CardTitle>
                  <CardDescription>
                    Follow these steps to configure your Instagram webhook
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Open Meta Developer Console</h4>
                        <p className="text-sm text-gray-400">
                          Go to{' '}
                          <a
                            href="https://developers.facebook.com/apps/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:underline"
                          >
                            developers.facebook.com/apps
                            <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>{' '}
                          and select your Instagram app.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Navigate to Webhooks</h4>
                        <p className="text-sm text-gray-400">
                          In your app dashboard, go to <strong>Products</strong> → <strong>Instagram</strong> → <strong>Webhooks</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Add Webhook URL</h4>
                        <p className="text-sm text-gray-400 mb-2">
                          Click <strong>Edit Subscription</strong> and enter:
                        </p>
                        <div className="bg-gray-800 p-3 rounded-lg space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Callback URL:</p>
                            <code className="text-xs text-purple-400">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/api/instagram/webhook
                            </code>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Verify Token:</p>
                            <code className="text-xs text-purple-400">
                              {process.env.NEXT_PUBLIC_INSTAGRAM_VERIFY_TOKEN || 'Check your .env file'}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        4
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Subscribe to Events</h4>
                        <p className="text-sm text-gray-400">
                          Select the following webhook fields:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-gray-400 list-disc list-inside">
                          <li><code>messages</code> - To receive direct messages</li>
                          <li><code>messaging_postbacks</code> - For button interactions</li>
                          <li><code>messaging_optins</code> - For opt-in events</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                        5
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Verify & Save</h4>
                        <p className="text-sm text-gray-400">
                          Click <strong>Verify and Save</strong>. Meta will send a verification request to your webhook URL.
                          Use the test tool above to ensure your webhook is responding correctly before verifying.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-yellow-900/20 border-yellow-500/30 mt-4">
                    <AlertDescription className="text-yellow-200 text-sm">
                      <strong>Important:</strong> Your webhook endpoint must be publicly accessible and use HTTPS.
                      Make sure your app is deployed and accessible at the URL above.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how you want to be notified of new messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Alert className="bg-blue-500/10 border-blue-500/20">
                    <AlertDescription className="text-blue-200">
                      Settings coming soon. You'll be able to configure notifications, auto-replies, and more.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
