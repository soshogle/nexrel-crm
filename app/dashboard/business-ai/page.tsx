/**
 * Business AI Dashboard Page
 * Central hub for the revolutionary business intelligence AI
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VoiceAIAgent } from '@/components/business-ai/voice-ai-agent';
import { cn } from '@/lib/utils';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
} from 'lucide-react';

export default function BusinessAIPage() {
  const { data: session } = useSession();
  const [healthScore, setHealthScore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    if (session) {
      loadBusinessData();
    }
  }, [session]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-purple-600" />
            Business AI Intelligence
          </h1>
          <p className="text-gray-600 mt-2">
            Your revolutionary business brain - Ask anything, get instant insights
          </p>
        </div>
      </div>

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
                  // Trigger voice AI with this question
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

      {/* Voice AI Agent is rendered globally in dashboard wrapper */}
    </div>
  );
}
