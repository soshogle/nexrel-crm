'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  DollarSign,
  Home,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  MapPin,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MarketMetric {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
}

export function MarketInsightsWidget() {
  const [selectedArea, setSelectedArea] = useState('all');
  const [timeRange, setTimeRange] = useState('30d');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<MarketMetric[]>([]);

  useEffect(() => {
    setMetrics([
      { label: 'Median Sale Price', value: '$485,000', change: 5.2, trend: 'up' },
      { label: 'Avg Days on Market', value: '24 days', change: -12.5, trend: 'down' },
      { label: 'Active Listings', value: '847', change: 8.3, trend: 'up' },
      { label: 'Closed Sales', value: '156', change: 15.2, trend: 'up' },
      { label: 'Price per Sq Ft', value: '$285', change: 3.1, trend: 'up' },
      { label: 'Inventory Months', value: '2.8', change: -5.4, trend: 'down' },
    ]);
  }, [selectedArea, timeRange]);

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-violet-400" />
            Market Insights
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-40 bg-slate-800/50 border-slate-700 text-white">
                <MapPin className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                <SelectItem value="beverly-hills">Beverly Hills</SelectItem>
                <SelectItem value="santa-monica">Santa Monica</SelectItem>
                <SelectItem value="malibu">Malibu</SelectItem>
                <SelectItem value="west-la">West LA</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-800/50 border-slate-700 text-white">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-slate-700 bg-slate-800/50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors"
            >
              <p className="text-slate-400 text-sm mb-1">{metric.label}</p>
              <p className="text-xl font-bold text-white">{metric.value}</p>
              <div className={`flex items-center gap-1 mt-2 text-sm ${
                metric.trend === 'up' ? 'text-emerald-400' :
                metric.trend === 'down' ? 'text-red-400' : 'text-slate-400'
              }`}>
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : metric.trend === 'down' ? (
                  <ArrowDownRight className="w-4 h-4" />
                ) : null}
                {Math.abs(metric.change)}%
                <span className="text-slate-500 ml-1">vs prev</span>
              </div>
            </div>
          ))}
        </div>

        {/* Mini Chart Placeholder */}
        <div className="mt-6 p-4 rounded-lg bg-slate-800/30 border border-slate-700/30">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400 text-sm">Price Trend (Last 6 Months)</span>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <TrendingUp className="w-3 h-3 mr-1" />
              +5.2%
            </Badge>
          </div>
          <div className="h-24 flex items-end gap-1">
            {[65, 72, 68, 75, 82, 78, 85, 88, 92, 89, 95, 100].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-violet-500/50 to-violet-500/20 rounded-t transition-all hover:from-violet-500/70 hover:to-violet-500/40"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
