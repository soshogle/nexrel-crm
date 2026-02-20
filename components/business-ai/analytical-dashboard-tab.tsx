'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Brain, TrendingUp, AlertCircle, Activity, Zap, Target, Sparkles, ChevronRight, BarChart3,
} from 'lucide-react';
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
  affectedEntities?: { leads?: number; deals?: number; tasks?: number };
  metrics?: { current: number; target: number; unit: string };
  timestamp: string;
}

interface PredictiveAnalytics {
  nextWeekForecast: { newLeads: { predicted: number; confidence: number }; dealConversions: { predicted: number; confidence: number }; revenue: { predicted: number; confidence: number; currency: string } };
  nextMonthForecast: { newLeads: { predicted: number; confidence: number }; dealConversions: { predicted: number; confidence: number }; revenue: { predicted: number; confidence: number; currency: string } };
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

interface AnalyticalDashboardTabProps {
  comprehensiveData: ComprehensiveBrainData | null;
  detailedInsights: GeneralInsight[];
  enhancedPredictions: PredictiveAnalytics | null;
  workflowRecommendations: WorkflowRecommendation[];
}

const getInsightIcon = (type: string) => {
  switch (type) {
    case 'opportunity': return <TrendingUp className="h-5 w-5" />;
    case 'risk': return <AlertCircle className="h-5 w-5" />;
    case 'trend': return <BarChart3 className="h-5 w-5" />;
    case 'action': return <Zap className="h-5 w-5" />;
    case 'prediction': return <Target className="h-5 w-5" />;
    default: return <Brain className="h-5 w-5" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-300';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export function AnalyticalDashboardTab({ comprehensiveData, detailedInsights, enhancedPredictions, workflowRecommendations }: AnalyticalDashboardTabProps) {
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  return (
    <>
      {/* Core Metrics Cards */}
      {comprehensiveData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div><p className="text-purple-100 text-sm mb-1">Overall Health</p><p className="text-3xl font-bold">{comprehensiveData.core.overallHealth}</p></div>
                <Activity className="h-8 w-8 text-purple-200 animate-pulse" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div><p className="text-green-100 text-sm mb-1">Total Revenue</p><p className="text-2xl font-bold">${comprehensiveData.core.keyMetrics.totalRevenue.toLocaleString()}</p></div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div><p className="text-blue-100 text-sm mb-1">Active Leads</p><p className="text-3xl font-bold">{comprehensiveData.core.keyMetrics.activeLeads}</p></div>
                <Brain className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between">
                <div><p className="text-orange-100 text-sm mb-1">Open Deals</p><p className="text-3xl font-bold">{comprehensiveData.core.keyMetrics.openDeals}</p></div>
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
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-purple-600 animate-pulse" /> Comprehensive Insights</CardTitle>
            <CardDescription>AI-powered analysis with priority and confidence scores</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="space-y-4">
              {detailedInsights.map((insight) => (
                <Card key={insight.id} className={cn('border-2 transition-all duration-300 hover:shadow-xl cursor-pointer backdrop-blur-sm bg-white/80', expandedInsight === insight.id ? 'border-purple-400 shadow-xl scale-[1.02] bg-white/95' : 'border-gray-200/50 hover:border-purple-300/50')} onClick={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={cn('p-3 rounded-lg', insight.type === 'opportunity' ? 'bg-green-100' : insight.type === 'risk' ? 'bg-red-100' : insight.type === 'trend' ? 'bg-blue-100' : 'bg-purple-100')}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div><h4 className="font-semibold text-base">{insight.title}</h4><p className="text-sm text-gray-600 mt-1">{insight.description}</p></div>
                          <div className="flex items-center gap-2 ml-4">
                            <Badge className={getPriorityColor(insight.priority)}>{insight.priority} priority</Badge>
                            <Badge variant="outline">{insight.confidence}% confidence</Badge>
                          </div>
                        </div>
                        {expandedInsight === insight.id && (
                          <div className="mt-4 space-y-3 pt-4 border-t">
                            <div><p className="text-sm font-medium text-gray-700 mb-2">Impact:</p><p className="text-sm text-gray-600">{insight.impact}</p></div>
                            {insight.affectedEntities && (
                              <div><p className="text-sm font-medium text-gray-700 mb-2">Affected:</p>
                                <div className="flex gap-4 text-sm">
                                  {insight.affectedEntities.leads && <span className="text-gray-600">{insight.affectedEntities.leads} leads</span>}
                                  {insight.affectedEntities.deals && <span className="text-gray-600">{insight.affectedEntities.deals} deals</span>}
                                  {insight.affectedEntities.tasks && <span className="text-gray-600">{insight.affectedEntities.tasks} tasks</span>}
                                </div>
                              </div>
                            )}
                            {insight.metrics && (
                              <div><p className="text-sm font-medium text-gray-700 mb-2">Metrics:</p>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-gray-600">Current: {insight.metrics.current}{insight.metrics.unit}</span>
                                  <span className="text-sm text-gray-600">Target: {insight.metrics.target}{insight.metrics.unit}</span>
                                </div>
                              </div>
                            )}
                            {insight.suggestedActions && insight.suggestedActions.length > 0 && (
                              <div><p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</p>
                                <ul className="space-y-1">{insight.suggestedActions.map((action, idx) => (
                                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2"><ChevronRight className="h-3 w-3 text-purple-600" />{action}</li>
                                ))}</ul>
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
            <CardHeader className="relative z-10"><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-purple-600" /> Next Week Forecast</CardTitle></CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg"><span className="text-sm font-medium">New Leads</span><div className="text-right"><span className="text-lg font-bold text-purple-600">{enhancedPredictions.nextWeekForecast.newLeads.predicted}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextWeekForecast.newLeads.confidence}%</Badge></div></div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg"><span className="text-sm font-medium">Deal Conversions</span><div className="text-right"><span className="text-lg font-bold text-green-600">{enhancedPredictions.nextWeekForecast.dealConversions.predicted}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextWeekForecast.dealConversions.confidence}%</Badge></div></div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span className="text-sm font-medium">Revenue</span><div className="text-right"><span className="text-lg font-bold text-blue-600">{enhancedPredictions.nextWeekForecast.revenue.currency}{enhancedPredictions.nextWeekForecast.revenue.predicted.toLocaleString()}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextWeekForecast.revenue.confidence}%</Badge></div></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-pink-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-pink-500/10 rounded-full blur-2xl" />
            <CardHeader className="relative z-10"><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-purple-600" /> Next Month Forecast</CardTitle></CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg"><span className="text-sm font-medium">New Leads</span><div className="text-right"><span className="text-lg font-bold text-purple-600">{enhancedPredictions.nextMonthForecast.newLeads.predicted}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextMonthForecast.newLeads.confidence}%</Badge></div></div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg"><span className="text-sm font-medium">Deal Conversions</span><div className="text-right"><span className="text-lg font-bold text-green-600">{enhancedPredictions.nextMonthForecast.dealConversions.predicted}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextMonthForecast.dealConversions.confidence}%</Badge></div></div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg"><span className="text-sm font-medium">Revenue</span><div className="text-right"><span className="text-lg font-bold text-blue-600">{enhancedPredictions.nextMonthForecast.revenue.currency}{enhancedPredictions.nextMonthForecast.revenue.predicted.toLocaleString()}</span><Badge variant="outline" className="ml-2">{enhancedPredictions.nextMonthForecast.revenue.confidence}%</Badge></div></div>
              </div>
              {enhancedPredictions.growthTrend && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Growth Trend:</p>
                  <Badge className={cn(enhancedPredictions.growthTrend === 'accelerating' ? 'bg-green-600' : enhancedPredictions.growthTrend === 'steady' ? 'bg-blue-600' : enhancedPredictions.growthTrend === 'declining' ? 'bg-red-600' : 'bg-yellow-600')}>{enhancedPredictions.growthTrend}</Badge>
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
            <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-purple-600 animate-pulse" /> Workflow Recommendations</CardTitle>
            <CardDescription>AI-suggested workflows to automate and optimize your business</CardDescription>
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
                          <Badge className={getPriorityColor(workflow.priority)}>{workflow.priority}</Badge>
                          {workflow.automatable && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Automatable</Badge>}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                        <div className="space-y-1 mb-2">
                          <p className="text-xs text-gray-500"><span className="font-medium">Trigger:</span> {workflow.trigger}</p>
                          <p className="text-xs text-gray-500"><span className="font-medium">Expected Impact:</span> {workflow.expectedImpact}</p>
                        </div>
                        {workflow.actions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">Actions:</p>
                            <div className="flex flex-wrap gap-1">{workflow.actions.map((action, idx) => <Badge key={idx} variant="outline" className="text-xs">{action}</Badge>)}</div>
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
    </>
  );
}
