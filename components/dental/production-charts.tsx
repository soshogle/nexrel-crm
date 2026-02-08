/**
 * Production Charts Component
 * Phase 4: Detailed visualizations for production data
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Calendar, Download } from 'lucide-react';
import { useState } from 'react';

interface ProductionDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ProductionChartsProps {
  dailyData: ProductionDataPoint[];
  weeklyData: ProductionDataPoint[];
  monthlyData: ProductionDataPoint[];
  byTreatmentType?: { type: string; value: number }[];
  byPractitioner?: { name: string; value: number }[];
  byDayOfWeek?: { day: string; value: number }[];
  onExport?: (format: 'png' | 'pdf' | 'csv') => void;
}

export function ProductionCharts({
  dailyData,
  weeklyData,
  monthlyData,
  byTreatmentType,
  byPractitioner,
  byDayOfWeek,
  onExport,
}: ProductionChartsProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedChart, setSelectedChart] = useState<'trend' | 'breakdown' | 'comparison'>('trend');

  const currentData = timeRange === 'daily' ? dailyData : timeRange === 'weekly' ? weeklyData : monthlyData;
  const maxValue = Math.max(...currentData.map(d => d.value), 0);
  const chartHeight = 200;

  // Simple line chart component
  const LineChart = ({ data }: { data: ProductionDataPoint[] }) => {
    const width = 600;
    const padding = 40;
    const chartHeight = 300;
    const height = chartHeight + padding * 2;
    const chartWidth = width - padding * 2;

    const xScale = (index: number) => (index / (data.length - 1 || 1)) * chartWidth + padding;
    const yScale = (value: number) => height - padding - (value / maxValue) * chartHeight;

    const points = data.map((d, i) => `${xScale(i)},${yScale(d.value)}`).join(' ');

    return (
      <svg width={width} height={height} className="w-full">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            y1={height - padding - ratio * chartHeight}
            x2={width - padding}
            y2={height - padding - ratio * chartHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        ))}
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
        />
        {/* Points */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(d.value)}
            r="4"
            fill="#3b82f6"
          />
        ))}
        {/* Labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={xScale(i)}
            y={height - padding + 15}
            fontSize="10"
            fill="#6b7280"
            textAnchor="middle"
          >
            {d.label || new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </text>
        ))}
        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <text
            key={ratio}
            x={padding - 10}
            y={height - padding - ratio * chartHeight + 4}
            fontSize="10"
            fill="#6b7280"
            textAnchor="end"
          >
            ${Math.round(maxValue * ratio).toLocaleString()}
          </text>
        ))}
      </svg>
    );
  };

  // Bar chart component
  const BarChart = ({ data, maxBarValue }: { data: { label: string; value: number }[]; maxBarValue: number }) => {
    const width = 600;
    const padding = 40;
    const height = 300;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const barWidth = chartWidth / data.length - 10;

    return (
      <svg width={width} height={height} className="w-full">
        {data.map((item, i) => {
          const barHeight = (item.value / maxBarValue) * chartHeight;
          const x = padding + i * (chartWidth / data.length);
          const y = height - padding - barHeight;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                rx="4"
              />
              <text
                x={x + barWidth / 2}
                y={height - padding + 15}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {item.label}
              </text>
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="#1f2937"
                textAnchor="middle"
                fontWeight="bold"
              >
                ${item.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // Pie chart component (simplified)
  const PieChart = ({ data }: { data: { label: string; value: number }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
    
    let currentAngle = 0;
    const radius = 80;
    const centerX = 120;
    const centerY = 120;

    return (
      <svg width={240} height={240} className="w-full">
        {data.map((item, i) => {
          const percentage = item.value / total;
          const angle = percentage * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;

          const startAngleRad = (startAngle * Math.PI) / 180;
          const endAngleRad = (endAngle * Math.PI) / 180;

          const x1 = centerX + radius * Math.cos(startAngleRad);
          const y1 = centerY + radius * Math.sin(startAngleRad);
          const x2 = centerX + radius * Math.cos(endAngleRad);
          const y2 = centerY + radius * Math.sin(endAngleRad);

          const largeArc = angle > 180 ? 1 : 0;

          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            'Z',
          ].join(' ');

          const labelAngle = (startAngle + endAngle) / 2;
          const labelRadius = radius + 20;
          const labelX = centerX + labelRadius * Math.cos((labelAngle * Math.PI) / 180);
          const labelY = centerY + labelRadius * Math.sin((labelAngle * Math.PI) / 180);

          return (
            <g key={i}>
              <path
                d={pathData}
                fill={colors[i % colors.length]}
                stroke="#fff"
                strokeWidth="2"
              />
              <text
                x={labelX}
                y={labelY}
                fontSize="10"
                fill="#1f2937"
                textAnchor="middle"
                fontWeight="bold"
              >
                {item.label}
              </text>
              <text
                x={labelX}
                y={labelY + 12}
                fontSize="9"
                fill="#6b7280"
                textAnchor="middle"
              >
                ${item.value.toLocaleString()}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button
              variant={selectedChart === 'trend' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('trend')}
            >
              Trend
            </Button>
            <Button
              variant={selectedChart === 'breakdown' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('breakdown')}
            >
              Breakdown
            </Button>
            <Button
              variant={selectedChart === 'comparison' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedChart('comparison')}
            >
              Comparison
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onExport?.('png')}>
            <Download className="w-4 h-4 mr-1" />
            Export PNG
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport?.('csv')}>
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Production Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {timeRange === 'daily' ? 'Daily' : timeRange === 'weekly' ? 'Weekly' : 'Monthly'} Production Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart data={currentData} />
            <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
              <span>
                Total: ${currentData.reduce((sum, d) => sum + d.value, 0).toLocaleString()}
              </span>
              <span>
                Avg: ${Math.round(currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length || 0).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* By Treatment Type */}
        {byTreatmentType && byTreatmentType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Production by Treatment Type</CardTitle>
            </CardHeader>
            <CardContent>
              <PieChart data={byTreatmentType.map(item => ({ label: item.type || 'Unknown', value: item.value }))} />
            </CardContent>
          </Card>
        )}

        {/* By Practitioner */}
        {byPractitioner && byPractitioner.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Production by Practitioner</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart 
                data={byPractitioner.map(p => ({ label: p.name, value: p.value }))} 
                maxBarValue={Math.max(...byPractitioner.map(p => p.value), 0)}
              />
            </CardContent>
          </Card>
        )}

        {/* By Day of Week */}
        {byDayOfWeek && byDayOfWeek.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Production by Day of Week</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart 
                data={byDayOfWeek.map(d => ({ label: d.day, value: d.value }))} 
                maxBarValue={Math.max(...byDayOfWeek.map(d => d.value), 0)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
