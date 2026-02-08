/**
 * Production Dashboard Component
 * Phase 4: Real-time production metrics and visualizations
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, TrendingDown, Users, Calendar, Activity, Target } from 'lucide-react';

interface ProductionMetrics {
  dailyProduction: number;
  weeklyProduction: number;
  monthlyProduction: number;
  casesStartedToday: number;
  casesCompletedToday: number;
  activeTreatments: number;
  chairUtilization: number;
  teamProductivity: number;
  productionTrend: 'up' | 'down' | 'stable';
  revenueTrend: number; // Percentage change
}

interface ProductionDashboardProps {
  metrics: ProductionMetrics;
  onViewDetails?: (metric: string) => void;
}

export function ProductionDashboard({ metrics, onViewDetails }: ProductionDashboardProps) {
  const TrendIcon = metrics.productionTrend === 'up' ? TrendingUp : metrics.productionTrend === 'down' ? TrendingDown : Activity;
  const trendColor = metrics.productionTrend === 'up' ? 'text-green-600' : metrics.productionTrend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="space-y-4">
      {/* Production Overview Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewDetails?.('daily')}>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-700">Daily Production</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">${metrics.dailyProduction.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                  <span className={`text-xs ${trendColor}`}>
                    {metrics.revenueTrend > 0 ? '+' : ''}{metrics.revenueTrend.toFixed(1)}%
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewDetails?.('cases')}>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-700">Cases Today</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.casesStartedToday}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {metrics.casesCompletedToday} completed
                </p>
              </div>
              <Activity className="w-8 h-8 text-purple-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewDetails?.('treatments')}>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-700">Active Treatments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.activeTreatments}</p>
                <p className="text-xs text-gray-600 mt-1">In progress</p>
              </div>
              <Users className="w-8 h-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewDetails?.('utilization')}>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-700">Chair Utilization</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{metrics.chairUtilization}%</p>
                <p className="text-xs text-gray-600 mt-1">Today</p>
              </div>
              <Target className="w-8 h-8 text-amber-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly/Monthly Production */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-900">Weekly Production</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-gray-900">${metrics.weeklyProduction.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200 shadow-sm">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-xs font-semibold text-gray-900">Monthly Production</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-gray-900">${metrics.monthlyProduction.toLocaleString()}</p>
            <p className="text-xs text-gray-600 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
