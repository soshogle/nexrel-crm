'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ChannelStats {
  totalConnections: number;
  activeConnections: number;
  messagesReceived: number;
  messagesSent: number;
}

interface ChannelStatsCardsProps {
  refreshKey?: number;
  compact?: boolean;
}

export function ChannelStatsCards({ refreshKey = 0, compact = false }: ChannelStatsCardsProps) {
  const [stats, setStats] = useState<ChannelStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/soshogle/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching channel stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [refreshKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Connections', value: stats.totalConnections, color: 'text-white' },
    { label: 'Active Channels', value: stats.activeConnections, color: 'text-green-500' },
    { label: 'Messages Received', value: stats.messagesReceived, color: 'text-blue-500' },
    { label: 'Messages Sent', value: stats.messagesSent, color: 'text-purple-500' },
  ];

  if (compact) {
    return (
      <div className="grid grid-cols-4 gap-2 py-2">
        {cards.map((card) => (
          <Card key={card.label} className="bg-[#202124] border-gray-700">
            <CardContent className="p-3">
              <p className="text-xs text-gray-400 truncate">{card.label}</p>
              <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-[#202124] border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
