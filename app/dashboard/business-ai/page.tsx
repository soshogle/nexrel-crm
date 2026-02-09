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
import { VoiceAIAgent } from '@/components/business-ai/voice-ai-agent';
import { RadialBrainVisualization } from '@/components/ai-brain/radial-brain-visualization';
import { cn } from '@/lib/utils';
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
} from 'lucide-react';
import { toast } from 'sonner';
import type { ComprehensiveBrainData } from '@/lib/ai-brain-enhanced-service';

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
  
  // Analytical Dashboard Mode State
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveBrainData | null>(null);
  const [detailedInsights, setDetailedInsights] = useState<GeneralInsight[]>([]);
  const [enhancedPredictions, setEnhancedPredictions] = useState<PredictiveAnalytics | null>(null);
  const [workflowRecommendations, setWorkflowRecommendations] = useState<WorkflowRecommendation[]>([]);
  const [viewMode, setViewMode] = useState<'radial' | 'traditional'>('radial');
  
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      if (mode === 'voice') {
        loadBusinessData();
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading AI Brain...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tab Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 bg-clip-text text-transparent">
            <Brain className="h-8 w-8 text-purple-600" />
            AI Brain Intelligence
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === 'voice' 
              ? 'Your revolutionary business brain - Ask anything, get instant insights'
              : 'Comprehensive analytical dashboard - Deep insights and predictions'
            }
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex items-center gap-3">
          {mode === 'dashboard' && (
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'radial' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('radial')}
                className={viewMode === 'radial' ? 'bg-purple-600 text-white' : ''}
              >
                <Brain className="h-4 w-4 mr-2" />
                Digital Brain
              </Button>
              <Button
                variant={viewMode === 'traditional' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('traditional')}
                className={viewMode === 'traditional' ? 'bg-purple-600 text-white' : ''}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Traditional
              </Button>
            </div>
          )}
          
          {mode === 'dashboard' && (
            <Button
              onClick={loadAnalyticalDashboardData}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
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

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={(value) => setMode(value as 'voice' | 'dashboard')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="voice" className="gap-2">
            <Mic className="h-4 w-4" />
            Voice Assistant
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytical Dashboard
          </TabsTrigger>
        </TabsList>

        {/* Voice Assistant Mode */}
        <TabsContent value="voice" className="space-y-6 mt-6">
          {/* Health Score Card */}
          {healthScore && (
            <Card className="border-2 border-purple-200">
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
            <Card>
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
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm capitalize">
                            {prediction.metric.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <Badge variant="outline">
                            {prediction.confidence}% confidence
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold text-purple-600">
                          ${prediction.predictedValue.toLocaleString()}
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
            <Card>
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
                      <div key={index} className="border rounded-lg p-4">
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

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Try These Questions</CardTitle>
              <CardDescription>
                Click the voice AI agent in the bottom right corner and ask:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  "How's business?",
                  "What's my revenue this month?",
                  "Show me revenue trends",
                  "Compare this month to last month",
                  "Predict next month's revenue",
                  "What are my top products?",
                  "How many leads do I have?",
                  "What's my conversion rate?",
                  "Show me business insights",
                ].map((question, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="text-left justify-start h-auto py-3"
                    onClick={() => {
                      const event = new CustomEvent('business-ai-query', { detail: { query: question } });
                      window.dispatchEvent(event);
                    }}
                  >
                    <span className="text-sm">{question}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytical Dashboard Mode */}
        <TabsContent value="dashboard" className="space-y-6 mt-6">
          {/* Radial Brain Visualization */}
          {viewMode === 'radial' && comprehensiveData && (
            <Card className="p-6 bg-gradient-to-br from-purple-50/80 via-white/90 to-pink-50/80 border-2 border-purple-200/50 overflow-hidden shadow-2xl backdrop-blur-md relative">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 animate-gradient-xy" />
              
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" />
              
              <div className="relative z-10">
                <RadialBrainVisualization
                  data={comprehensiveData}
                  onDataPointClick={(dataPoint) => {
                    console.log('Data point clicked:', dataPoint);
                    toast.info(`Selected: ${dataPoint.label} - ${dataPoint.value}${dataPoint.unit}`);
                  }}
                />
                
                {/* Futuristic overlay effects */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                </div>
              </div>
            </Card>
          )}

              {/* Traditional View */}
              {viewMode === 'traditional' && (
                <div className="space-y-6">
                  {/* Core Metrics */}
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
                    <CardContent className="space-y-4">
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
                    <CardContent className="space-y-4">
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
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Voice AI Agent is rendered globally in dashboard wrapper */}
    </div>
  );
}
