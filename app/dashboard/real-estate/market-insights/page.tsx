'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, TrendingUp, TrendingDown, Home, DollarSign,
  Share2, Loader2, FileText, Building2, Clock, PieChart as PieIcon, ChevronLeft,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';

interface MarketReport {
  id: string;
  type: string;
  title: string;
  region: string;
  periodStart: string;
  periodEnd: string;
  executiveSummary?: string | null;
  keyHighlights?: unknown;
  buyerInsights?: string | null;
  sellerInsights?: string | null;
  predictions?: unknown;
  socialCaption?: string | null;
  pdfUrl?: string | null;
  createdAt: string;
}

interface MarketStat {
  id: string;
  periodStart: string;
  periodEnd: string;
  region: string;
  medianSalePrice?: number | null;
  avgSalePrice?: number | null;
  domMedian?: number | null;
  newListings?: number | null;
  closedSales?: number | null;
  activeInventory?: number | null;
  monthsOfSupply?: number | null;
  listToSaleRatio?: number | null;
}

interface MyStats {
  totalListings: number;
  activeCount: number;
  soldCount: number;
  pendingCount: number;
  medianListPrice: number;
  avgDaysOnMarket: number;
  medianSoldPrice: number;
  totalActiveValue: number;
  statusBreakdown: { status: string; count: number; avgPrice: number | null; avgDom: number | null }[];
}

const PIE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#6b7280', '#a855f7'];

function formatK(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export default function MarketInsightsPage() {
  const [marketReports, setMarketReports] = useState<MarketReport[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [myStats, setMyStats] = useState<MyStats | null>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
      .then((d) => {
        const sites = d?.websites ?? [];
        if (sites.length > 0) setWebsiteId(sites[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/real-estate/market-reports?limit=50')
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d) => setMarketReports(d.reports ?? []))
      .catch(() => setMarketReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  useEffect(() => {
    fetch('/api/real-estate/market-stats?limit=24')
      .then((r) => (r.ok ? r.json() : { stats: [], myStats: null }))
      .then((d) => {
        setMarketStats(d.stats ?? []);
        setMyStats(d.myStats ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const publishToSecretProperties = async (report: MarketReport) => {
    if (!websiteId) {
      toast.error('No website found. Create a website first.');
      return;
    }
    setPublishingId(report.id);
    try {
      const content = {
        executiveSummary: report.executiveSummary,
        keyHighlights: report.keyHighlights,
        buyerInsights: report.buyerInsights,
        sellerInsights: report.sellerInsights,
        predictions: report.predictions,
      };
      const res = await fetch(`/api/websites/${websiteId}/secret-reports/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'MARKET_INSIGHT',
          title: report.title,
          region: report.region,
          content,
          executiveSummary: report.executiveSummary || null,
          pdfUrl: report.pdfUrl || null,
          sourceReportId: report.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to publish');
      }
      toast.success('Report published to Secret Properties page!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to publish');
    } finally {
      setPublishingId(null);
    }
  };

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/real-estate/market-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed_sample', region: 'Local Market', months: 12 }),
      });
      if (!res.ok) throw new Error('Failed to seed data');
      const result = await res.json();
      toast.success(result.message || 'Sample data generated!');
      // Refresh stats
      const statsRes = await fetch('/api/real-estate/market-stats?limit=24');
      if (statsRes.ok) {
        const d = await statsRes.json();
        setMarketStats(d.stats ?? []);
        setMyStats(d.myStats ?? null);
      }
    } catch {
      toast.error('Failed to generate sample data');
    } finally {
      setSeeding(false);
    }
  };

  // Prepare chart data
  const priceChartData = marketStats.map((s) => ({
    period: format(new Date(s.periodStart), 'MMM yy'),
    median: s.medianSalePrice || 0,
    avg: s.avgSalePrice || 0,
  }));

  const inventoryChartData = marketStats.map((s) => ({
    period: format(new Date(s.periodStart), 'MMM yy'),
    newListings: s.newListings || 0,
    closedSales: s.closedSales || 0,
    activeInventory: s.activeInventory || 0,
  }));

  const domChartData = marketStats.map((s) => ({
    period: format(new Date(s.periodStart), 'MMM yy'),
    dom: s.domMedian || 0,
  }));

  const pieData = myStats?.statusBreakdown
    .filter((s) => s.count > 0)
    .map((s) => ({
      name: s.status.replace(/_/g, ' '),
      value: s.count,
    })) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/real-estate" className="text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="p-3 bg-purple-500 rounded-xl">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Market Insights</h1>
          <p className="text-muted-foreground">Real-time market data, trends, and your portfolio analytics</p>
        </div>
      </div>

      {/* My Portfolio Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Median List Price</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats ? formatK(myStats.medianListPrice) : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Your active listings</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Days on Market</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {myStats ? Math.round(myStats.avgDaysOnMarket) : '—'}
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Active listings</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Listings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{myStats?.activeCount ?? '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">of {myStats?.totalListings ?? 0} total</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{myStats?.soldCount ?? '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Median {myStats ? formatK(myStats.medianSoldPrice) : '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Portfolio Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myStats ? formatK(myStats.totalActiveValue) : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Combined list price</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Price Trends
            </CardTitle>
            <CardDescription>Median & average sale prices over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : priceChartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No market stats data yet.</p>
                <p className="text-xs mt-1 mb-3">Stats will appear as market data is collected.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSeedData}
                  disabled={seeding}
                >
                  {seeding ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</> : 'Generate Sample Data'}
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={priceChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatK(v)} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatK(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="median" name="Median" stroke="#8b5cf6" fill="#8b5cf680" />
                  <Area type="monotone" dataKey="avg" name="Average" stroke="#3b82f6" fill="#3b82f680" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Inventory / Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Inventory & Sales
            </CardTitle>
            <CardDescription>New listings vs closed sales</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : inventoryChartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No inventory data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inventoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="newListings" name="New Listings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closedSales" name="Closed Sales" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Days on Market Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Days on Market
            </CardTitle>
            <CardDescription>Median DOM over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : domChartData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No DOM data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={domChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="period" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => `${v} days`} />
                  <Area type="monotone" dataKey="dom" name="Median DOM" stroke="#f59e0b" fill="#f59e0b40" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Portfolio Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieIcon className="h-5 w-5" />
              Portfolio Breakdown
            </CardTitle>
            <CardDescription>Your listings by status</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PieIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No listings yet.</p>
                <Link href="/dashboard/real-estate/listings" className="text-primary text-sm hover:underline">
                  Add your first listing
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Market Reports
          </CardTitle>
          <CardDescription>
            AI-generated market reports. Publish any report to your Secret Properties page to capture leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : marketReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No market reports yet.</p>
              <p className="text-sm mt-1">Create reports via the AI assistant or Market Report generator.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {marketReports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{report.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {report.region} &bull; {report.type} &bull; {format(new Date(report.createdAt), 'MMM d, yyyy')}
                    </p>
                    {report.executiveSummary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.executiveSummary}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => publishToSecretProperties(report)}
                    disabled={!websiteId || publishingId === report.id}
                    className="ml-4 shrink-0"
                  >
                    {publishingId === report.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Share2 className="h-4 w-4 mr-2" />
                        Publish
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
