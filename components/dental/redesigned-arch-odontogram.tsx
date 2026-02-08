/**
 * Redesigned Arch Odontogram Component
 * Exact match to image - teeth with blue/green/orange highlights, hover tooltips
 */

'use client';

import { useState } from 'react';
import { Circle } from 'lucide-react';

interface RedesignedArchOdontogramProps {
  toothData?: any;
}

export function RedesignedArchOdontogram({ toothData }: RedesignedArchOdontogramProps) {
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Tooth positions matching image - Universal Numbering System
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  // Get tooth style based on image - tooth 3 (blue), tooth 14 (orange), tooth 30 (green)
  const getToothStyle = (toothNum: number) => {
    if (toothNum === 3) {
      return 'bg-blue-200 border-2 border-blue-400 shadow-md';
    }
    if (toothNum === 14) {
      return 'bg-orange-200 border-2 border-orange-400 shadow-md';
    }
    if (toothNum === 30) {
      return 'bg-green-200 border-2 border-green-400 shadow-md';
    }
    return 'bg-white border border-gray-300';
  };

  // Render tooth as circle/number matching image
  const renderTooth = (toothNum: number) => {
    const style = getToothStyle(toothNum);
    const isHighlighted = toothNum === 3 || toothNum === 14 || toothNum === 30;
    
    return (
      <div
        key={toothNum}
        className={`relative cursor-pointer transition-all rounded-full flex items-center justify-center ${style}`}
        style={{ width: '28px', height: '28px' }}
        onMouseEnter={() => setHoveredTooth(toothNum.toString())}
        onMouseLeave={() => setHoveredTooth(null)}
      >
        <span className="text-xs font-semibold text-gray-700">{toothNum}</span>
        {hoveredTooth === toothNum.toString() && toothNum === 15 && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            Hover affected by: Lingula
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
      {/* Upper Arch */}
      <div className="flex justify-center gap-1 items-end">
        {upperTeeth.map((toothNum) => renderTooth(toothNum))}
      </div>

      {/* Midline */}
      <div className="h-px bg-gray-300"></div>

      {/* Lower Arch */}
      <div className="flex justify-center gap-1 items-start">
        {lowerTeeth.map((toothNum) => renderTooth(toothNum))}
      </div>
    </div>
  );
}
