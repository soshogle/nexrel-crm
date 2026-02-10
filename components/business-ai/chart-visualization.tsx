/**
 * Professional Chart Visualization Component
 * Renders interactive, visually striking charts using Recharts
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';

interface ChartVisualizationProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'score' | 'radial';
  data: any;
  title?: string;
  current?: number;
  growth?: number;
  breakdown?: Record<string, number>;
}

// Professional color palette
const PROFESSIONAL_COLORS = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#f97316', // Orange
];

const GRADIENT_COLORS = {
  purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
  green: ['#10b981', '#34d399', '#6ee7b7'],
  pink: ['#ec4899', '#f472b6', '#fbcfe8'],
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3">
        <p className="font-semibold text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function ChartVisualization({
  type,
  data,
  title,
  current,
  growth,
  breakdown,
}: ChartVisualizationProps) {
  // Score visualization with radial chart
  if (type === 'score') {
    const score = data.value || 0;
    const scoreData = [
      { name: 'Score', value: score, fill: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444' },
      { name: 'Remaining', value: 100 - score, fill: '#e5e7eb' },
    ];

    return (
      <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm p-6">
        <div className="space-y-6">
          {title && (
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <h4 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {title}
              </h4>
            </div>
          )}
          
          <div className="flex items-center gap-8">
            {/* Radial Score Chart */}
            <div className="relative w-48 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="70%"
                  outerRadius="90%"
                  data={scoreData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={10}
                    fill={scoreData[0].fill}
                    animationDuration={1500}
                    animationBegin={0}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={cn(
                    'text-5xl font-bold mb-1',
                    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                  )}>
                    {score}
                  </div>
                  <div className="text-xs text-gray-500">out of 100</div>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            {breakdown && (
              <div className="flex-1 space-y-3">
                {Object.entries(breakdown).map(([key, value], index) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize font-medium text-gray-700">{key}</span>
                      <span className="font-bold text-purple-600">{value}</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 rounded-full"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Growth indicator */}
          {growth !== undefined && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-600">Growth:</span>
              <span className={cn(
                'flex items-center gap-1 font-semibold',
                growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                {growth > 0 && <TrendingUp className="h-4 w-4" />}
                {growth < 0 && <TrendingDown className="h-4 w-4" />}
                {growth === 0 && <Minus className="h-4 w-4" />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Prepare data for Recharts
  const prepareChartData = () => {
    if (!data?.labels || !data?.datasets) return [];
    
    return data.labels.map((label: string, index: number) => {
      const dataPoint: any = { name: label };
      data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const key = dataset.label || `value${datasetIndex}`;
        dataPoint[key] = dataset.data[index];
      });
      return dataPoint;
    });
  };

  // Line Chart
  if (type === 'line' && data?.labels && data?.datasets) {
    const chartData = prepareChartData();
    
    return (
      <Card className="border-2 border-purple-200/50 shadow-xl bg-gradient-to-br from-white/95 to-purple-50/30 backdrop-blur-sm p-6">
        <div className="space-y-4">
          {title && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-purple-600" />
                <h4 className="font-bold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {title}
                </h4>
              </div>
              {current !== undefined && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">${current.toLocaleString()}</div>
                  {growth !== undefined && (
                    <span className={cn(
                      'flex items-center gap-1 text-sm',
                      growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {growth > 0 && <TrendingUp className="h-3 w-3" />}
                      {growth < 0 && <TrendingDown className="h-3 w-3" />}
                      {Math.abs(growth).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {data.datasets.map((dataset: any, index: number) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={dataset.label || `value${index}`}
                  stroke={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}
                  strokeWidth={3}
                  dot={{ fill: PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                  animationDuration={1000}
                  animationBegin={0}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Bar Chart
  if (type === 'bar' && data?.labels && data?.datasets) {
    const chartData = prepareChartData();
    
    return (
      <Card className="border-2 border-blue-200/50 shadow-xl bg-gradient-to-br from-white/95 to-blue-50/30 backdrop-blur-sm p-6">
        <div className="space-y-4">
          {title && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h4 className="font-bold text-lg bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                  {title}
                </h4>
              </div>
              {current !== undefined && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{current.toLocaleString()}</div>
                  {growth !== undefined && (
                    <span className={cn(
                      'flex items-center gap-1 text-sm',
                      growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {growth > 0 && <TrendingUp className="h-3 w-3" />}
                      {growth < 0 && <TrendingDown className="h-3 w-3" />}
                      {Math.abs(growth).toFixed(1)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
          
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                {data.datasets.map((dataset: any, index: number) => (
                  <linearGradient key={index} id={`barGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]} stopOpacity={1}/>
                    <stop offset="95%" stopColor={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {data.datasets.map((dataset: any, index: number) => (
                <Bar
                  key={index}
                  dataKey={dataset.label || `value${index}`}
                  fill={`url(#barGradient${index})`}
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                  animationBegin={index * 100}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  // Pie Chart - Professional with live rendering
  if (type === 'pie' && data?.labels && data?.datasets) {
    const pieData = data.labels.map((label: string, index: number) => ({
      name: label,
      value: data.datasets[0]?.data[index] || 0,
    })).filter(item => item.value > 0);
    
    const total = pieData.reduce((sum, item) => sum + item.value, 0);
    const COLORS = PROFESSIONAL_COLORS.slice(0, pieData.length);

    return (
      <Card className="border-2 border-pink-200/50 shadow-xl bg-gradient-to-br from-white/95 to-pink-50/30 backdrop-blur-sm p-6">
        <div className="space-y-6">
          {title && (
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-pink-600" />
              <h4 className="font-bold text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {title}
              </h4>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
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
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[index % COLORS.length]}
                        stroke="#fff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const percentage = total > 0 ? ((data.value as number) / total * 100) : 0;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl p-3">
                            <p className="font-semibold text-sm mb-1">{data.name}</p>
                            <p className="text-sm text-gray-600">
                              Value: <span className="font-bold">{data.value?.toLocaleString()}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                              Percentage: <span className="font-bold">{percentage.toFixed(1)}%</span>
                            </p>
                          </div>
                        );
                      }
                      return null;
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
            </div>

            {/* Legend with values */}
            <div className="flex flex-col justify-center space-y-3">
              {pieData.map((item, index) => {
                const percentage = total > 0 ? (item.value / total * 100) : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-semibold text-sm text-gray-700">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sm text-gray-900">{item.value.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-500 rounded-full"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {total > 0 && (
                <div className="pt-4 border-t border-gray-200 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-gray-700">Total</span>
                    <span className="font-bold text-lg text-purple-600">{total.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Area Chart
  if (type === 'area' && data?.labels && data?.datasets) {
    const chartData = prepareChartData();
    
    return (
      <Card className="border-2 border-green-200/50 shadow-xl bg-gradient-to-br from-white/95 to-green-50/30 backdrop-blur-sm p-6">
        <div className="space-y-4">
          {title && (
            <div className="flex items-center gap-2">
              <LineChartIcon className="h-5 w-5 text-green-600" />
              <h4 className="font-bold text-lg bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
                {title}
              </h4>
            </div>
          )}
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                {data.datasets.map((dataset: any, index: number) => (
                  <linearGradient key={index} id={`areaGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]} stopOpacity={0.1}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {data.datasets.map((dataset: any, index: number) => (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={dataset.label || `value${index}`}
                  stroke={PROFESSIONAL_COLORS[index % PROFESSIONAL_COLORS.length]}
                  strokeWidth={2}
                  fill={`url(#areaGradient${index})`}
                  animationDuration={1000}
                  animationBegin={index * 100}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-gray-200 shadow-lg p-6">
      <div className="text-center py-8 text-gray-500">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-semibold">Chart visualization</p>
        <p className="text-xs mt-1 text-gray-400">Unable to render chart with provided data</p>
      </div>
    </Card>
  );
}
