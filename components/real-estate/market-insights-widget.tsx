'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface MarketMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

interface LiveStats {
  medianSalePrice: number;
  avgSalePrice: number;
  activeListings: number;
  closedSales: number;
  domMedian: number;
  pricePerSqft: number;
  monthsOfSupply: number;
  listToSaleRatio: number;
  priceChangePercent: number;
  fsboListings: number;
  newListingsThisMonth: number;
  totalActiveValue: number;
}

export function MarketInsightsWidget() {
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<MarketMetric[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [dataSource, setDataSource] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      const live: LiveStats = data.liveStats || {};
      setAvailableLocations(data.locations || []);
      setDataSource(data.dataSource);
      setMonthlyTrends(data.monthlyTrends || []);

      const hasData = (live.activeListings || 0) + (live.closedSales || 0) > 0;

      setMetrics(hasData ? [
        { label: 'Median Sale Price', value: formatPrice(live.medianSalePrice || 0), change: live.priceChangePercent || 0, trend: (live.priceChangePercent || 0) > 0 ? 'up' : (live.priceChangePercent || 0) < 0 ? 'down' : 'neutral' },
        { label: 'Avg Days on Market', value: `${live.domMedian || 0} days`, change: 0, trend: 'neutral' },
        { label: 'Active Listings', value: `${live.activeListings || 0}`, change: 0, trend: (live.newListingsThisMonth || 0) > 0 ? 'up' : 'neutral' },
        { label: 'Closed Sales', value: `${live.closedSales || 0}`, change: 0, trend: live.closedSales > 0 ? 'up' : 'neutral' },
        { label: 'Price per Sq Ft', value: live.pricePerSqft > 0 ? `$${live.pricePerSqft}` : 'N/A', change: 0, trend: 'neutral' },
        { label: 'Months of Supply', value: live.monthsOfSupply > 0 ? `${live.monthsOfSupply}` : 'N/A', change: 0, trend: live.monthsOfSupply < 3 ? 'down' : live.monthsOfSupply > 6 ? 'up' : 'neutral' },
      ] : [
        { label: 'Median Sale Price', value: 'No data', change: 0, trend: 'neutral' },
        { label: 'Avg Days on Market', value: 'No data', change: 0, trend: 'neutral' },
        { label: 'Active Listings', value: '0', change: 0, trend: 'neutral' },
        { label: 'Closed Sales', value: '0', change: 0, trend: 'neutral' },
        { label: 'Price per Sq Ft', value: 'No data', change: 0, trend: 'neutral' },
        { label: 'Months of Supply', value: 'No data', change: 0, trend: 'neutral' },
      ]);
    } catch (error) {
      console.error('Error fetching market stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCity, selectedState]);

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

  const trendPrices = monthlyTrends.map((t: any) => t.medianPrice || 0);
  const maxPrice = Math.max(...trendPrices, 1);

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            Market Insights
            <Badge variant="outline" className="ml-2 text-xs border-emerald-500/30 text-emerald-400">LIVE</Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search location..."
                  value={locationQuery}
                  onChange={(e) => { setLocationQuery(e.target.value); setShowLocationDropdown(true); }}
                  onFocus={() => setShowLocationDropdown(true)}
                  className="w-48 pl-9 pr-8 bg-slate-800/50 border-slate-700 text-white text-sm"
                />
                {locationQuery && (
                  <button onClick={() => selectLocation('all')} className="absolute right-2 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-slate-400 hover:text-white" />
                  </button>
                )}
              </div>
              {showLocationDropdown && (
                <div className="absolute z-50 top-full mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
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
                    <div className="px-3 py-2 text-sm text-slate-500">No locations found. Add listings to see locations.</div>
                  )}
                </div>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={fetchData} disabled={isLoading} className="border-slate-700 bg-slate-800/50">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {dataSource && (
          <div className="flex items-center gap-2 mt-2">
            <Database className="w-3 h-3 text-slate-500" />
            <span className="text-xs text-slate-500">
              {dataSource.properties} listings + {dataSource.fsboListings} FSBO
              {dataSource.location !== 'All Areas' && ` in ${dataSource.location}`}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
              <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
              <p className={`text-xl font-bold ${metric.value === 'No data' ? 'text-slate-600' : 'text-white'}`}>{metric.value}</p>
              {metric.change !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
                  {metric.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : metric.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                  {Math.abs(metric.change)}%
                  <span className="text-slate-500 ml-1">vs prev</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Price Trend Chart from real data */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Price Trend (12 Months)</span>
            {metrics[0]?.change !== 0 && (
              <Badge className={`${metrics[0]?.trend === 'up' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                {metrics[0]?.trend === 'up' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {metrics[0]?.change > 0 ? '+' : ''}{metrics[0]?.change}%
              </Badge>
            )}
          </div>
          <div className="h-24 flex items-end gap-1">
            {monthlyTrends.length > 0 ? monthlyTrends.map((t: any, i: number) => {
              const height = maxPrice > 0 ? Math.max((t.medianPrice / maxPrice) * 100, 5) : 5;
              return (
                <div key={i} className="flex-1 relative group cursor-pointer">
                  <div
                    className="w-full bg-gradient-to-t from-violet-500/50 to-violet-500/20 rounded-t transition-all hover:from-violet-500/70 hover:to-violet-500/40"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    {t.month}: {t.medianPrice > 0 ? `$${Math.round(t.medianPrice / 1000)}K` : 'No data'}
                  </div>
                </div>
              );
            }) : (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="flex-1 bg-slate-700/30 rounded-t" style={{ height: '10%' }} />
              ))
            )}
          </div>
          {monthlyTrends.length === 0 && (
            <p className="text-center text-xs text-slate-500 mt-2">Add listings to see price trends</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
