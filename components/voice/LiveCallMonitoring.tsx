'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Phone, Clock, User, Building2, TrendingUp, Play, Pause } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatDistance } from 'date-fns';

interface LiveCall {
  callId: string;
  leadId: string | null;
  leadName: string;
  leadCompany: string;
  phoneNumber: string;
  status: string;
  duration: number;
  createdAt: string;
  sentiment: string;
  callOutcome: string;
  transcript: string;
  recordingUrl: string | null;
}

export default function LiveCallMonitoring() {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);

  useEffect(() => {
    fetchActiveCalls();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchActiveCalls();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchActiveCalls = async () => {
    try {
      const response = await fetch('/api/conversations/live-monitoring?status=in-progress');
      if (!response.ok) throw new Error('Failed to fetch active calls');
      const data = await response.json();
      setCalls(data.calls || []);
    } catch (error) {
      console.error('Error fetching active calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-500';
      case 'negative':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Live Call Monitoring</h2>
          <p className="text-muted-foreground">Real-time view of active conversations</p>
        </div>
        <Button
          variant={autoRefresh ? 'default' : 'outline'}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Auto-refresh On
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Auto-refresh Off
            </>
          )}
        </Button>
      </div>

      {calls.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Calls</h3>
              <p className="text-muted-foreground">
                There are currently no calls in progress.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {calls.map((call) => (
            <Card key={call.callId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {call.leadName}
                    </CardTitle>
                    {call.leadCompany && (
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building2 className="h-3 w-3" />
                        {call.leadCompany}
                      </CardDescription>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="animate-pulse"
                  >
                    <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                    {call.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{call.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{formatDuration(call.duration)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{formatDistance(new Date(call.createdAt), new Date(), { addSuffix: true })}</span>
                </div>

                {call.sentiment && call.sentiment !== 'neutral' && (
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${getSentimentColor(call.sentiment)}`}></div>
                    <span className="text-sm capitalize">{call.sentiment} sentiment detected</span>
                  </div>
                )}

                {call.transcript && (
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Live Transcript:</p>
                    <p className="text-sm line-clamp-3">{call.transcript}</p>
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => setSelectedCall(call)}
                >
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
