'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MetaConnect from '@/components/meta/meta-connect';
import InstagramConnect from '@/components/instagram/instagram-connect';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MetaSettings() {
  const [isMetaConnected, setIsMetaConnected] = useState(false);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);

  const checkConnections = async () => {
    try {
      const response = await fetch('/api/meta/status');
      if (response.ok) {
        const data = await response.json();
        setIsMetaConnected(data.isConnected);
      }
    } catch (error) {
      console.error('Failed to check Meta connections:', error);
    }
    
    try {
      const instagramResponse = await fetch('/api/instagram/status');
      if (instagramResponse.ok) {
        const data = await instagramResponse.json();
        setIsInstagramConnected(data.isConnected);
      }
    } catch (error) {
      console.error('Failed to check Instagram connection:', error);
    }
  };

  useEffect(() => {
    checkConnections();
  }, []);

  const handleMetaSuccess = () => {
    setIsMetaConnected(true);
    checkConnections();
  };

  const handleMetaDisconnect = () => {
    setIsMetaConnected(false);
    checkConnections();
  };

  const handleInstagramSuccess = () => {
    setIsInstagramConnected(true);
    checkConnections();
  };

  const handleInstagramDisconnect = () => {
    setIsInstagramConnected(false);
    checkConnections();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          Meta Platform Integration
        </h2>
        <p className="text-gray-400">
          Connect Instagram, Facebook Pages, and WhatsApp Business to manage all your social messaging in one place.
        </p>
      </div>

      <Tabs defaultValue="instagram" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" />
            Instagram Only
          </TabsTrigger>
          <TabsTrigger value="unified" className="flex items-center gap-2">
            <div className="flex gap-1">
              <Facebook className="h-3 w-3" />
              <Instagram className="h-3 w-3" />
              <MessageCircle className="h-3 w-3" />
            </div>
            Unified Meta
          </TabsTrigger>
        </TabsList>

        <TabsContent value="instagram" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram Direct Messaging
              </CardTitle>
              <CardDescription>
                Connect your Instagram account for direct message integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <h4 className="font-semibold mb-2">Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-400">
                  <li>Send and receive Instagram Direct Messages</li>
                  <li>View all Instagram conversations in Messages tab</li>
                  <li>Auto-create leads from Instagram DMs</li>
                  <li>Track message history and analytics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <InstagramConnect
            isConnected={isInstagramConnected}
            onConnectionSuccess={handleInstagramSuccess}
            onDisconnect={handleInstagramDisconnect}
          />

          {isInstagramConnected && (
            <Card className="bg-green-500/10 border-green-500/50">
              <CardHeader>
                <CardTitle className="text-green-400">✅ Instagram Connected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <p>Your Instagram account is now integrated!</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Go to the Messages tab to view your Instagram DMs</li>
                  <li>Reply to messages directly from your CRM</li>
                  <li>New conversations will appear automatically</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="unified" className="space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="flex gap-1">
                  <Facebook className="h-5 w-5 text-blue-500" />
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <MessageCircle className="h-5 w-5 text-green-500" />
                </div>
                Unified Meta Integration
              </CardTitle>
              <CardDescription>
                Connect all Meta platforms through a single OAuth connection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Facebook className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">Facebook Pages</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Manage page messages, comments, and posts from your CRM
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-pink-500/10 border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Instagram className="h-5 w-5 text-pink-500" />
                    <h3 className="font-semibold">Instagram Business</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Handle DMs, comments, and engage with your Instagram audience
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">WhatsApp Business</h3>
                  </div>
                  <p className="text-sm text-gray-400">
                    Send and receive WhatsApp messages directly from your CRM
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <h4 className="font-semibold mb-2">What you need:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-400">
                  <li>A Meta (Facebook) Developer account</li>
                  <li>A Meta App with appropriate permissions</li>
                  <li>Your App ID and App Secret from the Meta Developer Dashboard</li>
                  <li>Facebook Page(s) for messaging</li>
                  <li>Instagram Business Account(s) connected to your Facebook Page</li>
                  <li>WhatsApp Business Account (optional)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <MetaConnect
            onConnectionSuccess={handleMetaSuccess}
            onDisconnect={handleMetaDisconnect}
          />

          {isMetaConnected && (
            <Card className="bg-green-500/10 border-green-500/50">
              <CardHeader>
                <CardTitle className="text-green-400">✅ Meta Platforms Connected</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-gray-300">
                <p>Your Meta platforms are now connected!</p>
                <p>You can now:</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>View and reply to Instagram Business DMs in the Messages tab</li>
                  <li>Manage Facebook Page messages and comments</li>
                  <li>Send and receive WhatsApp Business messages</li>
                  <li>Access all conversations in your unified inbox</li>
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
