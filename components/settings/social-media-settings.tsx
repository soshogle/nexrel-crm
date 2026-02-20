'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FacebookConnect from '@/components/facebook/facebook-connect';
import { FacebookMessengerConnect } from '@/components/facebook/facebook-messenger-connect';
import { Facebook, Instagram, Share2, MessageSquare, MessageCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function SocialMediaSettings() {
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [connectingInstagram, setConnectingInstagram] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const [facebookRes, channelsRes] = await Promise.all([
        fetch('/api/facebook/status'),
        fetch('/api/messaging/channels'),
      ]);

      if (facebookRes.ok) {
        const facebookData = await facebookRes.json();
        setIsFacebookConnected(facebookData.isConnected || false);
      }

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        const connections = channelsData.connections || [];
        setIsInstagramConnected(connections.some((c: any) => c.channelType === 'INSTAGRAM' && c.status === 'CONNECTED'));
        setIsGmailConnected(connections.some((c: any) => c.channelType === 'EMAIL' && c.providerType === 'GMAIL' && c.status === 'CONNECTED'));
      }
    } catch (error) {
      console.error('Failed to check social media connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectInstagram = async () => {
    setConnectingInstagram(true);
    try {
      const res = await fetch('/api/messaging/connections/facebook/auth');
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      } else {
        toast.error('Failed to initiate Instagram connection');
      }
    } catch {
      toast.error('Failed to connect Instagram');
    } finally {
      setConnectingInstagram(false);
    }
  };

  const connectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await fetch('/api/messaging/connections/gmail/auth');
      if (res.ok) {
        const { authUrl } = await res.json();
        window.location.href = authUrl;
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to initiate Gmail connection');
      }
    } catch {
      toast.error('Failed to connect Gmail');
    } finally {
      setConnectingGmail(false);
    }
  };

  const handleFacebookSuccess = () => {
    setIsFacebookConnected(true);
    checkConnections();
  };

  const handleFacebookDisconnect = () => {
    setIsFacebookConnected(false);
    checkConnections();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold gradient-text mb-2">
          Social Media Integrations
        </h2>
        <p className="text-gray-400">
          Connect your social media accounts to manage messages from one central location
        </p>
      </div>

      {/* Benefits Card */}
      <Card className="border-gray-800 bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-purple-400" />
            Why Connect Social Media?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-300">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
              <span>Manage all social media conversations from your CRM dashboard</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
              <span>Respond to customer inquiries faster across multiple platforms</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
              <span>Track engagement and conversation history with customers</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2" />
              <span>Use AI to automate responses and qualify leads</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facebook Messenger */}
      <FacebookMessengerConnect />

      {/* Instagram */}
      <Card className="border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Instagram Direct
            </div>
            {isInstagramConnected ? (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Connect Instagram to manage DMs and comments directly from the CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isInstagramConnected ? (
            <p className="text-sm text-green-400">Instagram DMs are syncing to your inbox.</p>
          ) : (
            <Button onClick={connectInstagram} disabled={connectingInstagram} variant="outline" className="w-full">
              {connectingInstagram ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Instagram className="h-4 w-4 mr-2" />}
              Connect Instagram
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Gmail */}
      <Card className="border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-red-400" />
              Gmail
            </div>
            {isGmailConnected ? (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Check className="h-3 w-3 mr-1" /> Connected
              </Badge>
            ) : null}
          </CardTitle>
          <CardDescription>
            Connect Gmail to send and receive emails from the CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGmailConnected ? (
            <p className="text-sm text-green-400">Gmail is connected and syncing.</p>
          ) : (
            <Button onClick={connectGmail} disabled={connectingGmail} variant="outline" className="w-full">
              {connectingGmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <MessageCircle className="h-4 w-4 mr-2" />}
              Connect Gmail
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
