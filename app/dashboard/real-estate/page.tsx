'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  Home,
  MapPin,
  Clock,
  Target,
  Zap,
  Brain,
  Mic,
  FileText,
  PresentationIcon,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sparkles,
  RefreshCw,
  Bell,
  Settings,
  LayoutDashboard,
  ChevronRight,
  Star,
  TrendingDown,
  LineChart,
  PieChart,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Megaphone,
  Calculator,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { CMAPanel } from '@/components/real-estate/cma-panel';
import { VoiceAIPanel } from '@/components/real-estate/voice-ai-panel';
import { PresentationGenerator } from '@/components/real-estate/presentation-generator';
import { MarketInsightsWidget } from '@/components/real-estate/market-insights-widget';
import { FSBOLeadsWidget } from '@/components/real-estate/fsbo-leads-widget';
import { StaleListingsWidget } from '@/components/real-estate/stale-listings-widget';

import { AttractionEngine } from '@/components/real-estate/attraction-engine';
import { PropertyEvaluationPanel } from '@/components/real-estate/property-evaluation-panel';

interface MarketStat {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
}

interface ActivityItem {
  id: string;
  type: 'listing' | 'price' | 'cma' | 'fsbo' | 'diagnostic';
  message: string;
  createdAt: string;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: any;
  href?: string;
  color: string;
  gradient: string;
}

