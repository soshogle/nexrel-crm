'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Users, Phone, Mail, MessageSquare, DollarSign, AlertCircle } from 'lucide-react';

interface AnalyticsDashboardData {
  leadGeneration: {
    newLeadsToday: number;
    newLeadsThisWeek: number;
    newLeadsThisMonth: number;
    costPerLead: number;
    target: number;
    onTrack: boolean;
  };
  leadQuality: {
    avgLeadScore: number;
    percentAbove70: number;
    percentAbove50: number;
    topSource: string;
  };
  outreachPerformance: {
    callsMadeToday: number;
    callConnectRate: number;
    meetingBookingRate: number;
    avgCallDuration: string;
    topObjection: string;
  };
  emailPerformance: {
    emailsSentToday: number;
    openRate: number;
    clickRate: number;
    replyRate: number;
    topLinkClicked: string;
  };
  smsPerformance: {
    smsSentToday: number;
    deliveryRate: number;
    responseRate: number;
    positiveResponseRate: number;
    avgResponseTime: string;
  };
  conversionMetrics: {
    meetingsBookedToday: number;
    meetingsBookedThisWeek: number;
    noShowRate: number;
    conversionRate: number;
    revenueForecast: number;
  };
  optimizationOpportunities: Array<{
    metric: string;
    current: string;
    target: string;
    recommendation: string;
  }>;
  forecast: {
    leadsNeededForTarget: number;
    currentPace: number;
    recommendation: string;
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/lead-generation/analytics/dashboard');
      const result = await response.json();
      if (result.success) {
        setData(result.dashboard);
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading analytics...</div>;
  }

  if (!data) {
    return <div className="p-8 text-center text-muted-foreground">No data available</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Lead Generation Analytics</h2>
        <p className="text-muted-foreground">Real-time performance metrics and insights</p>
      </div>

      {/* Lead Generation Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Today</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leadGeneration.newLeadsToday}</div>
            <p className="text-xs text-muted-foreground">
              Target: {data.leadGeneration.target}
              {data.leadGeneration.onTrack ? (
                <Badge variant="default" className="ml-2">On Track</Badge>
              ) : (
                <Badge variant="destructive" className="ml-2">Behind</Badge>
              )}
            </p>
            <Progress 
              value={(data.leadGeneration.newLeadsToday / data.leadGeneration.target) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leadGeneration.newLeadsThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {(data.leadGeneration.newLeadsThisWeek / 7).toFixed(1)} per day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.leadGeneration.newLeadsThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Cost per lead: ${data.leadGeneration.costPerLead.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${data.conversionMetrics.revenueForecast.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.conversionMetrics.conversionRate}% conversion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Quality */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Quality Metrics</CardTitle>
          <CardDescription>Quality scores and source performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg Score</p>
              <p className="text-2xl font-bold">{data.leadQuality.avgLeadScore}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Score &gt; 70</p>
              <p className="text-2xl font-bold">{data.leadQuality.percentAbove70}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Score &gt; 50</p>
              <p className="text-2xl font-bold">{data.leadQuality.percentAbove50}%</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Top Source</p>
              <p className="text-lg font-bold capitalize">{data.leadQuality.topSource.replace('_', ' ')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Outreach Performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Voice Calls</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.outreachPerformance.callsMadeToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.outreachPerformance.callConnectRate}% connect rate
            </p>
            <p className="text-xs text-muted-foreground">
              {data.outreachPerformance.meetingBookingRate}% booking rate
            </p>
            <Progress value={data.outreachPerformance.callConnectRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Campaign</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.emailPerformance.emailsSentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.emailPerformance.openRate}% open • {data.emailPerformance.clickRate}% click
            </p>
            <p className="text-xs text-muted-foreground">
              {data.emailPerformance.replyRate}% reply rate
            </p>
            <Progress value={data.emailPerformance.openRate} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.smsPerformance.smsSentToday}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.smsPerformance.responseRate}% response rate
            </p>
            <p className="text-xs text-muted-foreground">
              {data.smsPerformance.positiveResponseRate}% positive
            </p>
            <Progress value={data.smsPerformance.responseRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Optimization Opportunities */}
      {data.optimizationOpportunities.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle>Optimization Opportunities</CardTitle>
            </div>
            <CardDescription>Areas that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.optimizationOpportunities.map((opp, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{opp.metric}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Current: {opp.current} → Target: {opp.target}
                    </p>
                    <p className="text-sm text-orange-700 font-medium mt-2">
                      → {opp.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Forecast</CardTitle>
          <CardDescription>Projected performance based on current pace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Current Pace</p>
                <p className="text-2xl font-bold">{data.forecast.currentPace} leads/month</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Leads Needed</p>
                <p className="text-2xl font-bold">{data.forecast.leadsNeededForTarget}</p>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{data.forecast.recommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
