'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MapPin,
  Calendar,
  Database,
  Search,
  X,
  Upload,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface MarketMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  hasData?: boolean;
}

interface LiveStats {
  medianSalePrice: number;
  avgSalePrice: number;
  activeListings: number;
  totalActiveListings?: number;
  closedSales: number;
  domMedian: number;
  domAvg: number;
  pricePerSqft: number;
  monthsOfSupply: number;
  listToSaleRatio: number;
  priceChangePercent: number;
  fsboListings: number;
  rentalListings?: number;
  rentalActive?: number;
  newListingsThisMonth: number;
  totalActiveValue: number;
}

export function MarketInsightsWidget() {
  const { data: session } = useSession();
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MarketMetric[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [globalMonthlyTrends, setGlobalMonthlyTrends] = useState<any[]>([]);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [myStats, setMyStats] = useState<any>(null);
  const [globalMetrics, setGlobalMetrics] = useState<MarketMetric[]>([]);
  const [statsView, setStatsView] = useState<'broker' | 'global'>('broker');
  const [dataSource, setDataSource] = useState<any>(null);
  const [ingesting, setIngesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  const formatPrice = (price: number) => {
    if (price >= 1000000) return `$${(price / 1000000).toFixed(1)}M`;
    if (price >= 1000) return `$${Math.round(price / 1000)}K`;
    return `$${price.toLocaleString()}`;
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCity) params.set('city', selectedCity);
      if (selectedState) params.set('state', selectedState);
      params.set('limit', '24');

      const res = await fetch(`/api/real-estate/market-stats?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      const my: LiveStats = data.myStats || {};
      const global = data.globalStats || null;
      setAvailableLocations(data.locations || []);
      setDataSource(data.dataSource);
      setMonthlyTrends(data.myMonthlyTrends || data.monthlyTrends || []);
      setGlobalMonthlyTrends(data.globalMonthlyTrends || []);
      setGlobalStats(global);
      setMyStats(my);

      const hasMyData = (my.activeCount ?? my.activeListings ?? 0) + (my.soldCount ?? my.closedSales ?? 0) + (my.rentalActive ?? 0) + (my.rentalListings ?? 0) > 0;
      const trends = Array.isArray(data.myMonthlyTrends || data.monthlyTrends) ? (data.myMonthlyTrends || data.monthlyTrends) : [];
      const last = trends[trends.length - 1];
      const prev = trends[trends.length - 2];
      const pct = (current: number, previous: number) => (previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : 0);
      const activeChange = last && prev ? pct(last.newListings || 0, prev.newListings || 0) : 0;
      const domChange = last && prev ? pct(last.medianDom || 0, prev.medianDom || 0) : 0;

      setMetrics(hasMyData ? [
        { label: 'Median Sale Price', value: formatPrice(my.medianSalePrice || my.medianSoldPrice || 0), change: my.priceChangePercent || 0, trend: (my.priceChangePercent || 0) > 0 ? 'up' : (my.priceChangePercent || 0) < 0 ? 'down' : 'neutral', hasData: (my.medianSalePrice || my.medianSoldPrice || 0) > 0 },
        { label: 'Avg Days on Market', value: (my.domMedian > 0 || my.domAvg > 0) ? `${my.domMedian || my.domAvg} days` : '—', change: domChange, trend: domChange < 0 ? 'up' : domChange > 0 ? 'down' : 'neutral', hasData: (my.domMedian > 0 || my.domAvg > 0) },
        { label: 'Active Listings', value: `${my.activeCount ?? my.activeListings ?? 0}`, change: activeChange, trend: activeChange > 0 ? 'up' : activeChange < 0 ? 'down' : 'neutral', hasData: (my.activeCount ?? my.activeListings ?? 0) > 0 },
        { label: 'Closed Sales', value: `${my.soldCount ?? my.closedSales ?? 0}`, change: 0, trend: (my.soldCount ?? my.closedSales ?? 0) > 0 ? 'up' : 'neutral', hasData: (my.soldCount ?? my.closedSales ?? 0) > 0 },
        { label: 'Price per Sq Ft', value: (my.pricePerSqft ?? 0) > 0 ? `$${my.pricePerSqft}` : '—', change: 0, trend: 'neutral', hasData: (my.pricePerSqft ?? 0) > 0 },
        { label: 'Months of Supply', value: (my.monthsOfSupply ?? 0) > 0 ? `${my.monthsOfSupply}` : '—', change: 0, trend: (my.monthsOfSupply ?? 0) < 3 ? 'down' : (my.monthsOfSupply ?? 0) > 6 ? 'up' : 'neutral', hasData: (my.monthsOfSupply ?? 0) > 0 },
      ] : [
        { label: 'Median Sale Price', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Avg Days on Market', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Active Listings', value: '0', change: 0, trend: 'neutral', hasData: false },
        { label: 'Closed Sales', value: '0', change: 0, trend: 'neutral', hasData: false },
        { label: 'Price per Sq Ft', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Months of Supply', value: '—', change: 0, trend: 'neutral', hasData: false },
      ]);

      setGlobalMetrics(global ? [
        { label: 'Median Sale Price', value: formatPrice(global.medianSalePrice || 0), change: 0, trend: 'neutral', hasData: (global.medianSalePrice ?? 0) > 0 },
        { label: 'Avg Days on Market', value: (global.domMedian > 0 || global.domAvg > 0) ? `${global.domMedian || global.domAvg} days` : '—', change: 0, trend: 'neutral', hasData: (global.domMedian ?? global.domAvg ?? 0) > 0 },
        { label: 'Active Listings', value: `${global.activeListings ?? 0}`, change: 0, trend: 'neutral', hasData: (global.activeListings ?? 0) > 0 },
        { label: 'Closed Sales', value: `${global.closedSales ?? 0}`, change: 0, trend: 'neutral', hasData: (global.closedSales ?? 0) > 0 },
        { label: 'Price per Sq Ft', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Months of Supply', value: (global.monthsOfSupply ?? 0) > 0 ? `${global.monthsOfSupply}` : '—', change: 0, trend: 'neutral', hasData: (global.monthsOfSupply ?? 0) > 0 },
      ] : [
        { label: 'Median Sale Price', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Avg Days on Market', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Active Listings', value: '0', change: 0, trend: 'neutral', hasData: false },
        { label: 'Closed Sales', value: '0', change: 0, trend: 'neutral', hasData: false },
        { label: 'Price per Sq Ft', value: '—', change: 0, trend: 'neutral', hasData: false },
        { label: 'Months of Supply', value: '—', change: 0, trend: 'neutral', hasData: false },
      ]);
    } catch (error) {
      console.error('Error fetching market stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, selectedState]);

  const handleIngestPdfs = useCallback(async () => {
    if (!session?.user?.id) return;
    setIngesting(true);
    try {
      const res = await fetch('/api/real-estate/market-stats/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Ingest failed');
      toast.success(data.message || `Ingested ${data.created} records`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to ingest PDFs');
    } finally {
      setIngesting(false);
    }
  }, [session?.user?.id, fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLocationDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectLocation = (loc: string) => {
    if (loc === 'all') {
      setSelectedCity('');
      setSelectedState('');
      setLocationQuery('');
    } else {
      const parts = loc.split(', ');
      setSelectedCity(parts[0] || '');
      setSelectedState(parts[1] || '');
      setLocationQuery(loc);
    }
    setShowLocationDropdown(false);
  };

  const filteredLocations = availableLocations.filter(
    (l) => l.toLowerCase().includes(locationQuery.toLowerCase())
  );

  const displayTrends = statsView === 'broker' ? monthlyTrends : globalMonthlyTrends;
  const trendPrices = displayTrends.map((t: any) => t.medianPrice || 0);
  const maxPrice = Math.max(...trendPrices, 1);

  return (
    <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            Market Insights
            <Badge variant="outline" className="ml-2 text-xs border-emerald-500/30 text-emerald-400">LIVE</Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="Search location..."
                  value={locationQuery}
                  onChange={(e) => { setLocationQuery(e.target.value); setShowLocationDropdown(true); }}
                  onFocus={() => setShowLocationDropdown(true)}
                  className="w-48 pl-9 pr-8 bg-slate-800/50 border-purple-200 text-gray-900 text-sm"
                />
                {locationQuery && (
                  <button onClick={() => selectLocation('all')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-500 hover:text-gray-900" />
                  </button>
                )}
              </div>
              {showLocationDropdown && (
                <div className="absolute z-50 top-full mt-1 w-56 bg-slate-800 border border-purple-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  <button onClick={() => selectLocation('all')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> All Areas
                  </button>
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((loc) => (
                      <button key={loc} onClick={() => selectLocation(loc)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-violet-400" /> {loc}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No locations found. Add listings to see locations.</div>
                  )}
                </div>
              )}
            </div>
            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleIngestPdfs}
                disabled={ingesting || isLoading}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {ingesting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />}
                Ingest PDFs
              </Button>
            )}
            <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="border-purple-200 bg-slate-800/50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex gap-1.5">
            <Button
              variant={statsView === 'broker' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatsView('broker')}
            >
              My Portfolio
            </Button>
            <Button
              variant={statsView === 'global' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setStatsView('global')}
            >
              Quebec Market
            </Button>
          </div>
          {dataSource && (
            <span className="text-xs text-gray-500">
              {statsView === 'broker' ? 'Your listings' : 'Centris MLS'}{dataSource.location !== 'All Areas' && ` • ${dataSource.location}`}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(statsView === 'broker' ? metrics : globalMetrics).map((metric) => (
            <div key={metric.label} className="p-4 rounded-lg bg-white/80 border-2 border-purple-200/50 hover:border-purple-300 transition-colors">
              <p className="text-gray-500 text-sm mb-1">{metric.label}</p>
              <p className={`text-xl font-bold ${metric.hasData === false ? 'text-gray-500' : 'text-gray-900'}`}>{metric.value}</p>
              {metric.change !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-gray-500'}`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : metric.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                  {Math.abs(metric.change)}%
                  <span className="text-gray-500 ml-1">vs prev</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Price Trend Chart from real data */}
        <div className="mt-6 p-4 rounded-lg bg-purple-50/50 border border-purple-200/50">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-sm">Price Trend (12 Months)</span>
            {(statsView === 'broker' ? metrics : globalMetrics)[0]?.change !== 0 && (
              <Badge className={`${(statsView === 'broker' ? metrics : globalMetrics)[0]?.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                {(statsView === 'broker' ? metrics : globalMetrics)[0]?.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {((statsView === 'broker' ? metrics : globalMetrics)[0]?.change ?? 0) > 0 ? '+' : ''}{(statsView === 'broker' ? metrics : globalMetrics)[0]?.change ?? 0}%
              </Badge>
            )}
          </div>
          <div className="h-24 flex items-end gap-1">
            {displayTrends.length > 0 ? displayTrends.map((t: any, i: number) => {
              const height = maxPrice > 0 ? Math.max((t.medianPrice / maxPrice) * 100, 5) : 5;
              return (
                <div key={i} className="flex-1 relative group cursor-pointer">
                  <div
                    className="w-full bg-gradient-to-t from-violet-500/50 to-violet-500/20 rounded-t transition-all hover:from-violet-500/70 hover:to-violet-500/40"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-gray-900 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {t.month}: {t.medianPrice > 0 ? `$${Math.round(t.medianPrice / 1000)}K` : 'No data'}
                  </div>
                </div>
              );
            }) : null}
          </div>
          {displayTrends.length === 0 && (
            <p className="text-center text-xs text-gray-500 mt-2">
              {isSuperAdmin
                ? 'Place Centris PDFs in data/market-reports/ and click Ingest PDFs above'
                : 'Add listings or sync Centris data to see price trends'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