export default function RealEstateDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const fetchDashboardData = async () => {
      try {
        const [fsboRes, activityRes, marketRes, atRiskRes] = await Promise.all([
          fetch('/api/real-estate/fsbo'),
          fetch('/api/real-estate/activity'),
          fetch('/api/real-estate/market-stats?limit=24'),
          fetch('/api/real-estate/analytics/at-risk'),
        ]);

        const fsboData = fsboRes.ok ? await fsboRes.json() : { total: 0 };
        const activityData = activityRes.ok ? await activityRes.json() : { activities: [] };
        const marketData = marketRes.ok ? await marketRes.json() : { liveStats: {} };
        const atRiskData = atRiskRes.ok ? await atRiskRes.json() : { summary: { highRisk: 0 } };

        const live = marketData.liveStats || {};
        const monthlyTrends = Array.isArray(marketData.monthlyTrends) ? marketData.monthlyTrends : [];
        const lastTrend = monthlyTrends[monthlyTrends.length - 1];
        const prevTrend = monthlyTrends[monthlyTrends.length - 2];

        const pct = (current: number, previous: number) => {
          if (!previous || previous <= 0) return 0;
          return Math.round(((current - previous) / previous) * 1000) / 10;
        };

        const activeChange = lastTrend && prevTrend ? pct(lastTrend.newListings || 0, prevTrend.newListings || 0) : 0;
        const domChange = lastTrend && prevTrend ? pct(lastTrend.medianDom || 0, prevTrend.medianDom || 0) : 0;
        const fsboTrend = lastTrend && prevTrend ? pct(lastTrend.fsboNew || 0, prevTrend.fsboNew || 0) : 0;

        const formatPrice = (p: number) => {
          if (!p) return '—';
          if (p >= 1000000) return `$${(p / 1000000).toFixed(1)}M`;
          if (p >= 1000) return `$${Math.round(p / 1000)}K`;
          return `$${p.toLocaleString()}`;
        };

        setMarketStats([
          { label: 'Active Listings', value: live.totalActiveListings > 0 ? String(live.totalActiveListings) : String(live.activeListings || 0), change: activeChange, trend: activeChange > 0 ? 'up' : activeChange < 0 ? 'down' : 'neutral', icon: Building2 },
          { label: 'Median Price', value: formatPrice(live.medianSalePrice), change: live.priceChangePercent || 0, trend: (live.priceChangePercent || 0) > 0 ? 'up' : (live.priceChangePercent || 0) < 0 ? 'down' : 'neutral', icon: DollarSign },
          { label: 'Days on Market', value: live.domMedian > 0 ? `${live.domMedian}` : (live.domAvg > 0 ? `${live.domAvg}` : '—'), change: domChange, trend: domChange < 0 ? 'up' : domChange > 0 ? 'down' : 'neutral', icon: Clock },
          { label: 'FSBO Leads', value: String(fsboData?.total || live.fsboListings || 0), change: fsboTrend, trend: fsboTrend > 0 ? 'up' : fsboTrend < 0 ? 'down' : 'neutral', icon: Users },
        ]);

        setRecentActivity(Array.isArray(activityData?.activities) ? activityData.activities : []);
        setAlertCount(Number(atRiskData?.summary?.highRisk || 0));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setMarketStats([]);
        setRecentActivity([]);
        setAlertCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [mounted]);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-purple-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    if (type === 'price') return DollarSign;
    if (type === 'cma') return Brain;
    if (type === 'fsbo') return Users;
    if (type === 'diagnostic') return AlertTriangle;
    return Building2;
  };

  const formatRelativeTime = (isoDate: string) => {
    const created = new Date(isoDate).getTime();
    const diffMins = Math.max(0, Math.floor((Date.now() - created) / 60000));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const quickActions: QuickAction[] = [
    {
      id: 'cma',
      label: 'Generate CMA',
      description: 'AI-powered market analysis',
      icon: Brain,
      color: 'text-violet-500',
      gradient: 'from-violet-500/20 to-purple-500/20',
    },
    {
      id: 'voice',
      label: 'Voice AI Call',
      description: 'Automated seller outreach',
      icon: Mic,
      color: 'text-emerald-500',
      gradient: 'from-emerald-500/20 to-teal-500/20',
    },
    {
      id: 'presentation',
      label: 'Create Presentation',
      description: 'Gamma listing presentations',
      icon: PresentationIcon,
      color: 'text-orange-500',
      gradient: 'from-orange-500/20 to-amber-500/20',
    },
    {
      id: 'fsbo',
      label: 'FSBO Leads',
      description: 'Find new FSBO listings',
      icon: Search,
      color: 'text-blue-500',
      gradient: 'from-blue-500/20 to-cyan-500/20',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects - match My Voice Agents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 p-8 space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <span className="text-gray-700">Real Estate</span>
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Command Center
                </span>
              </h1>
              <p className="text-gray-600 mt-1">AI-powered real estate intelligence & automation</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-purple-200 text-gray-700 hover:bg-purple-50">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
              <Badge className="ml-2 bg-red-500/20 text-red-500 border-red-500/30">{alertCount}</Badge>
            </Button>
            <Button variant="outline" size="sm" className="border-purple-200 text-gray-700 hover:bg-purple-50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync MLS
            </Button>
            <Link href="/dashboard/real-estate/settings">
              <Button variant="outline" size="sm" className="border-purple-200 text-gray-700 hover:bg-purple-50">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Market Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {marketStats.map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <div className={`flex items-center gap-1 mt-2 text-sm ${
                    stat.trend === 'up' ? 'text-green-500' :
                    stat.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {stat.change !== 0 ? (
                      <>
                        {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> :
                         stat.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                        {Math.abs(stat.change)}%
                        <span className="text-gray-500 ml-1">vs last month</span>
                      </>
                    ) : (
                      <span className="text-gray-500">No trend delta</span>
                    )}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/20">
                  <stat.icon className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {quickActions.map((action) => (
            <Card
              key={action.id}
              className="p-4 rounded-xl border border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm cursor-pointer hover:border-purple-300 hover:scale-[1.02] transition-all"
              onClick={() => setActiveTab(action.id)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className={`p-4 rounded-xl mb-3 bg-purple-500/20`}>
                  <action.icon className={`w-8 h-8 text-purple-500`} />
                </div>
                <h3 className="font-semibold text-gray-900">{action.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Quick Navigation to Subpages */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-gray-900 text-lg flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
                Quick Navigation
              </CardTitle>
              <CardDescription className="text-gray-600">Access all Real Estate tools and pages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <Link href="/dashboard/real-estate" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <Building2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">RE Hub</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/fsbo-leads" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <Users className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">FSBO Leads</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/cma" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">CMA Tools</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/market-insights" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <BarChart3 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">Market Insights</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/net-sheet" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <DollarSign className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">Seller Net Sheet</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/listings" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <Building2 className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">Listings</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/inquiry-analytics" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">Inquiries</span>
                  </div>
                </Link>
                <Link href="/dashboard/real-estate/analytics" className="group">
                  <div className="p-4 rounded-xl border border-purple-200/50 bg-white/60 hover:border-purple-500 hover:bg-purple-50 transition-all text-center">
                    <LineChart className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <span className="text-sm text-gray-900 font-medium">RE Analytics</span>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 border border-purple-200 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cma" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Brain className="w-4 h-4 mr-2" />
              CMA Engine
            </TabsTrigger>
            <TabsTrigger value="voice" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Mic className="w-4 h-4 mr-2" />
              Voice AI
            </TabsTrigger>
            <TabsTrigger value="presentation" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <PresentationIcon className="w-4 h-4 mr-2" />
              Presentations
            </TabsTrigger>
            <TabsTrigger value="fsbo" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Search className="w-4 h-4 mr-2" />
              FSBO Leads
            </TabsTrigger>
            <TabsTrigger value="attraction" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Target className="w-4 h-4 mr-2" />
              Attraction
            </TabsTrigger>
            <TabsTrigger value="evaluation" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Calculator className="w-4 h-4 mr-2" />
              Property Evaluation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Market Insights */}
              <div className="lg:col-span-2">
                <MarketInsightsWidget />
              </div>

              {/* Recent Activity */}
              <Card className="border-2 border-purple-200/50 bg-white/80 backdrop-blur-sm shadow-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {recentActivity.length === 0 && (
                        <div className="text-sm text-gray-600">No recent activity yet.</div>
                      )}
                      {recentActivity.map((activity) => {
                        const Icon = getActivityIcon(activity.type);
                        return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-purple-200/50 bg-white/60 hover:border-purple-300 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-purple-500/20">
                            <Icon className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 truncate">{activity.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{formatRelativeTime(activity.createdAt)}</p>
                          </div>
                        </div>
                      )})}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Additional Widgets Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FSBOLeadsWidget />
              <StaleListingsWidget />
            </div>

          </TabsContent>

          <TabsContent value="cma">
            <CMAPanel />
          </TabsContent>

          <TabsContent value="voice">
            <VoiceAIPanel />
          </TabsContent>

          <TabsContent value="presentation">
            <PresentationGenerator />
          </TabsContent>

          <TabsContent value="fsbo">
            <FSBOLeadsWidget expanded />
          </TabsContent>

          <TabsContent value="attraction">
            <AttractionEngine />
          </TabsContent>
          <TabsContent value="evaluation">
            <PropertyEvaluationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
