'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocaleLabels } from '@/hooks/use-locale-labels';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BarChart3, TrendingUp, TrendingDown, Home, DollarSign,
  Share2, Loader2, FileText, Building2, Clock, PieChart as PieIcon, ChevronLeft,
  MapPin, Search, X, RefreshCw, Database, ArrowUpRight, ArrowDownRight,
  Activity, Target, Layers,
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

interface LiveStats {
  medianSalePrice: number;
  avgSalePrice: number;
  medianListPrice: number;
  medianSoldPrice: number;
  activeListings: number;
  totalActiveListings?: number;
  closedSales: number;
  pendingListings: number;
  domMedian: number;
  domAvg: number;
  pricePerSqft: number;
  monthsOfSupply: number;
  listToSaleRatio: number;
  totalActiveValue: number;
  newListingsThisMonth: number;
  priceChangePercent: number;
  fsboListings: number;
  fsboActive: number;
  fsboMedianPrice: number;
  rentalListings?: number;
  rentalActive?: number;
  typeBreakdown: { type: string; count: number }[];
  priceDistribution: { range: string; count: number }[];
  statusBreakdown: { status: string; count: number }[];
}

interface MonthlyTrend {
  month: string;
  newListings: number;
  closedSales: number;
  medianPrice: number;
  avgPrice: number;
  medianDom: number;
}

const PIE_COLORS = ['#22c55e', '#eab308', '#3b82f6', '#ef4444', '#6b7280', '#a855f7', '#f97316', '#06b6d4'];
const STATUS_COLORS: Record<string, string> = { ACTIVE: '#22c55e', PENDING: '#eab308', SOLD: '#3b82f6' };

function formatK(v: number) {
  if (!v) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
}

