'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Target,
  Activity,
  Sparkles,
  RefreshCw,
  Loader2,
  ChevronRight,
  BarChart3,
  Calendar,
  Users,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { RadialBrainVisualization } from './radial-brain-visualization';
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

export function AIBrainDashboard() {
  const [insights, setInsights] = useState<GeneralInsight[]>([]);
  const [predictions, setPredictions] = useState<PredictiveAnalytics | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowRecommendation[]>([]);
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveBrainData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'radial' | 'traditional'>('radial');

  const fetchData = useCallback(async () => {
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

      console.log('[AI Brain Dashboard] Data received:', {
        insights: insightsData.success,
        predictions: predictionsData.success,
        workflows: workflowsData.success,
        comprehensive: comprehensiveData.success,
        comprehensiveDataPoints: comprehensiveData.success ? comprehensiveData.data?.leftHemisphere?.dataPoints?.length : 0,
      });

      if (insightsData.success) setInsights(insightsData.insights || []);
      if (predictionsData.success) setPredictions(predictionsData.predictions);
      if (workflowsData.success) setWorkflows(workflowsData.workflows || []);
      if (comprehensiveData.success) {
        setComprehensiveData(comprehensiveData.data);
        console.log('[AI Brain Dashboard] Comprehensive data set:', {
          coreHealth: comprehensiveData.data?.core?.overallHealth,
          leftPoints: comprehensiveData.data?.leftHemisphere?.dataPoints?.length,
          rightPoints: comprehensiveData.data?.rightHemisphere?.dataPoints?.length,
        });
      } else {
        console.error('[AI Brain Dashboard] Comprehensive data failed:', comprehensiveData.error);
        toast.error('Failed to load comprehensive brain data: ' + (comprehensiveData.error || 'Unknown error'));
      }
    } catch (error: any) {
      console.error('[AI Brain Dashboard] Error fetching AI Brain data:', error);
      toast.error('Failed to load AI insights: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh every 30 seconds for real-time updates
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="h-5 w-5" />;
      case 'risk':
        return <AlertTriangle className="h-5 w-5" />;
      case 'trend':
        return <Activity className="h-5 w-5" />;
      case 'action':
        return <Target className="h-5 w-5" />;
      case 'prediction':
        return <Sparkles className="h-5 w-5" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'risk':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'trend':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'action':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'prediction':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getGrowthTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'steady':
        return <Activity className="h-5 w-5 text-blue-500" />;
      case 'volatile':
        return <Activity className="h-5 w-5 text-yellow-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
            Central AI Brain
          </h2>
          <p className="text-gray-400 mt-1">
            The nervous system of your business - connected to everything, predicting everything
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'radial' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('radial')}
              className={viewMode === 'radial' ? 'bg-purple-600' : ''}
            >
              <Brain className="h-4 w-4 mr-2" />
              Digital Brain
            </Button>
            <Button
              variant={viewMode === 'traditional' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('traditional')}
              className={viewMode === 'traditional' ? 'bg-purple-600' : ''}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Traditional
            </Button>
          </div>
          <Button onClick={fetchData} disabled={isRefreshing} className="gradient-button">
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Radial Brain Visualization */}
      {viewMode === 'radial' && (
        <Card className="p-6 bg-gray-900 border-gray-800 overflow-hidden">
          {comprehensiveData ? (
            <RadialBrainVisualization
              data={comprehensiveData}
              onDataPointClick={(dataPoint) => {
                console.log('Data point clicked:', dataPoint);
                // Could open a detail modal or navigate to related page
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Brain className="h-16 w-16 mb-4 opacity-50 animate-pulse" />
              <p className="text-lg">Loading AI Brain data...</p>
              <p className="text-sm mt-2">Connecting to all business data sources</p>
            </div>
          )}
        </Card>
      )}

      {/* Traditional View - Original Design */}
      {viewMode === 'traditional' && (
        <div className="space-y-6">
          {/* Predictive Analytics */}
          {predictions ? (
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <h3 className="text-xl font-semibold text-white">Predictive Analytics</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Next Week Forecast */}
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Week Forecast
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">New Leads</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextWeekForecast.newLeads.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {predictions.nextWeekForecast.newLeads.predicted}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Conversions</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextWeekForecast.dealConversions.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-white">
                    {predictions.nextWeekForecast.dealConversions.predicted}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Revenue</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextWeekForecast.revenue.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-green-500">
                    ${(predictions.nextWeekForecast.revenue.predicted / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            </div>

            {/* Next Month Forecast */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Month Forecast
              </div>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">New Leads</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextMonthForecast.newLeads.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {predictions.nextMonthForecast.newLeads.predicted}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Conversions</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextMonthForecast.dealConversions.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-white">
                    {predictions.nextMonthForecast.dealConversions.predicted}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Revenue</span>
                    <span className="text-xs text-gray-400">
                      {predictions.nextMonthForecast.revenue.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-green-500">
                    ${(predictions.nextMonthForecast.revenue.predicted / 1000).toFixed(1)}k
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Trend */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="text-sm text-gray-400 mb-3">Growth Trend</div>
              <div className="flex items-center gap-3 mb-4">
                {getGrowthTrendIcon(predictions.growthTrend)}
                <span className="text-2xl font-bold text-white capitalize">
                  {predictions.growthTrend}
                </span>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-gray-400">Seasonal Patterns:</div>
                {predictions.seasonalPatterns.map((pattern, idx) => (
                  <div key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 text-purple-500 mt-0.5" />
                    {pattern}
                  </div>
                ))}
              </div>
            </div>
          </div>
            </Card>
          )}

          {/* General Insights */}
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="text-xl font-semibold text-white">AI-Powered Insights</h3>
              <Badge variant="outline" className="ml-auto text-gray-400">
                {insights.length} insights
              </Badge>
            </div>

            <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="border border-gray-800 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
              onClick={() =>
                setExpandedInsight(expandedInsight === insight.id ? null : insight.id)
              }
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg border ${getInsightColor(insight.type)}`}
                >
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{insight.title}</h4>
                        <Badge
                          variant="outline"
                          className={`${getPriorityColor(insight.priority)} border-0 text-white text-xs`}
                        >
                          {insight.priority}
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="outline" className="border-green-500/20 text-green-500 text-xs">
                            Actionable
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{insight.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 mb-1">Confidence</div>
                      <div className="text-sm font-semibold text-purple-500">{insight.confidence}%</div>
                    </div>
                  </div>

                  {insight.metrics && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                        <span>
                          Current: {insight.metrics.current} {insight.metrics.unit}
                        </span>
                        <span>
                          Target: {insight.metrics.target} {insight.metrics.unit}
                        </span>
                      </div>
                      <Progress
                        value={(insight.metrics.current / insight.metrics.target) * 100}
                        className="h-2"
                      />
                    </div>
                  )}

                  {insight.affectedEntities && (
                    <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                      {insight.affectedEntities.leads !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {insight.affectedEntities.leads} leads
                        </span>
                      )}
                      {insight.affectedEntities.deals !== undefined && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {insight.affectedEntities.deals} deals
                        </span>
                      )}
                      {insight.affectedEntities.tasks !== undefined && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          {insight.affectedEntities.tasks} tasks
                        </span>
                      )}
                    </div>
                  )}

                  <div className="text-xs text-gray-400 italic mb-2">{insight.impact}</div>

                  {expandedInsight === insight.id && insight.suggestedActions && (
                    <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                      <div className="text-sm font-semibold text-white mb-2">Suggested Actions:</div>
                      <div className="space-y-1">
                        {insight.suggestedActions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                            <ChevronRight className="h-4 w-4 text-purple-500 mt-0.5" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {insights.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No insights available yet. Keep using the CRM to generate AI insights.</p>
          </div>
        )}
      </Card>

          {/* Workflow Recommendations */}
          {workflows.length > 0 && (
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="text-xl font-semibold text-white">Automation Opportunities</h3>
                <Badge variant="outline" className="ml-auto text-gray-400">
                  {workflows.length} workflows
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{workflow.name}</h4>
                      <Badge
                        variant="outline"
                        className={`${getPriorityColor(workflow.priority)} border-0 text-white text-xs`}
                      >
                        {workflow.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{workflow.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="font-semibold">Trigger:</span> {workflow.trigger}
                    </div>
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-400 mb-1">Actions:</div>
                      <div className="space-y-1">
                        {workflow.actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                            <ChevronRight className="h-3 w-3 text-yellow-500 mt-0.5" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 italic mb-3">{workflow.expectedImpact}</div>
                    {workflow.automatable && (
                      <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                        Enable Automation
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="text-center py-8 text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No predictions available yet. Keep using the CRM to generate predictions.</p>
              </div>
            </Card>
          )}

          {/* General Insights */}
          <Card className="p-6 bg-gray-900 border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-5 w-5 text-purple-500" />
              <h3 className="text-xl font-semibold text-white">AI-Powered Insights</h3>
              <Badge variant="outline" className="ml-auto text-gray-400">
                {insights.length} insights
              </Badge>
            </div>

            <div className="space-y-4">
              {insights.length > 0 ? (
                insights.map((insight) => (
                  <div
                    key={insight.id}
                    className="border border-gray-800 rounded-lg p-4 hover:border-purple-500/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedInsight(expandedInsight === insight.id ? null : insight.id)
                    }
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2 rounded-lg border ${getInsightColor(insight.type)}`}
                      >
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-white">{insight.title}</h4>
                              <Badge
                                variant="outline"
                                className={`${getPriorityColor(insight.priority)} border-0 text-white text-xs`}
                              >
                                {insight.priority}
                              </Badge>
                              {insight.actionable && (
                                <Badge variant="outline" className="border-green-500/20 text-green-500 text-xs">
                                  Actionable
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{insight.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400 mb-1">Confidence</div>
                            <div className="text-sm font-semibold text-purple-500">{insight.confidence}%</div>
                          </div>
                        </div>

                        {insight.metrics && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                              <span>
                                Current: {insight.metrics.current} {insight.metrics.unit}
                              </span>
                              <span>
                                Target: {insight.metrics.target} {insight.metrics.unit}
                              </span>
                            </div>
                            <Progress
                              value={(insight.metrics.current / insight.metrics.target) * 100}
                              className="h-2"
                            />
                          </div>
                        )}

                        {insight.affectedEntities && (
                          <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
                            {insight.affectedEntities.leads !== undefined && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {insight.affectedEntities.leads} leads
                              </span>
                            )}
                            {insight.affectedEntities.deals !== undefined && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {insight.affectedEntities.deals} deals
                              </span>
                            )}
                            {insight.affectedEntities.tasks !== undefined && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                {insight.affectedEntities.tasks} tasks
                              </span>
                            )}
                          </div>
                        )}

                        <div className="text-xs text-gray-400 italic mb-2">{insight.impact}</div>

                        {expandedInsight === insight.id && insight.suggestedActions && (
                          <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="text-sm font-semibold text-white mb-2">Suggested Actions:</div>
                            <div className="space-y-1">
                              {insight.suggestedActions.map((action, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                                  <ChevronRight className="h-4 w-4 text-purple-500 mt-0.5" />
                                  {action}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No insights available yet. Keep using the CRM to generate AI insights.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Workflow Recommendations */}
          {workflows.length > 0 ? (
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <h3 className="text-xl font-semibold text-white">Automation Opportunities</h3>
                <Badge variant="outline" className="ml-auto text-gray-400">
                  {workflows.length} workflows
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="border border-gray-800 rounded-lg p-4 hover:border-yellow-500/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{workflow.name}</h4>
                      <Badge
                        variant="outline"
                        className={`${getPriorityColor(workflow.priority)} border-0 text-white text-xs`}
                      >
                        {workflow.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{workflow.description}</p>
                    <div className="text-xs text-gray-500 mb-2">
                      <span className="font-semibold">Trigger:</span> {workflow.trigger}
                    </div>
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-400 mb-1">Actions:</div>
                      <div className="space-y-1">
                        {workflow.actions.map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                            <ChevronRight className="h-3 w-3 text-yellow-500 mt-0.5" />
                            {action}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 italic mb-3">{workflow.expectedImpact}</div>
                    {workflow.automatable && (
                      <Button size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black">
                        Enable Automation
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 bg-gray-900 border-gray-800">
              <div className="text-center py-8 text-gray-400">
                <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No workflow recommendations available yet.</p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
