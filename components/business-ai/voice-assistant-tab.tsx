'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AIBrainVoiceAgentInline } from '@/components/dashboard/ai-brain-voice-agent-inline';
import { TrendingUp, AlertCircle, CheckCircle2, BarChart3, Activity, Zap } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface VoiceAssistantTabProps {
  healthScore: any;
  predictions: any[];
  insights: any[];
}

const THEME_COLORS = ['#7c3aed', '#a855f7', '#ec4899', '#f472b6'];

const HEALTH_BREAKDOWN_COLORS: Record<string, string> = {
  revenue: '#7c3aed',
  pipeline: '#a855f7',
  customers: '#ec4899',
  operations: '#f472b6',
};

function HealthDonut({ score }: { score: number }) {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];
  const fillColor = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';

  return (
    <div className="relative w-40 h-40 mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={68}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            strokeWidth={0}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            <Cell fill={fillColor} />
            <Cell fill="#e5e7eb" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color: fillColor }}>
          {score}
        </span>
        <span className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
          / 100
        </span>
      </div>
    </div>
  );
}

function MiniBreakdownBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500 font-medium">{label}</span>
        <span className="font-semibold" style={{ color }}>{value}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

function PredictionsChart({ predictions }: { predictions: any[] }) {
  const chartData = predictions.map((p) => ({
    name: p.metric
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' '),
    current: p.currentValue ?? 0,
    predicted: p.predictedValue ?? 0,
  }));

  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barGap={4} barCategoryGap="20%">
          <defs>
            <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="gradPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#f472b6" stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="current"
            fill="url(#gradCurrent)"
            radius={[6, 6, 0, 0]}
            name="Current"
            animationDuration={1000}
          />
          <Bar
            dataKey="predicted"
            fill="url(#gradPredicted)"
            radius={[6, 6, 0, 0]}
            name="Predicted"
            animationDuration={1200}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ImpactBar({ impact }: { impact: string }) {
  const level =
    impact === 'high' ? 100 : impact === 'medium' ? 60 : 30;
  const color =
    impact === 'high' ? '#7c3aed' : impact === 'medium' ? '#a855f7' : '#d8b4fe';

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Impact</span>
        <span className="text-[10px] font-semibold capitalize" style={{ color }}>
          {impact}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${level}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

export function VoiceAssistantTab({ healthScore, predictions, insights }: VoiceAssistantTabProps) {
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
            <div className="flex flex-col md:flex-row items-center gap-8">
              <HealthDonut score={healthScore.overall} />

              <div className="flex-1 w-full space-y-3">
                <MiniBreakdownBar
                  label="Revenue"
                  value={healthScore.revenue}
                  color={HEALTH_BREAKDOWN_COLORS.revenue}
                />
                <MiniBreakdownBar
                  label="Pipeline"
                  value={healthScore.pipeline}
                  color={HEALTH_BREAKDOWN_COLORS.pipeline}
                />
                <MiniBreakdownBar
                  label="Customers"
                  value={healthScore.customers}
                  color={HEALTH_BREAKDOWN_COLORS.customers}
                />
                <MiniBreakdownBar
                  label="Operations"
                  value={healthScore.operations}
                  color={HEALTH_BREAKDOWN_COLORS.operations}
                />
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
              <div className="space-y-6">
                <PredictionsChart predictions={predictions} />

                <div className="flex items-center gap-4 justify-center text-xs text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-b from-[#7c3aed] to-[#a855f7]" />
                    Current
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-sm bg-gradient-to-b from-[#ec4899] to-[#f472b6]" />
                    Predicted
                  </span>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  {predictions.map((prediction, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {prediction.metric.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] border-purple-200 text-purple-600"
                        >
                          {prediction.confidence}% conf.
                        </Badge>
                        <span className="text-xs text-gray-400">{prediction.timeframe}</span>
                      </div>
                    </div>
                  ))}
                </div>
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
                        {insight.impact && <ImpactBar impact={insight.impact} />}
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
