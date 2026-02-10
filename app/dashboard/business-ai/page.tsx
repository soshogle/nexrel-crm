/**
 * Unified AI Brain Dashboard Page
 * Voice Assistant Mode + Analytical Dashboard Mode
 * Revolutionary business intelligence with voice and analytical capabilities
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AIBrainVoiceAgentInline } from '@/components/dashboard/ai-brain-voice-agent-inline';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  BarChart3,
  Activity,
  Zap,
  Mic,
  RefreshCw,
  Loader2,
  Target,
  Sparkles,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComprehensiveBrainData } from '@/lib/ai-brain-enhanced-service';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface GeneralInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'trend' | 'action' | 'prediction';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  actionable: boolean;
  suggestedActions?: string[];
  affectedEntities?: {
    leads?: number;
    deals?: number;
    tasks?: number;
  };
  metrics?: {
    current: number;
    target: number;
    unit: string;
  };
  timestamp: string;
}

interface PredictiveAnalytics {
  nextWeekForecast: {
    newLeads: { predicted: number; confidence: number };
    dealConversions: { predicted: number; confidence: number };
    revenue: { predicted: number; confidence: number; currency: string };
  };
  nextMonthForecast: {
    newLeads: { predicted: number; confidence: number };
    dealConversions: { predicted: number; confidence: number };
    revenue: { predicted: number; confidence: number; currency: string };
  };
  growthTrend: 'accelerating' | 'steady' | 'declining' | 'volatile';
  seasonalPatterns: string[];
}

interface WorkflowRecommendation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  expectedImpact: string;
  automatable: boolean;
  priority: 'high' | 'medium' | 'low';
}

export default function BusinessAIPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'voice' | 'dashboard'>(() => {
    const modeParam = searchParams?.get('mode');
    return modeParam === 'dashboard' ? 'dashboard' : 'voice';
  });
  
  // Voice Assistant Mode State
  const [healthScore, setHealthScore] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [crmAgentId, setCrmAgentId] = useState<string | null>(null);
  const [agentLoading, setAgentLoading] = useState(true);
  
  // Visualization state for voice agent queries (updated via events from global agent)
  const [crmStatistics, setCrmStatistics] = useState<any>(null);
  const [showVisualizations, setShowVisualizations] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<any[]>([]);
  
  // Debug: Log when statistics change
  useEffect(() => {
    if (crmStatistics) {
      console.log('📊 [AI Brain Page] CRM Statistics updated:', crmStatistics);
      console.log('📊 [AI Brain Page] Show visualizations:', showVisualizations);
    }
  }, [crmStatistics, showVisualizations]);
  
  // Listen for visualization updates from global AI Brain voice agent
  useEffect(() => {
    const handleVisualizationUpdate = (event: CustomEvent) => {
      console.log('📊 [AI Brain Page] Received visualization update:', event.detail);
      console.log('📊 [AI Brain Page] Statistics data:', event.detail?.statistics);
      if (event.detail?.statistics) {
        console.log('✅ [AI Brain Page] Setting statistics and showing visualizations');
        setCrmStatistics(event.detail.statistics);
        setShowVisualizations(true);
        // Force scroll to visualizations
        setTimeout(() => {
          const visualizationElement = document.querySelector('[data-visualization-section]');
          if (visualizationElement) {
            visualizationElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      } else {
        console.warn('⚠️ [AI Brain Page] Event received but no statistics in detail:', event.detail);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('ai-brain-visualization-update', handleVisualizationUpdate as EventListener);
      return () => {
        window.removeEventListener('ai-brain-visualization-update', handleVisualizationUpdate as EventListener);
      };
    }
  }, []);
  
  // Analytical Dashboard Mode State
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveBrainData | null>(null);
  const [detailedInsights, setDetailedInsights] = useState<GeneralInsight[]>([]);
  const [enhancedPredictions, setEnhancedPredictions] = useState<PredictiveAnalytics | null>(null);
  const [workflowRecommendations, setWorkflowRecommendations] = useState<WorkflowRecommendation[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      if (mode === 'voice') {
        loadBusinessData();
        // Load and show stats/charts by default when Voice tab is active
        fetch('/api/crm-voice-agent/functions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ function_name: 'get_statistics', parameters: {} }),
        })
          .then((r) => r.ok ? r.json() : null)
          .then((data) => {
            if (data?.success && data?.statistics) {
              setCrmStatistics(data.statistics);
              setShowVisualizations(true);
            }
          })
          .catch(() => {});
        setAgentLoading(false);
      } else {
        loadAnalyticalDashboardData();
      }
    }
  }, [session, mode]);

  const loadBusinessData = async () => {
    try {
      const response = await fetch('/api/business-ai/health');
      if (response.ok) {
        const data = await response.json();
        setHealthScore(data.healthScore);
        setPredictions(data.predictions || []);
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error('Failed to load business data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticalDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [insightsRes, predictionsRes, workflowsRes, comprehensiveRes] = await Promise.all([
        fetch('/api/ai-brain/insights').catch(err => ({ ok: false, json: () => Promise.resolve({ success: false, error: err.message }) })),
        fetch('/api/ai-brain/predictions').catch(err => ({ ok: false, json: () => Promise.resolve({ success: false, error: err.message }) })),
        fetch('/api/ai-brain/workflows').catch(err => ({ ok: false, json: () => Promise.resolve({ success: false, error: err.message }) })),
        fetch('/api/ai-brain/comprehensive').catch(err => ({ ok: false, json: () => Promise.resolve({ success: false, error: err.message }) })),
      ]);

      const insightsData = await insightsRes.json();
      const predictionsData = await predictionsRes.json();
      const workflowsData = await workflowsRes.json();
      const comprehensiveData = await comprehensiveRes.json();

      if (insightsData.success) setDetailedInsights(insightsData.insights || []);
      if (predictionsData.success) setEnhancedPredictions(predictionsData.predictions);
      if (workflowsData.success) setWorkflowRecommendations(workflowsData.workflows || []);
      if (comprehensiveData.success) {
        setComprehensiveData(comprehensiveData.data);
      } else {
        console.error('[AI Brain] Comprehensive data failed:', comprehensiveData.error);
      }
    } catch (error: any) {
      console.error('[AI Brain] Error fetching analytical data:', error);
      toast.error('Failed to load analytical insights');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh for dashboard mode
  useEffect(() => {
    if (mode === 'dashboard') {
      const interval = setInterval(() => {
        loadAnalyticalDashboardData();
      }, 30000); // Every 30 seconds
      return () => clearInterval(interval);
    }
  }, [mode, loadAnalyticalDashboardData]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getHealthEmoji = (score: number) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    return '🔴';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-5 w-5" />;
      case 'risk':
        return <AlertCircle className="h-5 w-5" />;
      case 'trend':
        return <BarChart3 className="h-5 w-5" />;
      case 'action':
        return <Zap className="h-5 w-5" />;
      case 'prediction':
        return <Target className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading && !healthScore && !comprehensiveData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Brain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 relative overflow-hidden">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 space-y-6 p-6">
        {/* Header with Tab Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent drop-shadow-sm">
              <Brain className="h-10 w-10 text-purple-600 animate-pulse" />
              AI Brain Intelligence
            </h1>
            <p className="text-gray-600 mt-2 text-lg">
              {mode === 'voice' 
                ? 'Your revolutionary business brain - Ask anything, get instant insights'
                : 'Comprehensive analytical dashboard - Deep insights and predictions'
              }
            </p>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-3">
            {mode === 'dashboard' && (
              <Button
                onClick={loadAnalyticalDashboardData}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
                className="bg-white/80 backdrop-blur-sm border-purple-200"
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            )}
          </div>
        </div>

        {/* CRM Statistics Visualizations - Display right under header */}
        {showVisualizations && crmStatistics && (
          <Card 
            data-visualization-section
            className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                CRM Statistics Visualization
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowVisualizations(false);
                  setCrmStatistics(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-white/50 rounded-lg border border-purple-200">
                    <p className="text-sm text-gray-600 mb-1">Total Leads</p>
                    <p className="text-3xl font-bold text-purple-600">{crmStatistics.totalLeads}</p>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg border border-green-200">
                    <p className="text-sm text-gray-600 mb-1">Open Deals</p>
                    <p className="text-3xl font-bold text-green-600">{crmStatistics.openDeals}</p>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-blue-600">${crmStatistics.totalRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="text-center p-4 bg-white/50 rounded-lg border border-orange-200">
                    <p className="text-sm text-gray-600 mb-1">Campaigns</p>
                    <p className="text-3xl font-bold text-orange-600">{crmStatistics.totalCampaigns}</p>
                  </div>
                </div>

                {/* Enhanced Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Revenue Line Chart */}
                  {crmStatistics.monthlyRevenue && (
                    <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                          {crmStatistics.comparisonData ? 'Sales Comparison (Last 7 Months)' : 'Monthly Revenue Trend'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart 
                            data={Object.entries(crmStatistics.monthlyRevenue).map(([month, revenue]) => ({
                              month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short' }),
                              current: revenue as number,
                              ...(crmStatistics.comparisonData?.monthlyRevenue && {
                                previous: crmStatistics.comparisonData.monthlyRevenue[month] || 0,
                              }),
                            }))}
                            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                          >
                            <defs>
                              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                              </linearGradient>
                              {crmStatistics.comparisonData && (
                                <linearGradient id="previousGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8}/>
                                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1}/>
                                </linearGradient>
                              )}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                            <XAxis 
                              dataKey="month" 
                              stroke="#6b7280"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis 
                              stroke="#6b7280"
                              fontSize={12}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(value) => `$${value.toLocaleString()}`}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                              }}
                              formatter={(value: any) => `$${Number(value).toLocaleString()}`}
                            />
                            <Legend />
                            <Line
                              type="monotone"
                              dataKey="current"
                              stroke="#8b5cf6"
                              strokeWidth={3}
                              dot={{ fill: '#8b5cf6', r: 4 }}
                              activeDot={{ r: 6 }}
                              name="Current Period"
                              animationDuration={1000}
                            />
                            {crmStatistics.comparisonData && (
                              <Line
                                type="monotone"
                                dataKey="previous"
                                stroke="#a78bfa"
                                strokeWidth={3}
                                dot={{ fill: '#a78bfa', r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Previous Period"
                                animationDuration={1000}
                              />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* CRM Metrics Pie Chart */}
                  <Card className="border-2 border-pink-200/50 shadow-xl bg-gradient-to-br from-white/95 to-pink-50/30 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        CRM Metrics Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Leads', value: crmStatistics.totalLeads },
                              { name: 'Deals', value: crmStatistics.totalDeals },
                              { name: 'Open Deals', value: crmStatistics.openDeals },
                              { name: 'Campaigns', value: crmStatistics.totalCampaigns },
                            ].filter(item => item.value > 0)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            animationDuration={1000}
                            animationBegin={0}
                          >
                            {[
                              { name: 'Leads', value: crmStatistics.totalLeads },
                              { name: 'Deals', value: crmStatistics.totalDeals },
                              { name: 'Open Deals', value: crmStatistics.openDeals },
                              { name: 'Campaigns', value: crmStatistics.totalCampaigns },
                            ].filter(item => item.value > 0).map((entry, index) => {
                              const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={COLORS[index % COLORS.length]}
                                  stroke="#fff"
                                  strokeWidth={2}
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => (
                              <span className="text-sm text-gray-700">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Leads List */}
                {crmStatistics.recentLeads && crmStatistics.recentLeads.length > 0 && (
                  <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-blue-50/30 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Recent Leads
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {crmStatistics.recentLeads.slice(0, 5).map((lead: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white/50 rounded-lg">
                            <div>
                              <p className="font-semibold text-sm">{lead.name}</p>
                              <p className="text-xs text-gray-500">{lead.status}</p>
                            </div>
                            <Badge variant="outline">{new Date(lead.createdAt).toLocaleDateString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(value) => setMode(value as 'voice' | 'dashboard')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white/80 backdrop-blur-sm border-purple-200">
            <TabsTrigger value="voice" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Mic className="h-4 w-4" />
              Voice Assistant
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <BarChart3 className="h-4 w-4" />
              Analytical Dashboard
            </TabsTrigger>
          </TabsList>

          {/* Voice Assistant Mode */}
          <TabsContent value="voice" className="space-y-6 mt-6">
            {/* AI Brain Voice Agent - Rendered directly on this page for proper display */}
            <AIBrainVoiceAgentInline />

            {/* Health Score Card */}
            {healthScore && (
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    Business Health Score
                  </CardTitle>
                  <CardDescription>
                    Overall business performance indicator
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={cn(
                        'text-6xl font-bold mb-2',
                        getHealthColor(healthScore.overall)
                      )}>
                        {healthScore.overall}
                      </div>
                      <div className="text-2xl">
                        {getHealthEmoji(healthScore.overall)}
                      </div>
                      <p className="text-sm text-gray-600 mt-2">out of 100</p>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <Badge variant="outline">{healthScore.revenue}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Pipeline</span>
                        <Badge variant="outline">{healthScore.pipeline}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Customers</span>
                        <Badge variant="outline">{healthScore.customers}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Operations</span>
                        <Badge variant="outline">{healthScore.operations}</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Alerts */}
                  {healthScore.alerts && healthScore.alerts.length > 0 && (
                    <div className="mt-6 space-y-2">
                      <h4 className="text-sm font-semibold">Alerts</h4>
                      {healthScore.alerts.slice(0, 3).map((alert: any, index: number) => (
                        <div
                          key={index}
                          className={cn(
                            'flex items-start gap-2 p-3 rounded-lg text-sm',
                            alert.type === 'critical' ? 'bg-red-50 text-red-800' :
                            alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                            alert.type === 'success' ? 'bg-green-50 text-green-800' :
                            'bg-blue-50 text-blue-800'
                          )}
                        >
                          {alert.type === 'critical' && <AlertCircle className="h-4 w-4 mt-0.5" />}
                          {alert.type === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5" />}
                          <span>{alert.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Predictions & Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Predictions */}
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Predictions
                  </CardTitle>
                  <CardDescription>
                    AI-powered forecasts based on current trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {predictions.length > 0 ? (
                    <div className="space-y-4">
                      {predictions.map((prediction, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-white/50 backdrop-blur-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm capitalize">
                              {prediction.metric.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <Badge variant="outline">
                              {prediction.confidence}% confidence
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">
                            {(prediction.metric === 'revenue' || prediction.metric === 'dealValue')
                              ? `$${prediction.predictedValue.toLocaleString()}`
                              : prediction.predictedValue.toLocaleString()}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">
                            {prediction.timeframe}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No predictions available yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Insights */}
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-pink-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600" />
                    Insights & Recommendations
                  </CardTitle>
                  <CardDescription>
                    Actionable intelligence for your business
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.length > 0 ? (
                    <div className="space-y-4">
                      {insights.map((insight, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-white/50 backdrop-blur-sm">
                          <div className="flex items-start gap-2 mb-2">
                            {insight.type === 'opportunity' && <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />}
                            {insight.type === 'risk' && <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />}
                            {insight.type === 'trend' && <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5" />}
                            {insight.type === 'recommendation' && <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5" />}
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">{insight.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                              {insight.actionItems && insight.actionItems.length > 0 && (
                                <ul className="mt-2 space-y-1">
                                  {insight.actionItems.slice(0, 2).map((item: string, i: number) => (
                                    <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                                      <span className="w-1 h-1 bg-purple-600 rounded-full" />
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No insights available yet</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytical Dashboard Mode */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Core Metrics Cards */}
            {comprehensiveData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-purple-100 text-sm mb-1">Overall Health</p>
                        <p className="text-3xl font-bold">{comprehensiveData.core.overallHealth}</p>
                      </div>
                      <Activity className="h-8 w-8 text-purple-200 animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-100 text-sm mb-1">Total Revenue</p>
                        <p className="text-2xl font-bold">${comprehensiveData.core.keyMetrics.totalRevenue.toLocaleString()}</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-blue-100 text-sm mb-1">Active Leads</p>
                        <p className="text-3xl font-bold">{comprehensiveData.core.keyMetrics.activeLeads}</p>
                      </div>
                      <Brain className="h-8 w-8 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-100 text-sm mb-1">Open Deals</p>
                        <p className="text-3xl font-bold">{comprehensiveData.core.keyMetrics.openDeals}</p>
                      </div>
                      <Target className="h-8 w-8 text-orange-200" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Detailed Insights */}
            {detailedInsights.length > 0 && (
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600 animate-pulse" />
                    Comprehensive Insights
                  </CardTitle>
                  <CardDescription>
                    AI-powered analysis with priority and confidence scores
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-4">
                    {detailedInsights.map((insight) => (
                      <Card
                        key={insight.id}
                        className={cn(
                          'border-2 transition-all duration-300 hover:shadow-xl cursor-pointer backdrop-blur-sm bg-white/80',
                          expandedInsight === insight.id 
                            ? 'border-purple-400 shadow-xl scale-[1.02] bg-white/95' 
                            : 'border-gray-200/50 hover:border-purple-300/50'
                        )}
                        onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div className={cn(
                              'p-3 rounded-lg',
                              insight.type === 'opportunity' ? 'bg-green-100' :
                              insight.type === 'risk' ? 'bg-red-100' :
                              insight.type === 'trend' ? 'bg-blue-100' :
                              'bg-purple-100'
                            )}>
                              {getInsightIcon(insight.type)}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold text-base">{insight.title}</h4>
                                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                  <Badge className={getPriorityColor(insight.priority)}>
                                    {insight.priority} priority
                                  </Badge>
                                  <Badge variant="outline">
                                    {insight.confidence}% confidence
                                  </Badge>
                                </div>
                              </div>
                              
                              {expandedInsight === insight.id && (
                                <div className="mt-4 space-y-3 pt-4 border-t">
                                  <div>
                                    <p className="text-sm font-medium text-gray-700 mb-2">Impact:</p>
                                    <p className="text-sm text-gray-600">{insight.impact}</p>
                                  </div>
                                  
                                  {insight.affectedEntities && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Affected:</p>
                                      <div className="flex gap-4 text-sm">
                                        {insight.affectedEntities.leads && (
                                          <span className="text-gray-600">{insight.affectedEntities.leads} leads</span>
                                        )}
                                        {insight.affectedEntities.deals && (
                                          <span className="text-gray-600">{insight.affectedEntities.deals} deals</span>
                                        )}
                                        {insight.affectedEntities.tasks && (
                                          <span className="text-gray-600">{insight.affectedEntities.tasks} tasks</span>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {insight.metrics && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Metrics:</p>
                                      <div className="flex items-center gap-4">
                                        <span className="text-sm text-gray-600">
                                          Current: {insight.metrics.current}{insight.metrics.unit}
                                        </span>
                                        <span className="text-sm text-gray-600">
                                          Target: {insight.metrics.target}{insight.metrics.unit}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</p>
                                      <ul className="space-y-1">
                                        {insight.suggestedActions.map((action, idx) => (
                                          <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                                            <ChevronRight className="h-3 w-3 text-purple-600" />
                                            {action}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enhanced Predictions */}
            {enhancedPredictions && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-2xl" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                      Next Week Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium">New Leads</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-purple-600">
                            {enhancedPredictions.nextWeekForecast.newLeads.predicted}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextWeekForecast.newLeads.confidence}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">Deal Conversions</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">
                            {enhancedPredictions.nextWeekForecast.dealConversions.predicted}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextWeekForecast.dealConversions.confidence}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">Revenue</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">
                            {enhancedPredictions.nextWeekForecast.revenue.currency}
                            {enhancedPredictions.nextWeekForecast.revenue.predicted.toLocaleString()}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextWeekForecast.revenue.confidence}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-pink-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      Next Month Forecast
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative z-10 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <span className="text-sm font-medium">New Leads</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-purple-600">
                            {enhancedPredictions.nextMonthForecast.newLeads.predicted}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextMonthForecast.newLeads.confidence}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <span className="text-sm font-medium">Deal Conversions</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-green-600">
                            {enhancedPredictions.nextMonthForecast.dealConversions.predicted}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextMonthForecast.dealConversions.confidence}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <span className="text-sm font-medium">Revenue</span>
                        <div className="text-right">
                          <span className="text-lg font-bold text-blue-600">
                            {enhancedPredictions.nextMonthForecast.revenue.currency}
                            {enhancedPredictions.nextMonthForecast.revenue.predicted.toLocaleString()}
                          </span>
                          <Badge variant="outline" className="ml-2">
                            {enhancedPredictions.nextMonthForecast.revenue.confidence}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {enhancedPredictions.growthTrend && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-1">Growth Trend:</p>
                        <Badge className={cn(
                          enhancedPredictions.growthTrend === 'accelerating' ? 'bg-green-600' :
                          enhancedPredictions.growthTrend === 'steady' ? 'bg-blue-600' :
                          enhancedPredictions.growthTrend === 'declining' ? 'bg-red-600' :
                          'bg-yellow-600'
                        )}>
                          {enhancedPredictions.growthTrend}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Workflow Recommendations */}
            {workflowRecommendations.length > 0 && (
              <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-blue-50/30 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-purple-600 animate-pulse" />
                    Workflow Recommendations
                  </CardTitle>
                  <CardDescription>
                    AI-suggested workflows to automate and optimize your business
                  </CardDescription>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-4">
                    {workflowRecommendations.map((workflow) => (
                      <Card key={workflow.id} className="border border-gray-200/50 hover:border-purple-300/50 transition-all duration-300 hover:shadow-lg bg-white/80 backdrop-blur-sm">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{workflow.name}</h4>
                                <Badge className={getPriorityColor(workflow.priority)}>
                                  {workflow.priority}
                                </Badge>
                                {workflow.automatable && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                    Automatable
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                              <div className="space-y-1 mb-2">
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Trigger:</span> {workflow.trigger}
                                </p>
                                <p className="text-xs text-gray-500">
                                  <span className="font-medium">Expected Impact:</span> {workflow.expectedImpact}
                                </p>
                              </div>
                              {workflow.actions.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 mb-1">Actions:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {workflow.actions.map((action, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {action}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
