/**
 * Dynamic Chart Visualization Component
 * Renders interactive charts based on data
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartVisualizationProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'score';
  data: any;
  title?: string;
  current?: number;
  growth?: number;
  breakdown?: Record<string, number>;
}

export function ChartVisualization({
  type,
  data,
  title,
  current,
  growth,
  breakdown,
}: ChartVisualizationProps) {
  if (type === 'score') {
    return (
      <div className="space-y-4">
        {title && <h4 className="font-semibold text-sm">{title}</h4>}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-purple-600">
            {data.value || 0}
          </div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all duration-500',
                  (data.value || 0) >= 80 ? 'bg-green-500' :
                  (data.value || 0) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: `${data.value || 0}%` }}
              />
            </div>
          </div>
        </div>
        {breakdown && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(breakdown).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="capitalize">{key}:</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === 'line' && data?.labels && data?.datasets) {
    return (
      <div className="space-y-3">
        {title && <h4 className="font-semibold text-sm">{title}</h4>}
        <div className="h-48 bg-gradient-to-b from-purple-50 to-white rounded-lg p-4 flex items-end justify-between gap-1">
          {data.datasets[0]?.data?.map((value: number, index: number) => {
            const maxValue = Math.max(...data.datasets[0].data);
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-gradient-to-t from-purple-600 to-purple-400 rounded-t transition-all duration-300 hover:from-purple-700 hover:to-purple-500"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${data.labels[index]}: $${value.toLocaleString()}`}
                />
                {index % Math.ceil(data.labels.length / 7) === 0 && (
                  <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {new Date(data.labels[index]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {current !== undefined && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Current: ${current.toLocaleString()}</span>
            {growth !== undefined && (
              <span className={cn(
                'flex items-center gap-1',
                growth > 0 ? 'text-green-600' : growth < 0 ? 'text-red-600' : 'text-gray-600'
              )}>
                {growth > 0 && <TrendingUp className="h-4 w-4" />}
                {growth < 0 && <TrendingDown className="h-4 w-4" />}
                {growth === 0 && <Minus className="h-4 w-4" />}
                {Math.abs(growth).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (type === 'bar' && data?.labels && data?.datasets) {
    return (
      <div className="space-y-3">
        {title && <h4 className="font-semibold text-sm">{title}</h4>}
        <div className="h-48 bg-gradient-to-b from-blue-50 to-white rounded-lg p-4 flex items-end justify-between gap-2">
          {data.datasets[0]?.data?.map((value: number, index: number) => {
            const maxValue = Math.max(...data.datasets[0].data);
            const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
                  style={{ height: `${height}%`, minHeight: '4px' }}
                  title={`${data.labels[index]}: ${value}`}
                />
                <span className="text-xs text-gray-600 text-center transform -rotate-45 origin-top-left whitespace-nowrap">
                  {data.labels[index]}
                </span>
              </div>
            );
          })}
        </div>
        {current !== undefined && (
          <div className="text-sm text-gray-600">
            Total: {current}
          </div>
        )}
      </div>
    );
  }

  if (type === 'pie' && data?.labels && data?.datasets) {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    const total = data.datasets[0]?.data?.reduce((sum: number, val: number) => sum + val, 0) || 0;

    return (
      <div className="space-y-3">
        {title && <h4 className="font-semibold text-sm">{title}</h4>}
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-2">
            {data.labels.map((label: string, index: number) => {
              const value = data.datasets[0]?.data[index] || 0;
              const percentage = total > 0 ? (value / total) * 100 : 0;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', colors[index % colors.length])} />
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-600 font-semibold">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full transition-all duration-300', colors[index % colors.length])}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8 text-gray-500">
      <p className="text-sm">Chart visualization</p>
      <p className="text-xs mt-1">Data: {JSON.stringify(data).substring(0, 50)}...</p>
    </div>
  );
}
