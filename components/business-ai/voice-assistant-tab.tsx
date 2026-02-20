'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AIBrainVoiceAgentInline } from '@/components/dashboard/ai-brain-voice-agent-inline';
import { TrendingUp, AlertCircle, CheckCircle2, BarChart3, Activity, Zap } from 'lucide-react';

interface VoiceAssistantTabProps {
  healthScore: any;
  predictions: any[];
  insights: any[];
}

export function VoiceAssistantTab({ healthScore, predictions, insights }: VoiceAssistantTabProps) {
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

  return (
    <>
      <AIBrainVoiceAgentInline />

      {healthScore && (
        <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Business Health Score
            </CardTitle>
            <CardDescription>Overall business performance indicator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className={cn('text-6xl font-bold mb-2', getHealthColor(healthScore.overall))}>
                  {healthScore.overall}
                </div>
                <div className="text-2xl">{getHealthEmoji(healthScore.overall)}</div>
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

            {healthScore.alerts && healthScore.alerts.length > 0 && (
              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold">Alerts</h4>
                {healthScore.alerts.slice(0, 3).map((alert: any, index: number) => (
                  <div key={index} className={cn(
                    'flex items-start gap-2 p-3 rounded-lg text-sm',
                    alert.type === 'critical' ? 'bg-red-50 text-red-800' :
                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                    alert.type === 'success' ? 'bg-green-50 text-green-800' :
                    'bg-blue-50 text-blue-800'
                  )}>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-purple-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Predictions
            </CardTitle>
            <CardDescription>Statistical forecasts from your CRM data (regression, conversion rates)</CardDescription>
          </CardHeader>
          <CardContent>
            {predictions.length > 0 ? (
              <div className="space-y-4">
                {predictions.map((prediction, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-white/50 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm capitalize">{prediction.metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <Badge variant="outline">{prediction.confidence}% confidence</Badge>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                      {(prediction.metric === 'revenue' || prediction.metric === 'dealValue')
                        ? `$${prediction.predictedValue.toLocaleString()}`
                        : prediction.predictedValue.toLocaleString()}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{prediction.timeframe}</p>
                    {prediction.explanation && (
                      <p className="text-xs text-gray-500 mt-2 italic border-t pt-2">{prediction.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No predictions available yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/90 to-pink-50/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Insights & Recommendations
            </CardTitle>
            <CardDescription>Actionable intelligence for your business</CardDescription>
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
    </>
  );
}
