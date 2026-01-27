'use client';

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
import { RealEstateAITeamWidget } from '@/components/ai-employees/real-estate-employees';

interface MarketStat {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
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
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Fetch real data from API
    const fetchDashboardData = async () => {
      try {
        // Fetch FSBO stats
        const fsboRes = await fetch('/api/real-estate/fsbo');
        const fsboData = fsboRes.ok ? await fsboRes.json() : { pagination: { total: 0 } };
        
        // Fetch recent activity from various sources
        const activityRes = await fetch('/api/real-estate/activity');
        const activityData = activityRes.ok ? await activityRes.json() : { activities: [] };

        setMarketStats([
          { label: 'Active Listings', value: '—', change: 0, trend: 'neutral', icon: Building2 },
          { label: 'Median Price', value: '—', change: 0, trend: 'neutral', icon: DollarSign },
          { label: 'Days on Market', value: '—', change: 0, trend: 'neutral', icon: Clock },
          { label: 'FSBO Leads', value: String(fsboData.pagination?.total || 0), change: 0, trend: 'neutral', icon: Users },
        ]);
        
        setRecentActivity(activityData.activities || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set empty data, not sample data
        setMarketStats([
          { label: 'Active Listings', value: '—', change: 0, trend: 'neutral', icon: Building2 },
          { label: 'Median Price', value: '—', change: 0, trend: 'neutral', icon: DollarSign },
          { label: 'Days on Market', value: '—', change: 0, trend: 'neutral', icon: Clock },
          { label: 'FSBO Leads', value: '0', change: 0, trend: 'neutral', icon: Users },
        ]);
        setRecentActivity([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [mounted]);

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      <div className="relative z-10 p-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30">
                <Building2 className="w-8 h-8 text-violet-400" />
              </div>
              Real Estate Command Center
            </h1>
            <p className="text-slate-400 mt-1">AI-powered real estate intelligence & automation</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50">
              <Bell className="w-4 h-4 mr-2" />
              Alerts
              <Badge className="ml-2 bg-red-500/20 text-red-400 border-red-500/30">3</Badge>
            </Button>
            <Button variant="outline" className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync MLS
            </Button>
            <Link href="/dashboard/real-estate/settings">
              <Button variant="outline" className="border-slate-700 bg-slate-800/50 hover:bg-slate-700/50">
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
          {marketStats.map((stat, index) => (
            <Card
              key={stat.label}
              className="relative overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-xl hover:border-slate-600/50 transition-all group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{stat.label}</p>
                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                    <div className={`flex items-center gap-1 mt-2 text-sm ${
                      stat.trend === 'up' ? 'text-emerald-400' :
                      stat.trend === 'down' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> :
                       stat.trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
                      {Math.abs(stat.change)}%
                      <span className="text-slate-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30">
                    <stat.icon className="w-6 h-6 text-violet-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
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
              className={`relative overflow-hidden bg-slate-900/50 border-slate-700/50 backdrop-blur-xl cursor-pointer hover:border-slate-600/50 hover:scale-[1.02] transition-all group`}
              onClick={() => setActiveTab(action.id)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <CardContent className="p-6 flex flex-col items-center text-center relative">
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${action.gradient} border border-slate-700/50 mb-3`}>
                  <action.icon className={`w-8 h-8 ${action.color}`} />
                </div>
                <h3 className="font-semibold text-white">{action.label}</h3>
                <p className="text-sm text-slate-400 mt-1">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-700/50 backdrop-blur-xl p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cma" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300">
              <Brain className="w-4 h-4 mr-2" />
              CMA Engine
            </TabsTrigger>
            <TabsTrigger value="voice" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-300">
              <Mic className="w-4 h-4 mr-2" />
              Voice AI
            </TabsTrigger>
            <TabsTrigger value="presentation" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
              <PresentationIcon className="w-4 h-4 mr-2" />
              Presentations
            </TabsTrigger>
            <TabsTrigger value="fsbo" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-300">
              <Search className="w-4 h-4 mr-2" />
              FSBO Leads
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Market Insights */}
              <div className="lg:col-span-2">
                <MarketInsightsWidget />
              </div>

              {/* Recent Activity */}
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-violet-400" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/30 hover:border-slate-600/50 transition-colors"
                        >
                          <div className="p-2 rounded-lg bg-violet-500/20">
                            <activity.icon className="w-4 h-4 text-violet-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{activity.message}</p>
                            <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                          </div>
                        </div>
                      ))}
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

            {/* AI Team Widget */}
            <div className="mt-6">
              <RealEstateAITeamWidget />
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
        </Tabs>
      </div>
    </div>
  );
}
