'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Mail, 
  MessageCircle, 
  Instagram, 
  Facebook,
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Settings,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface ChannelConnection {
  id: string;
  channelType: string;
  displayName?: string;
  channelIdentifier?: string;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'PENDING_AUTH';
  errorMessage?: string;
}

const channelConfig = {
  SMS: {
    icon: Phone,
    name: 'SMS',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    connectUrl: '/dashboard/settings?section=messaging',
  },
  EMAIL: {
    icon: Mail,
    name: 'Email',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    connectUrl: '/dashboard/settings?section=messaging',
  },
  WHATSAPP: {
    icon: MessageCircle,
    name: 'WhatsApp',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    connectUrl: '/dashboard/settings?section=whatsapp',
  },
  INSTAGRAM: {
    icon: Instagram,
    name: 'Instagram',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/20',
    connectUrl: '/dashboard/settings?section=meta',
  },
  FACEBOOK_MESSENGER: {
    icon: Facebook,
    name: 'Facebook',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    connectUrl: '/dashboard/settings?section=meta',
  },
  GOOGLE_BUSINESS: {
    icon: MessageCircle,
    name: 'Google Business',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    connectUrl: '/dashboard/settings?section=messaging',
  },
  WEBSITE_CHAT: {
    icon: MessageCircle,
    name: 'Website Chat',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    connectUrl: '/dashboard/settings?section=messaging',
  },
};

interface ChannelConnectionsPanelProps {
  onConnectionChange?: () => void;
}

export function ChannelConnectionsPanel({ onConnectionChange }: ChannelConnectionsPanelProps) {
  const [connections, setConnections] = useState<ChannelConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/messaging/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelStatus = (channelType: string) => {
    const channelConnections = connections.filter(
      (c) => c.channelType === channelType && c.status === 'CONNECTED'
    );
    return {
      isConnected: channelConnections.length > 0,
      connection: channelConnections[0],
      count: channelConnections.length,
    };
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case 'ERROR':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      case 'PENDING_AUTH':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card className="border-gray-700 bg-[#202124]">
        <CardHeader>
          <CardTitle className="text-white">Channel Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-800 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-4 space-y-2">
        {Object.entries(channelConfig).map(([channelType, config]) => {
          const status = getChannelStatus(channelType);
          const Icon = config.icon;

          return (
            <div
              key={channelType}
              className={`flex items-center justify-between p-3 rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:opacity-80`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white">{config.name}</p>
                    {status.count > 1 && (
                      <Badge variant="outline" className="text-xs">
                        {status.count}
                      </Badge>
                    )}
                  </div>
                  {status.connection?.displayName && (
                    <p className="text-xs text-gray-400 truncate">
                      {status.connection.displayName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(status.isConnected ? 'CONNECTED' : 'DISCONNECTED')}
                {!status.isConnected && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      window.open(config.connectUrl, '_blank');
                      onConnectionChange?.();
                    }}
                    className="text-white hover:bg-white/10"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
