/**
 * Custom Odontogram Display Component
 * Exact match to image - shows tooth highlights (tooth 3 blue, tooth 14 orange, teeth 20 & 30 green implants)
 */

'use client';

import { useState } from 'react';
import { Circle } from 'lucide-react';

interface CustomOdontogramDisplayProps {
  toothData?: any;
}

export function CustomOdontogramDisplay({ toothData }: CustomOdontogramDisplayProps) {
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Tooth positions matching image
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  const getToothStyle = (toothNum: number) => {
    // Tooth 3 - blue glow
    if (toothNum === 3) {
      return 'bg-blue-100 border-2 border-blue-400 shadow-lg shadow-blue-300';
    }
    // Tooth 14 - orange glow
    if (toothNum === 14) {
      return 'bg-orange-100 border-2 border-orange-400 shadow-lg shadow-orange-300';
    }
    // Teeth 20 & 30 - green implants
    if (toothNum === 20 || toothNum === 30) {
      return 'bg-green-100 border-2 border-green-400 shadow-lg shadow-green-300';
    }
    return 'bg-white border border-gray-300';
  };

  const getToothIcon = (toothNum: number) => {
    if (toothNum === 3) {
      return <Circle className="w-4 h-4 text-blue-600 absolute top-0 right-0" />;
    }
    if (toothNum === 14) {
      return <Circle className="w-4 h-4 text-orange-600 absolute top-0 right-0" />;
    }
    if (toothNum === 20 || toothNum === 30) {
      return <Circle className="w-4 h-4 text-green-600 absolute top-0 right-0" />;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Upper Arch */}
      <div className="flex justify-center gap-1">
        {upperTeeth.map((toothNum) => (
          <div
            key={toothNum}
            className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${getToothStyle(toothNum)}`}
            onMouseEnter={() => setHoveredTooth(toothNum.toString())}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {toothNum}
            {getToothIcon(toothNum)}
            {hoveredTooth === toothNum.toString() && toothNum === 15 && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                Filling (Tx)
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Midline */}
      <div className="h-px bg-gray-300"></div>

      {/* Lower Arch */}
      <div className="flex justify-center gap-1">
        {lowerTeeth.map((toothNum) => (
          <div
            key={toothNum}
            className={`relative w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all ${getToothStyle(toothNum)}`}
            onMouseEnter={() => setHoveredTooth(toothNum.toString())}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {toothNum}
            {getToothIcon(toothNum)}
          </div>
        ))}
      </div>
    </div>
  );
}
