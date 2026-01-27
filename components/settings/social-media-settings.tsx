'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import FacebookConnect from '@/components/facebook/facebook-connect';
import { FacebookMessengerConnect } from '@/components/facebook/facebook-messenger-connect';
import { Facebook, Instagram, Share2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export function SocialMediaSettings() {
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConnections();
  }, []);

  const checkConnections = async () => {
    try {
      const facebookRes = await fetch('/api/facebook/status');

      if (facebookRes.ok) {
        const facebookData = await facebookRes.json();
        setIsFacebookConnected(facebookData.isConnected || false);
      }
    } catch (error) {
      console.error('Failed to check social media connections:', error);
      toast.error('Failed to load connection status');
    } finally {
      setLoading(false);
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

      {/* Coming Soon Cards */}
      <Card className="border-gray-800 opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Instagram className="h-5 w-5 text-pink-500" />
              Instagram Direct
            </div>
            <span className="text-xs font-normal px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full">
              Coming Soon
            </span>
          </CardTitle>
          <CardDescription>
            Connect Instagram to manage DMs and comments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">
            Instagram integration will be available soon. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
