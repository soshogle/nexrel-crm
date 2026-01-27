
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Brain,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BarChart3,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

export default function TaskAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [patterns, setPatterns] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [analyticsRes, patternsRes] = await Promise.all([
        fetch(`/api/tasks/analytics?period=${period}`),
        fetch('/api/tasks/ai-patterns'),
      ]);

      if (!analyticsRes.ok || !patternsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const analyticsData = await analyticsRes.json();
      const patternsData = await patternsRes.json();

      setAnalytics(analyticsData);
      setPatterns(patternsData);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold gradient-text">Analytics & AI Insights</h2>
          <p className="text-gray-400 mt-1">
            Track performance and discover patterns with AI-powered intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px] bg-gray-800 border-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Total Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{analytics.summary.total}</div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.summary.completed} completed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analytics.summary.completionRate.toFixed(0)}%
              </div>
              <Progress
                value={analytics.summary.completionRate}
                className="mt-2 h-2"
              />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Avg Completion Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analytics.productivityMetrics.avgCompletionTime.toFixed(1)}h
              </div>
              <p className="text-xs text-gray-500 mt-1">Average time to complete</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {analytics.overdueAnalysis.count}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {analytics.overdueAnalysis.byPriority.URGENT} urgent
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights */}
      {patterns && patterns.insights && patterns.insights.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Sparkles className="h-5 w-5 text-purple-400" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription className="text-gray-400">
              Intelligent predictions and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.insights.map((insight: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {insight.type === 'warning' && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    )}
                    {insight.type === 'alert' && (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    {insight.type === 'insight' && (
                      <Brain className="h-5 w-5 text-blue-500" />
                    )}
                    {insight.type === 'productivity_tip' && (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">{insight.message}</p>
                    <Badge
                      variant="outline"
                      className="mt-2 border-purple-500/30 text-purple-400 text-xs"
                    >
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        {analytics && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Priority Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(analytics.priorityDistribution).map(([priority, count]: [string, any]) => {
                const total = Object.values(analytics.priorityDistribution).reduce(
                  (sum: number, val: any) => sum + val,
                  0
                );
                const percentage = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={priority} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{priority}</span>
                      <span className="text-white font-medium">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Category Performance */}
        {analytics && analytics.categoryPerformance.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-400" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.categoryPerformance.map((category: any) => (
                <div key={category.category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">{category.category}</span>
                    <span className="text-white font-medium">
                      {category.completed}/{category.total}
                    </span>
                  </div>
                  <Progress value={category.completionRate} className="h-2" />
                  <p className="text-xs text-gray-500">
                    {category.completionRate.toFixed(0)}% completion rate
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Team Performance */}
        {analytics && analytics.teamPerformance.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                Team Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analytics.teamPerformance.map((member: any) => (
                <div key={member.id} className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{member.name || member.email || 'Unknown'}</span>
                    <Badge
                      variant="outline"
                      className="border-gray-700 text-gray-400"
                    >
                      {member.totalAssigned} tasks
                    </Badge>
                  </div>
                  <Progress value={member.completionRate} className="h-2 mb-2" />
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{member.completed} completed</span>
                    <span>{member.inProgress} in progress</span>
                    <span className="text-red-500">{member.overdue} overdue</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Peak Productivity Hours */}
        {patterns && patterns.peakProductivityHours && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-400" />
                Peak Productivity Hours
              </CardTitle>
              <CardDescription className="text-gray-400">
                Times when you create the most tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap">
                {patterns.peakProductivityHours.map((hour: number) => (
                  <Badge
                    key={hour}
                    className="bg-orange-500/10 text-orange-500 border-orange-500/20"
                  >
                    {hour}:00 - {hour + 1}:00
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-3">
                Schedule important tasks during these hours for maximum productivity
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Predictions */}
      {analytics && analytics.predictions && analytics.predictions.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-400" />
              Predictive Analysis
            </CardTitle>
            <CardDescription className="text-gray-400">
              AI-generated forecasts based on historical patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics.predictions.map((prediction: any, index: number) => (
              <div
                key={index}
                className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg flex items-start gap-3"
              >
                <div className="flex-shrink-0">
                  {prediction.type === 'warning' && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  {prediction.type === 'alert' && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  {prediction.type === 'insight' && (
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm">{prediction.message}</p>
                  <Badge
                    variant="outline"
                    className="mt-2 border-purple-500/30 text-purple-400 text-xs"
                  >
                    {prediction.confidence}% confidence
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
