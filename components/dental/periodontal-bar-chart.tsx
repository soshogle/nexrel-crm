/**
 * Periodontal Bar Chart Component
 * Exact match to image - bar chart visualization with green/red bars
 */

'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';

interface PeriodontalBarChartProps {
  measurements?: any;
}

export function PeriodontalBarChart({ measurements }: PeriodontalBarChartProps) {
  // Mock data matching image - teeth 1-32 with pocket depths
  const mockData = Array.from({ length: 32 }, (_, i) => {
    const toothNum = i + 1;
    // Random pocket depths (1-5mm) matching image pattern
    const pd = Math.floor(Math.random() * 5) + 1;
    return {
      tooth: toothNum,
      pd,
      hasArrow: Math.random() > 0.7,
      arrowDirection: Math.random() > 0.5 ? 'up' : 'down',
    };
  });

  const getBarColor = (pd: number) => {
    if (pd <= 3) return 'bg-green-500';
    if (pd <= 5) return 'bg-red-500';
    return 'bg-red-700';
  };

  const getBarHeight = (pd: number) => {
    // Max height 60px for 5mm+
    return `${(pd / 5) * 60}px`;
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="relative">
        {/* Upper arch teeth numbers */}
        <div className="flex justify-between mb-2 px-2">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
            <div key={num} className="text-[10px] text-gray-600 w-6 text-center">
              {num}
            </div>
          ))}
        </div>

        {/* Upper arch bars */}
        <div className="flex justify-between items-end mb-4 px-2">
          {mockData.slice(0, 16).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-6">
              <div className="relative w-4 flex flex-col items-center">
                <div
                  className={`w-full ${getBarColor(tooth.pd)} rounded-t`}
                  style={{ height: getBarHeight(tooth.pd), minHeight: '8px' }}
                />
                {tooth.hasArrow && (
                  <div className="absolute -bottom-3">
                    {tooth.arrowDirection === 'up' ? (
                      <ArrowUp className="w-3 h-3 text-red-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lower arch bars */}
        <div className="flex justify-between items-start mb-2 px-2">
          {mockData.slice(16, 32).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-6">
              <div className="relative w-4 flex flex-col items-center">
                {tooth.hasArrow && (
                  <div className="absolute -top-3">
                    {tooth.arrowDirection === 'up' ? (
                      <ArrowUp className="w-3 h-3 text-red-600" />
                    ) : (
                      <ArrowDown className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                )}
                <div
                  className={`w-full ${getBarColor(tooth.pd)} rounded-b`}
                  style={{ height: getBarHeight(tooth.pd), minHeight: '8px' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Lower arch teeth numbers */}
        <div className="flex justify-between px-2">
          {Array.from({ length: 16 }, (_, i) => i + 17).map((num) => (
            <div key={num} className="text-[10px] text-gray-600 w-6 text-center">
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pt-2 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs text-gray-600">1-3mm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs text-gray-600">4-5mm</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-700"></div>
          <span className="text-xs text-gray-600">&gt;5mm</span>
        </div>
      </div>
    </div>
  );
}
