/**
 * Redesigned Periodontal Charting Component
 * Exact match to image - bar chart with green/red bars, tooth numbers 1-32, legend
 */

'use client';

interface RedesignedPeriodontalChartProps {
  measurements?: any;
}

export function RedesignedPeriodontalChart({ measurements }: RedesignedPeriodontalChartProps) {
  // Mock data matching image - teeth 1-32 with pocket depths
  const mockData = Array.from({ length: 32 }, (_, i) => {
    const toothNum = i + 1;
    // Random pocket depths (1-5mm) matching image pattern
    const pd = Math.floor(Math.random() * 5) + 1;
    return {
      tooth: toothNum,
      pd,
    };
  });

  const getBarColor = (pd: number) => {
    if (pd <= 3) return 'bg-green-500';
    if (pd <= 5) return 'bg-green-400';
    return 'bg-red-500';
  };

  const getBarHeight = (pd: number) => {
    // Max height 40px for 5mm+
    return `${(pd / 5) * 40}px`;
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
          {mockData.slice(0, 16).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-4">
              <div
                className={`w-3 ${getBarColor(tooth.pd)} rounded-t`}
                style={{ height: getBarHeight(tooth.pd), minHeight: '6px' }}
              />
              <div className="text-[8px] text-gray-600 mt-0.5">{tooth.pd}mm</div>
            </div>
          ))}
        </div>

        {/* Lower arch bars */}
        <div className="flex justify-between items-start mb-1 px-1">
          {mockData.slice(16, 32).map((tooth) => (
            <div key={tooth.tooth} className="flex flex-col items-center w-4">
              <div className="text-[8px] text-gray-600 mb-0.5">{tooth.pd}mm</div>
              <div
                className={`w-3 ${getBarColor(tooth.pd)} rounded-b`}
                style={{ height: getBarHeight(tooth.pd), minHeight: '6px' }}
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
      <div className="flex items-center gap-3 justify-center pt-2 border-t border-gray-200">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
          <span className="text-[10px] text-gray-600">1-3mm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          <span className="text-[10px] text-gray-600">4-5mm</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <span className="text-[10px] text-gray-600">&gt;5mm</span>
        </div>
      </div>
    </div>
  );
}
