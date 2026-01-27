'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  TrendingUp,
  Users,
  Target,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface VoiceAnalytics {
  totalLeads: number;
  totalCalls: number;
  completedCalls: number;
  answeredCalls: number;
  voicemails: number;
  avgDuration: number;
  convertedLeads: number;
  answerRate: number;
  conversionRate: number;
}

interface Props {
  campaignId: string;
  campaignName?: string;
}

export default function VoiceCampaignAnalytics({ campaignId, campaignName }: Props) {
  const [analytics, setAnalytics] = useState<VoiceAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [campaignId]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/campaigns/voice/analytics?campaignId=${campaignId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold gradient-text mb-2">Voice Campaign Analytics</h2>
        {campaignName && <p className="text-gray-400">{campaignName}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{analytics.totalLeads}</div>
              <Users className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{analytics.totalCalls}</div>
              <Phone className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Answered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-400">{analytics.answeredCalls}</div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-2">
              <Progress value={analytics.answerRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">{analytics.answerRate.toFixed(1)}% answer rate</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-purple-400">{analytics.convertedLeads}</div>
              <Target className="h-8 w-8 text-purple-500" />
            </div>
            <div className="mt-2">
              <Progress value={analytics.conversionRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {analytics.conversionRate.toFixed(1)}% conversion rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-green-400" />
              Call Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-400">Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analytics.answeredCalls}</span>
                <Badge variant="outline" className="text-green-400 border-green-500/30">
                  {analytics.answerRate.toFixed(1)}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PhoneOff className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Voicemails</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{analytics.voicemails}</span>
                <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">
                  {analytics.totalCalls > 0
                    ? ((analytics.voicemails / analytics.totalCalls) * 100).toFixed(1)
                    : 0}
                  %
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-400">No Answer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {analytics.totalCalls - analytics.answeredCalls - analytics.voicemails}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-purple-400" />
                  <span className="text-sm text-gray-400">Avg Duration</span>
                </div>
                <span className="font-semibold">{formatDuration(analytics.avgDuration)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-400" />
              Lead Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Contact Rate</span>
                <span className="font-semibold">
                  {analytics.totalLeads > 0
                    ? ((analytics.totalCalls / analytics.totalLeads) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <Progress
                value={
                  analytics.totalLeads > 0 ? (analytics.totalCalls / analytics.totalLeads) * 100 : 0
                }
                className="h-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                {analytics.totalCalls} of {analytics.totalLeads} leads contacted
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Answer Rate</span>
                <span className="font-semibold">{analytics.answerRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.answerRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {analytics.answeredCalls} calls answered
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Conversion Rate</span>
                <span className="font-semibold">{analytics.conversionRate.toFixed(1)}%</span>
              </div>
              <Progress value={analytics.conversionRate} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                {analytics.convertedLeads} leads converted
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              Campaign Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-400">Total Leads</span>
              <span className="font-semibold text-lg">{analytics.totalLeads}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-400">Total Calls Made</span>
              <span className="font-semibold text-lg">{analytics.totalCalls}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-700">
              <span className="text-sm text-gray-400">Successful Conversations</span>
              <span className="font-semibold text-lg text-green-400">{analytics.answeredCalls}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-400">Conversions</span>
              <span className="font-semibold text-lg text-purple-400">
                {analytics.convertedLeads}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Campaign Insights</CardTitle>
          <CardDescription>Key performance indicators for your voice campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.answerRate > 50 && (
              <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-400">High Answer Rate</p>
                  <p className="text-sm text-gray-400">
                    Your {analytics.answerRate.toFixed(1)}% answer rate is excellent! This indicates
                    your calling times and lead quality are optimal.
                  </p>
                </div>
              </div>
            )}

            {analytics.answerRate < 30 && analytics.totalCalls > 10 && (
              <div className="flex items-start gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-400">Low Answer Rate</p>
                  <p className="text-sm text-gray-400">
                    Consider adjusting your call windows or lead targeting. Answer rates below 30%
                    may indicate timing or targeting issues.
                  </p>
                </div>
              </div>
            )}

            {analytics.conversionRate > 10 && (
              <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Target className="h-5 w-5 text-purple-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-purple-400">Strong Conversion Rate</p>
                  <p className="text-sm text-gray-400">
                    Your {analytics.conversionRate.toFixed(1)}% conversion rate is outstanding!
                    Your voice agents are effectively engaging leads.
                  </p>
                </div>
              </div>
            )}

            {analytics.avgDuration > 0 && analytics.avgDuration < 30 && (
              <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Timer className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-400">Short Call Duration</p>
                  <p className="text-sm text-gray-400">
                    Average call duration is {formatDuration(analytics.avgDuration)}. Consider
                    reviewing your call script to ensure proper engagement.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
