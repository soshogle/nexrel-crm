'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Phone,
  Clock,
  DollarSign,
  TrendingUp,
  Calendar,
  PhoneOutgoing,
  PhoneIncoming,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  tier: string;
  monthlyMinutesQuota: number;
  minutesUsedThisMonth: number;
  pricePerMinute: number;
  overageAllowed: boolean;
  overageRate: number;
  isActive: boolean;
  billingCycleStart: string;
}

interface Usage {
  totalCalls: number;
  totalMinutes: number;
  totalCost: number;
  remainingMinutes: number;
  percentUsed: number;
}

interface UsageLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  durationSeconds: number;
  durationMinutes: number;
  cost: number;
  callerNumber?: string;
  recipientNumber?: string;
  status: string;
  createdAt: string;
}

export function VoiceAIUsageDashboard() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [recentCalls, setRecentCalls] = useState<UsageLog[]>([]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription and usage summary
      const subResponse = await fetch('/api/voice-ai/subscription');
      if (subResponse.ok) {
        const data = await subResponse.json();
        setSubscription(data.subscription);
        setUsage(data.usage);
      }

      // Fetch recent usage logs
      const logsResponse = await fetch('/api/voice-ai/usage?limit=10');
      if (logsResponse.ok) {
        const data = await logsResponse.json();
        setRecentCalls(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching Voice AI data:', error);
      toast.error('Failed to load Voice AI data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'STARTER':
        return 'bg-blue-500';
      case 'PROFESSIONAL':
        return 'bg-purple-500';
      case 'ENTERPRISE':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'NO_ANSWER':
      case 'BUSY':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-muted h-32 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-muted h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Subscription Overview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">NEXREL Voice AI</CardTitle>
              <CardDescription>Your voice AI subscription and usage</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={getTierBadgeColor(subscription?.tier || 'STARTER')}>
                {subscription?.tier || 'STARTER'}
              </Badge>
              {subscription?.isActive ? (
                <Badge variant="outline" className="border-green-500 text-green-500">
                  Active
                </Badge>
              ) : (
                <Badge variant="outline" className="border-red-500 text-red-500">
                  Inactive
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Usage Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">
                  {usage?.remainingMinutes || 0} minutes remaining
                </span>
                <span className="font-medium">
                  {subscription?.minutesUsedThisMonth || 0} / {subscription?.monthlyMinutesQuota || 100} min
                </span>
              </div>
              <Progress 
                value={usage?.percentUsed || 0} 
                className="h-3"
              />
              {usage && usage.percentUsed >= 80 && (
                <p className="text-sm text-amber-500 mt-2">
                  ⚠️ You've used {usage.percentUsed}% of your monthly quota.
                  {subscription?.overageAllowed 
                    ? ` Overage rate: $${subscription.overageRate}/min`
                    : ' Upgrade for more minutes.'
                  }
                </p>
              )}
            </div>

            {/* Billing Cycle */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Billing cycle started: {subscription?.billingCycleStart 
                  ? new Date(subscription.billingCycleStart).toLocaleDateString()
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Phone className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
                <p className="text-2xl font-bold">{usage?.totalCalls || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Minutes</p>
                <p className="text-2xl font-bold">{usage?.totalMinutes.toFixed(1) || '0.0'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10">
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Charges</p>
                <p className="text-2xl font-bold">${usage?.totalCost.toFixed(2) || '0.00'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10">
                <TrendingUp className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rate</p>
                <p className="text-2xl font-bold">${subscription?.pricePerMinute.toFixed(2) || '0.50'}/min</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Calls</CardTitle>
          <CardDescription>Your latest Voice AI call activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No calls yet</p>
              <p className="text-sm">Your Voice AI call history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {call.direction === 'OUTBOUND' ? (
                      <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                    ) : (
                      <PhoneIncoming className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {call.direction === 'OUTBOUND' 
                          ? call.recipientNumber || 'Unknown'
                          : call.callerNumber || 'Unknown'
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(call.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-medium">{formatDuration(call.durationSeconds)}</p>
                      <p className="text-sm text-muted-foreground">
                        ${call.cost.toFixed(2)}
                      </p>
                    </div>
                    {getStatusIcon(call.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
