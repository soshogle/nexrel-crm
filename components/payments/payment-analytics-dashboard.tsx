
"use client";

/**
 * Payment Analytics Dashboard
 * Comprehensive revenue tracking, conversion rates, and customer insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Users,
  BarChart3,
  Download,
  Shield,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

interface AnalyticsData {
  totalRevenue: number;
  transactionCount: number;
  averageOrderValue: number;
  conversionRate: number;
  topPaymentMethods: Array<{ method: string; count: number; revenue: number }>;
  revenueByDay: Array<{ date: string; revenue: number }>;
  customerLifetimeValue: number;
  repeatCustomerRate: number;
  fraudRiskDistribution: Array<{ tier: string; count: number }>;
  walletUsageRate: number;
}

export function PaymentAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/payments/analytics?range=${dateRange}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    try {
      const response = await fetch(`/api/payments/analytics/export?range=${dateRange}`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payment-analytics-${dateRange}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Analytics exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const maxRevenue = Math.max(...analytics.revenueByDay.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Payment Analytics</h2>
          <p className="text-muted-foreground">
            Track revenue, conversions, and customer insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <TabsList>
              <TabsTrigger value="7d">7 Days</TabsTrigger>
              <TabsTrigger value="30d">30 Days</TabsTrigger>
              <TabsTrigger value="90d">90 Days</TabsTrigger>
              <TabsTrigger value="1y">1 Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +12.5%
              </span>{' '}
              from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(analytics.transactionCount)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +8.3%
              </span>{' '}
              from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.averageOrderValue)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600 inline-flex items-center">
                <TrendingDown className="mr-1 h-3 w-3" />
                -2.1%
              </span>{' '}
              from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600 inline-flex items-center">
                <TrendingUp className="mr-1 h-3 w-3" />
                +3.7%
              </span>{' '}
              from previous period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-end justify-between gap-1">
            {analytics.revenueByDay.map((day, index) => {
              const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center group">
                  <div className="relative w-full">
                    <div
                      className="w-full bg-primary/80 hover:bg-primary transition-colors rounded-t cursor-pointer"
                      style={{ height: `${Math.max(height * 2.5, 2)}px` }}
                      title={`${new Date(day.date).toLocaleDateString()}: ${formatCurrency(
                        day.revenue
                      )}`}
                    />
                  </div>
                  {index % Math.ceil(analytics.revenueByDay.length / 7) === 0 && (
                    <span className="text-xs text-muted-foreground mt-2 rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topPaymentMethods.map((method) => {
                const percentage =
                  analytics.totalRevenue > 0
                    ? (method.revenue / analytics.totalRevenue) * 100
                    : 0;
                return (
                  <div key={method.method} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium capitalize">{method.method}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(method.revenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {method.count} transactions
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}% of total revenue
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Fraud Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Fraud Risk Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.fraudRiskDistribution.map((risk) => {
                const percentage =
                  analytics.transactionCount > 0
                    ? (risk.count / analytics.transactionCount) * 100
                    : 0;

                const colorMap: Record<string, string> = {
                  LOW: 'bg-green-500',
                  MEDIUM: 'bg-yellow-500',
                  HIGH: 'bg-orange-500',
                  CRITICAL: 'bg-red-500',
                  UNKNOWN: 'bg-gray-500',
                };

                return (
                  <div key={risk.tier} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{risk.tier.toLowerCase()}</span>
                      <div className="text-right">
                        <div className="font-semibold">{formatNumber(risk.count)}</div>
                        <div className="text-xs text-muted-foreground">transactions</div>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`${colorMap[risk.tier] || colorMap.UNKNOWN} h-2 rounded-full transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      {percentage.toFixed(1)}% of transactions
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Lifetime Value</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.customerLifetimeValue)}
            </div>
            <p className="text-xs text-muted-foreground">Average revenue per customer</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customer Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.repeatCustomerRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Customers with 2+ purchases</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Usage Rate</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.walletUsageRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Transactions using wallet</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
