/**
 * Periodontal Bar Chart Component
 * Exact match to image - bar chart visualization with green/red bars
 */

'use client';

import { ArrowUp, ArrowDown } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface PeriodontalBarChartProps {
  measurements?: any;
}

export function PeriodontalBarChart({ measurements }: PeriodontalBarChartProps) {
  const { data: session } = useSession();
  const isOrthoDemo = String(session?.user?.email || '').toLowerCase().trim() === 'orthodontist@nexrel.com';

  const getToothPd = (toothNum: number): number => {
    const data = measurements?.[String(toothNum)] || measurements?.[toothNum];
    if (!data || typeof data !== 'object') return 0;
    const sites = ['mesial', 'buccal', 'distal', 'lingual'];
    const values = sites
      .map((site) => Number(data?.[site]?.pd || 0))
      .filter((v) => Number.isFinite(v) && v > 0);
    if (values.length === 0) return 0;
    return Math.max(...values);
  };

  // For non-demo users, chart reflects real measurements only (empty => zero bars).
  // For the dedicated demo account, use a deterministic fallback pattern.
  const chartData = Array.from({ length: 32 }, (_, i) => {
    const toothNum = i + 1;
    const pdFromData = getToothPd(toothNum);
    const fallbackPd = (toothNum % 4 === 0) ? 3 : 2;
    const pd = pdFromData > 0 ? pdFromData : (isOrthoDemo ? fallbackPd : 0);
    return {
      tooth: toothNum,
      pd,
      hasArrow: isOrthoDemo && (toothNum === 6 || toothNum === 11 || toothNum === 22 || toothNum === 27),
      arrowDirection: toothNum % 2 === 0 ? 'up' : 'down',
    };
  });

  const getBarColor = (pd: number) => {
    if (pd <= 0) return 'bg-gray-200';
    if (pd <= 3) return 'bg-green-500';
    if (pd <= 5) return 'bg-red-500';
    return 'bg-red-700';
  };

  const getBarHeight = (pd: number) => {
    if (pd <= 0) return '2px';
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
          {chartData.slice(0, 16).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-6">
              <div className="relative w-4 flex flex-col items-center">
                <div
                  className={`w-full ${getBarColor(tooth.pd)} rounded-t`}
                  style={{ height: getBarHeight(tooth.pd), minHeight: tooth.pd > 0 ? '8px' : '2px' }}
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
          {chartData.slice(16, 32).map((tooth) => (
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
                  style={{ height: getBarHeight(tooth.pd), minHeight: tooth.pd > 0 ? '8px' : '2px' }}
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
