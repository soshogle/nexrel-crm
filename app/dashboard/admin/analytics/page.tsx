'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  Users,
  DollarSign,
  Phone,
  Calendar,
  Mail,
  MessageSquare,
  Zap,
  TrendingDown,
  Activity,
  Target,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  overview: {
    totalLeads: number;
    newLeads: number;
    totalDeals: number;
    totalDealValue: number;
    wonDeals: number;
    wonDealValue: number;
    totalCalls: number;
    totalAppointments: number;
  };
  conversions: {
    leadConversionRate: number;
    dealWinRate: number;
  };
  campaigns: {
    email: {
      sent: number;
      delivered: number;
      opened: number;
      clicked: number;
      openRate: number;
      clickRate: number;
    };
    sms: {
      sent: number;
      delivered: number;
      replied: number;
      replyRate: number;
    };
  };
  workflows: {
    enrolled: number;
    completed: number;
    completionRate: number;
  };
  distribution: {
    leadsByStatus: Array<{ status: string; _count: number }>;
    dealsByStage: Array<{ stageId: string; _count: number; _sum: { value: number } }>;
  };
  revenue: Array<{ month: string; count: number; revenue: number }>;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics/overview?days=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !analytics) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="h-32 bg-muted" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your CRM performance and insights
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-card"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalLeads}</div>
                <p className="text-xs text-muted-foreground">
                  +{analytics.overview.newLeads} new this period
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.totalDeals}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.overview.totalDealValue)} in pipeline
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.overview.wonDeals}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(analytics.overview.wonDealValue)} revenue
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics.overview.totalAppointments}
                </div>
                <p className="text-xs text-muted-foreground">
                  {analytics.overview.totalCalls} total calls
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {analytics.distribution.leadsByStatus.map((item) => (
                  <div key={item.status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <span className="font-semibold">{item._count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Enrolled</span>
                  <span className="font-semibold">{analytics.workflows.enrolled}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <span className="font-semibold">{analytics.workflows.completed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <Badge className="bg-green-100 text-green-800">
                    {analytics.workflows.completionRate}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="font-semibold">{analytics.campaigns.email.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Delivered</span>
                  <span className="font-semibold">{analytics.campaigns.email.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Opened</span>
                  <span className="font-semibold">{analytics.campaigns.email.opened}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Clicked</span>
                  <span className="font-semibold">{analytics.campaigns.email.clicked}</span>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Open Rate</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {analytics.campaigns.email.openRate}%
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Click Rate</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {analytics.campaigns.email.clickRate}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  SMS Campaigns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sent</span>
                  <span className="font-semibold">{analytics.campaigns.sms.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Delivered</span>
                  <span className="font-semibold">{analytics.campaigns.sms.delivered}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Replies</span>
                  <span className="font-semibold">{analytics.campaigns.sms.replied}</span>
                </div>
                <div className="pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Reply Rate</span>
                    <Badge className="bg-green-100 text-green-800">
                      {analytics.campaigns.sms.replyRate}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Lead Conversion
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">
                  {analytics.conversions.leadConversionRate}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Percentage of leads converted to deals
                </p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Leads</span>
                    <span className="font-semibold">{analytics.overview.totalLeads}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Total Deals</span>
                    <span className="font-semibold">{analytics.overview.totalDeals}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Deal Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold mb-2">
                  {analytics.conversions.dealWinRate}%
                </div>
                <p className="text-sm text-muted-foreground">
                  Percentage of deals closed won
                </p>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Deals</span>
                    <span className="font-semibold">{analytics.overview.totalDeals}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Won Deals</span>
                    <span className="font-semibold">{analytics.overview.wonDeals}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Revenue Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Pipeline</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.overview.totalDealValue)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(analytics.overview.wonDealValue)}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Average Deal Size</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      analytics.overview.totalDeals > 0
                        ? analytics.overview.totalDealValue / analytics.overview.totalDeals
                        : 0
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
