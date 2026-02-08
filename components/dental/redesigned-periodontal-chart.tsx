/**
 * Redesigned Periodontal Charting Component
 * Exact match to image - bar chart with green/red bars, tooth numbers 1-32, legend
 */

'use client';

interface RedesignedPeriodontalChartProps {
  measurements?: any;
}

export function RedesignedPeriodontalChart({ measurements }: RedesignedPeriodontalChartProps) {
  // Process actual measurements data or show empty state
  const getToothData = (toothNum: number) => {
    const toothData = measurements?.[String(toothNum)];
    if (!toothData) {
      return { pd: null, worked: false };
    }
    
    // Get average pocket depth across all sites, or use first available
    const sites = ['mesial', 'buccal', 'distal', 'lingual'];
    const depths = sites
      .map(site => toothData[site]?.pd)
      .filter(pd => pd !== undefined && pd > 0);
    
    if (depths.length === 0) {
      return { pd: null, worked: false };
    }
    
    const avgPd = depths.reduce((sum, pd) => sum + pd, 0) / depths.length;
    return { pd: Math.round(avgPd * 10) / 10, worked: true };
  };

  const chartData = Array.from({ length: 32 }, (_, i) => {
    const toothNum = i + 1;
    return {
      tooth: toothNum,
      ...getToothData(toothNum),
    };
  });

  const getBarColor = (pd: number | null, worked: boolean) => {
    if (!worked || pd === null) return 'bg-gray-300'; // Not worked on
    if (pd <= 3) return 'bg-green-500'; // Healthy (1-3mm)
    if (pd <= 5) return 'bg-yellow-500'; // Moderate (4-5mm)
    return 'bg-red-500'; // Problematic (>5mm)
  };

  const getBarHeight = (pd: number | null) => {
    if (pd === null) return '6px'; // Minimum height for unworked teeth
    // Max height 40px for 5mm+
    return `${Math.max((pd / 5) * 40, 6)}px`;
  };

  return (
    <div className="space-y-3">
      {/* Chart */}
      <div className="relative bg-purple-50 p-3 rounded-lg">
        {/* Upper arch teeth numbers */}
        <div className="flex justify-between mb-1 px-1">
          {Array.from({ length: 16 }, (_, i) => i + 1).map((num) => (
            <div key={num} className="text-[9px] text-gray-600 w-4 text-center font-medium">
              {num}
            </div>
          ))}
        </div>

        {/* Upper arch bars */}
        <div className="flex justify-between items-end mb-2 px-1">
          {chartData.slice(0, 16).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-4">
              <div
                className={`w-3 ${getBarColor(tooth.pd, tooth.worked)} rounded-t transition-colors`}
                style={{ height: getBarHeight(tooth.pd), minHeight: '6px' }}
                title={tooth.worked ? `Tooth ${tooth.tooth}: ${tooth.pd}mm` : `Tooth ${tooth.tooth}: Not measured`}
              />
              <div className={`text-[8px] mt-0.5 ${tooth.worked ? 'text-gray-600' : 'text-gray-400'}`}>
                {tooth.worked ? `${tooth.pd}mm` : '-'}
              </div>
            </div>
          ))}
        </div>

        {/* Lower arch bars */}
        <div className="flex justify-between items-start mb-1 px-1">
          {chartData.slice(16, 32).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-4">
              <div className={`text-[8px] mb-0.5 ${tooth.worked ? 'text-gray-600' : 'text-gray-400'}`}>
                {tooth.worked ? `${tooth.pd}mm` : '-'}
              </div>
              <div
                className={`w-3 ${getBarColor(tooth.pd, tooth.worked)} rounded-b transition-colors`}
                style={{ height: getBarHeight(tooth.pd), minHeight: '6px' }}
                title={tooth.worked ? `Tooth ${tooth.tooth}: ${tooth.pd}mm` : `Tooth ${tooth.tooth}: Not measured`}
              />
            </div>
          ))}
        </div>

        {/* Lower arch teeth numbers */}
        <div className="flex justify-between px-1">
          {Array.from({ length: 16 }, (_, i) => i + 17).map((num) => (
            <div key={num} className="text-[9px] text-gray-600 w-4 text-center font-medium">
              {num}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 justify-center pt-2 border-t border-gray-200 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-300"></div>
          <span className="text-[10px] text-gray-600">Not Measured</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="text-[10px] text-gray-600">1-3mm (Healthy)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <span className="text-[10px] text-gray-600">4-5mm (Moderate)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span className="text-[10px] text-gray-600">&gt;5mm (Problem)</span>
        </div>
      </div>
    </div>
  );
}