export default function MarketInsightsPage() {
  const locale = useLocaleLabels();
  const [marketReports, setMarketReports] = useState<MarketReport[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [globalMonthlyTrends, setGlobalMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [dataSource, setDataSource] = useState<any>(null);
  const [loadingReports, setLoadingReports] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [scope, setScope] = useState<'broker' | 'market'>('market');
  const [statsView, setStatsView] = useState<'broker' | 'global'>('broker');
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // Location search
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Google Places autocomplete
  const [placeSuggestions, setPlaceSuggestions] = useState<any[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch('/api/websites')
      .then((r) => r.json())
      .then((d) => {
        const sites = d?.websites ?? [];
        if (sites.length > 0) setWebsiteId(sites[0].id);
      })
      .catch(() => {});

    fetch('/api/real-estate/market-reports?limit=50')
      .then((r) => (r.ok ? r.json() : { reports: [] }))
      .then((d) => setMarketReports(d.reports ?? []))
      .catch(() => setMarketReports([]))
      .finally(() => setLoadingReports(false));
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams({ limit: '24', scope });
      if (selectedCity) params.set('city', selectedCity);
      if (selectedState) params.set('state', selectedState);

      const res = await fetch(`/api/real-estate/market-stats?${params}`);
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        throw new Error('Invalid JSON from market stats API');
      }

      setLiveStats(data.myStats || null);
      setGlobalStats(data.globalStats || null);
      setMonthlyTrends(Array.isArray(data?.myMonthlyTrends || data?.monthlyTrends) ? (data.myMonthlyTrends || data.monthlyTrends) : []);
      setGlobalMonthlyTrends(Array.isArray(data?.globalMonthlyTrends) ? data.globalMonthlyTrends : []);
      setLocations(Array.isArray(data?.locations) ? data.locations : []);
      setDataSource(data.dataSource || null);
    } catch (err: any) {
      console.error('Market stats fetch failed:', err);
      toast.error(`Market stats refresh failed. Keeping last data. ${err?.message || ''}`.trim());
    } finally {
      setLoadingStats(false);
    }
  }, [selectedCity, selectedState, scope]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Google Places search with debounce
  const searchPlaces = (query: string) => {
    setLocationQuery(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setPlaceSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingPlaces(true);
      try {
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}&types=(cities)`);
        if (res.ok) {
          const data = await res.json();
          setPlaceSuggestions(data.predictions || []);
        }
      } catch {
        setPlaceSuggestions([]);
      } finally {
        setLoadingPlaces(false);
      }
    }, 300);
  };

  const selectLocation = async (loc: string, fromPlaces?: boolean) => {
    if (loc === 'all') {
      setSelectedCity('');
      setSelectedState('');
      setLocationQuery('');
    } else if (fromPlaces) {
      // Parse city/state from Google Places suggestion
      const parts = loc.split(',').map((p) => p.trim());
      setSelectedCity(parts[0] || '');
      setSelectedState(parts[1] || '');
      setLocationQuery(loc);
    } else {
      const parts = loc.split(', ');
      setSelectedCity(parts[0] || '');
      setSelectedState(parts[1] || '');
      setLocationQuery(loc);
    }
    setShowDropdown(false);
    setPlaceSuggestions([]);
  };

  const filteredLocations = locations.filter((l) =>
    l.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const publishToSecretProperties = async (report: MarketReport) => {
    if (!websiteId) { toast.error('No website found.'); return; }
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
          reportType: 'MARKET_INSIGHT', title: report.title, region: report.region,
          content, executiveSummary: report.executiveSummary || null,
          pdfUrl: report.pdfUrl || null, sourceReportId: report.id,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed');
      toast.success('Report published to Secret Properties page!');
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to publish');
    } finally {
      setPublishingId(null);
    }
  };

  const displayStats = statsView === 'broker' ? liveStats : globalStats;
  const displayTrends = statsView === 'broker' ? monthlyTrends : globalMonthlyTrends;
  const hasData = statsView === 'broker'
    ? (liveStats && ((liveStats.activeListings || 0) + (liveStats.closedSales || 0) + (liveStats.rentalActive || 0) + (liveStats.rentalListings || 0) > 0))
    : (globalStats && ((globalStats.activeListings ?? 0) + (globalStats.closedSales ?? 0) > 0));

  // Chart data from monthly trends
  const priceChartData = Array.isArray(displayTrends) ? displayTrends.map((t: any) => ({
    period: t.month,
    median: t.medianPrice,
    avg: t.avgPrice,
  })) : [];

  const inventoryChartData = Array.isArray(displayTrends) ? displayTrends.map((t: any) => ({
    period: t.month,
    newListings: t.newListings,
    closedSales: t.closedSales,
  })) : [];

  const domChartData = Array.isArray(displayTrends) ? displayTrends.map((t: any) => ({
    period: t.month,
    dom: t.medianDom,
  })) : [];

  const pieData = statsView === 'broker' && Array.isArray(liveStats?.statusBreakdown) ? liveStats!.statusBreakdown.filter((s) => s.count > 0).map((s) => ({
    name: s.status.replace(/_/g, ' '), value: s.count,
  })) : [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Location Search */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/real-estate" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div className="p-3 bg-purple-500 rounded-xl">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              Market Insights
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600">LIVE DATA</Badge>
            </h1>
            <p className="text-muted-foreground">
              {statsView === 'broker'
                ? 'Your portfolio: listings, FSBOs, rentals'
                : 'Quebec market: Centris MLS data (shared)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={`Search city, ${locale.stateLabel.toLowerCase()}...`}
                value={locationQuery}
                onChange={(e) => { searchPlaces(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-64 pl-9 pr-8"
              />
              {locationQuery && (
                <button onClick={() => selectLocation('all')} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            {showDropdown && (
              <div className="absolute z-50 top-full mt-1 w-72 bg-popover border rounded-lg shadow-xl max-h-72 overflow-y-auto">
                <button onClick={() => selectLocation('all')} className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent flex items-center gap-2 border-b">
                  <MapPin className="w-4 h-4" /> All Areas
                </button>

                {filteredLocations.length > 0 && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/30">Your Listing Locations</div>
                )}
                {Array.isArray(filteredLocations) && filteredLocations.map((loc) => (
                  <button key={loc} onClick={() => selectLocation(loc)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-purple-500" /> {loc}
                  </button>
                ))}

                {placeSuggestions.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs text-muted-foreground font-medium bg-muted/30 border-t">Google Places</div>
                    {Array.isArray(placeSuggestions) && placeSuggestions.map((p: any) => (
                      <button key={p.place_id} onClick={() => selectLocation(p.description, true)} className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2">
                        <Search className="w-3 h-3 text-blue-500" /> {p.description}
                      </button>
                    ))}
                  </>
                )}

                {loadingPlaces && (
                  <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" /> Searching...
                  </div>
                )}

                {filteredLocations.length === 0 && placeSuggestions.length === 0 && !loadingPlaces && locationQuery.length >= 2 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No locations found</div>
                )}
              </div>
            )}
          </div>
          <Button variant="outline" size="icon" onClick={fetchStats} disabled={loadingStats}>
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats View Toggle: Broker vs Global MLS */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Data source:</span>
        <Button
          variant={statsView === 'broker' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatsView('broker')}
        >
          My Portfolio
        </Button>
        <Button
          variant={statsView === 'global' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStatsView('global')}
        >
          Quebec Market (MLS)
        </Button>
        {statsView === 'broker' && (
          <>
            <span className="text-sm text-muted-foreground mx-1">|</span>
            <Button
              variant={scope === 'broker' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScope('broker')}
            >
              Broker only
            </Button>
            <Button
              variant={scope === 'market' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setScope('market')}
            >
              All my listings
            </Button>
          </>
        )}
      </div>

      {/* Data Source Indicator */}
      {dataSource && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span className="font-medium">
              {statsView === 'broker' ? 'Broker stats (your listings)' : 'Quebec Market (Centris MLS)'}:
            </span>
          </div>
          {statsView === 'broker' ? (
            <>
              <span>{dataSource.properties} {scope === 'broker' ? 'broker listings' : 'properties'}</span>
              {(dataSource.rentalListings ?? 0) > 0 && (
                <>
                  <span>&bull;</span>
                  <span>{dataSource.rentalListings} rentals</span>
                </>
              )}
              <span>&bull;</span>
              <span>{dataSource.fsboListings} FSBO listings</span>
              {dataSource.location !== 'All Areas' && (
                <>
                  <span>&bull;</span>
                  <Badge variant="outline" className="text-xs"><MapPin className="w-3 h-3 mr-1" />{dataSource.location}</Badge>
                </>
              )}
            </>
          ) : (
            <span>Centris PDF data • {globalStats?.region || 'Quebec'} • {globalStats?.period || 'recent'}</span>
          )}
        </div>
      )}

      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard label="Median Sale Price" value={hasData ? formatK(displayStats?.medianSalePrice ?? displayStats?.medianListPrice ?? 0) : '—'} change={statsView === 'broker' ? liveStats?.priceChangePercent : undefined} icon={DollarSign} loading={loadingStats} />
        <StatsCard label="Active Listings" value={hasData ? String(displayStats?.totalActiveListings ?? displayStats?.activeListings ?? 0) : '0'} subtext={statsView === 'broker' ? `${liveStats?.newListingsThisMonth || 0} new this month` : (displayStats?.newListings ? `${displayStats.newListings} new` : undefined)} icon={Building2} loading={loadingStats} positive={!!(displayStats?.totalActiveListings ?? displayStats?.activeListings)} />
        <StatsCard label="Closed Sales" value={hasData ? String(displayStats?.closedSales ?? 0) : '0'} subtext={hasData && (displayStats?.medianSoldPrice ?? displayStats?.medianSalePrice) ? `Median ${formatK(displayStats.medianSoldPrice ?? displayStats.medianSalePrice)}` : undefined} icon={Target} loading={loadingStats} positive={!!displayStats?.closedSales} />
        <StatsCard label="Days on Market" value={hasData && (displayStats?.domMedian > 0 || displayStats?.domAvg > 0) ? `${displayStats?.domMedian || displayStats?.domAvg}` : '—'} subtext={hasData && displayStats?.domAvg > 0 ? `Avg ${displayStats.domAvg} days` : undefined} icon={Clock} loading={loadingStats} />
        <StatsCard label="Price / Sq Ft" value={hasData && (displayStats?.pricePerSqft ?? 0) > 0 ? `$${displayStats!.pricePerSqft}` : '—'} icon={Layers} loading={loadingStats} />
        <StatsCard label="Months of Supply" value={hasData && (displayStats?.monthsOfSupply ?? 0) > 0 ? `${displayStats!.monthsOfSupply}` : '—'} subtext={displayStats?.monthsOfSupply ? (displayStats.monthsOfSupply < 3 ? "Seller's market" : displayStats.monthsOfSupply > 6 ? "Buyer's market" : 'Balanced') : undefined} icon={Activity} loading={loadingStats} />
      </div>

      {/* FSBO & Portfolio Value Bar — broker only */}
      {hasData && statsView === 'broker' && liveStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Portfolio Value</p>
                  <p className="text-2xl font-bold">{formatK(liveStats!.totalActiveValue)}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10"><DollarSign className="w-6 h-6 text-emerald-500" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">FSBO Opportunities</p>
                  <p className="text-2xl font-bold">{liveStats!.fsboActive} <span className="text-sm font-normal text-muted-foreground">of {liveStats!.fsboListings} total</span></p>
                </div>
                <div className="p-3 rounded-xl bg-orange-500/10"><Search className="w-6 h-6 text-orange-500" /></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">List-to-Sale Ratio</p>
                  <p className="text-2xl font-bold">{liveStats!.listToSaleRatio > 0 ? `${(liveStats!.listToSaleRatio * 100).toFixed(1)}%` : '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10"><TrendingUp className="w-6 h-6 text-blue-500" /></div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Price Trends</CardTitle>
            <CardDescription>{statsView === 'broker' ? 'Median & average prices from your portfolio (12 months)' : 'Median & average prices from Quebec MLS / Centris (12 months)'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? <ChartLoader /> : priceChartData.filter((d) => d.median > 0).length === 0 ? (
              <EmptyChart message="Add listings with prices to see trends" />
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

        {/* Inventory & Sales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> Inventory & Sales</CardTitle>
            <CardDescription>{scope === 'broker' ? 'Your broker listings vs closed sales (12 months)' : 'All MLS new listings vs closed sales (12 months)'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? <ChartLoader /> : inventoryChartData.filter((d) => d.newListings > 0 || d.closedSales > 0).length === 0 ? (
              <EmptyChart message="Listing activity will appear here" />
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

        {/* Days on Market */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Days on Market</CardTitle>
            <CardDescription>{scope === 'broker' ? 'Median DOM for your broker listings (12 months)' : 'Median DOM across all MLS listings (12 months)'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? <ChartLoader /> : domChartData.filter((d) => d.dom > 0).length === 0 ? (
              <EmptyChart message="DOM trends will appear with listing data" />
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

        {/* Portfolio Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PieIcon className="h-5 w-5" /> {scope === 'broker' ? 'Portfolio Breakdown' : 'Market Breakdown'}</CardTitle>
            <CardDescription>{scope === 'broker' ? 'Your broker listings by status' : 'All MLS listings by status'}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? <ChartLoader /> : pieData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <PieIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No listings yet.</p>
                <Link href="/dashboard/real-estate/listings" className="text-primary text-sm hover:underline">Add your first listing</Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_COLORS[entry.name] || PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property Type & Price Distribution */}
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {statsView === 'broker' && liveStats!.typeBreakdown?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5" /> Property Types</CardTitle>
                <CardDescription>{scope === 'broker' ? 'Your broker listings by type' : 'All MLS listings by type'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={Array.isArray(liveStats?.typeBreakdown) ? liveStats!.typeBreakdown.map((t) => ({ ...t, type: t.type.replace(/_/g, ' ') })) : []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="type" type="category" className="text-xs" width={120} />
                    <Tooltip />
                    <Bar dataKey="count" name="Listings" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {statsView === 'broker' && liveStats!.priceDistribution?.filter((p) => p.count > 0).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Price Distribution</CardTitle>
                <CardDescription>{scope === 'broker' ? 'Your broker listings by price range' : 'All MLS listings by price range'}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={liveStats!.priceDistribution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="range" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" name="Listings" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Market Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Market Reports</CardTitle>
          <CardDescription>AI-generated market reports. Publish to your Secret Properties page to capture leads.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? <ChartLoader /> : marketReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No market reports yet.</p>
              <p className="text-sm mt-1">Create reports via the AI assistant or Market Report generator.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[320px] overflow-y-auto">
              {Array.isArray(marketReports) && marketReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{report.title}</p>
                    <p className="text-sm text-muted-foreground">{report.region} &bull; {report.type} &bull; {format(new Date(report.createdAt), 'MMM d, yyyy')}</p>
                    {report.executiveSummary && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{report.executiveSummary}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => publishToSecretProperties(report)} disabled={!websiteId || publishingId === report.id} className="ml-4 shrink-0">
                    {publishingId === report.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Share2 className="h-4 w-4 mr-2" />Publish</>}
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

function StatsCard({ label, value, change, subtext, icon: Icon, loading, positive }: {
  label: string; value: string; change?: number; subtext?: string; icon: any; loading: boolean; positive?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className={`text-2xl font-bold ${value === '—' || value === '0' ? 'text-muted-foreground' : ''}`}>{value}</p>
            {change !== undefined && change !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(change)}% vs prior period
              </div>
            )}
            {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ChartLoader() {
  return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <BarChart3 className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
