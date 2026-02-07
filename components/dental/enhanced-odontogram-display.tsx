/**
 * Enhanced Odontogram Display Component
 * Shows actual tooth shapes/layout matching dental chart images
 */

'use client';

import { useState } from 'react';
import { Circle } from 'lucide-react';

interface EnhancedOdontogramDisplayProps {
  toothData?: any;
}

export function EnhancedOdontogramDisplay({ toothData }: EnhancedOdontogramDisplayProps) {
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Tooth positions matching image - Universal Numbering System
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  // Get tooth shape based on type (molar, premolar, canine, incisor)
  const getToothType = (toothNum: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
    const num = toothNum % 8;
    if (num === 1 || num === 2 || num === 0) return 'molar';
    if (num === 3 || num === 4) return 'premolar';
    if (num === 5) return 'canine';
    return 'incisor';
  };

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

  // Render tooth shape SVG
  const renderToothShape = (toothNum: number) => {
    const type = getToothType(toothNum);
    const isUpper = toothNum <= 16;
    const style = getToothStyle(toothNum);
    
    // Different shapes for different tooth types
    if (type === 'molar') {
      // Molar: wider, more rectangular with cusps
      return (
        <svg className="w-full h-full" viewBox="0 0 40 50" preserveAspectRatio="none">
          <path
            d="M5,10 Q5,5 10,5 L30,5 Q35,5 35,10 L35,40 Q35,45 30,45 L10,45 Q5,45 5,40 Z"
            className={`${style.includes('bg-blue') ? 'fill-blue-100 stroke-blue-400' : style.includes('bg-orange') ? 'fill-orange-100 stroke-orange-400' : style.includes('bg-green') ? 'fill-green-100 stroke-green-400' : 'fill-white stroke-gray-300'}`}
            strokeWidth="2"
          />
          {/* Cusps */}
          <circle cx="12" cy="15" r="2" className="fill-gray-400" />
          <circle cx="20" cy="12" r="2" className="fill-gray-400" />
          <circle cx="28" cy="15" r="2" className="fill-gray-400" />
          <circle cx="12" cy="35" r="2" className="fill-gray-400" />
          <circle cx="20" cy="38" r="2" className="fill-gray-400" />
          <circle cx="28" cy="35" r="2" className="fill-gray-400" />
          <text x="20" y="28" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
            {toothNum}
          </text>
        </svg>
      );
    } else if (type === 'premolar') {
      // Premolar: smaller, rounded rectangle
      return (
        <svg className="w-full h-full" viewBox="0 0 35 45" preserveAspectRatio="none">
          <path
            d="M8,8 Q8,5 12,5 L23,5 Q27,5 27,8 L27,37 Q27,40 23,40 L12,40 Q8,40 8,37 Z"
            className={`${style.includes('bg-blue') ? 'fill-blue-100 stroke-blue-400' : style.includes('bg-orange') ? 'fill-orange-100 stroke-orange-400' : style.includes('bg-green') ? 'fill-green-100 stroke-green-400' : 'fill-white stroke-gray-300'}`}
            strokeWidth="2"
          />
          <circle cx="17" cy="15" r="2" className="fill-gray-400" />
          <circle cx="17" cy="30" r="2" className="fill-gray-400" />
          <text x="17" y="25" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
            {toothNum}
          </text>
        </svg>
      );
    } else if (type === 'canine') {
      // Canine: pointed, triangular
      return (
        <svg className="w-full h-full" viewBox="0 0 30 50" preserveAspectRatio="none">
          <path
            d="M15,5 L25,20 L25,40 Q25,45 20,45 L10,45 Q5,45 5,40 L5,20 Z"
            className={`${style.includes('bg-blue') ? 'fill-blue-100 stroke-blue-400' : style.includes('bg-orange') ? 'fill-orange-100 stroke-orange-400' : style.includes('bg-green') ? 'fill-green-100 stroke-green-400' : 'fill-white stroke-gray-300'}`}
            strokeWidth="2"
          />
          <text x="15" y="30" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
            {toothNum}
          </text>
        </svg>
      );
    } else {
      // Incisor: narrow, rectangular
      return (
        <svg className="w-full h-full" viewBox="0 0 25 45" preserveAspectRatio="none">
          <path
            d="M6,8 L6,37 Q6,40 10,40 L15,40 Q19,40 19,37 L19,8 Q19,5 15,5 L10,5 Q6,5 6,8 Z"
            className={`${style.includes('bg-blue') ? 'fill-blue-100 stroke-blue-400' : style.includes('bg-orange') ? 'fill-orange-100 stroke-orange-400' : style.includes('bg-green') ? 'fill-green-100 stroke-green-400' : 'fill-white stroke-gray-300'}`}
            strokeWidth="2"
          />
          <text x="12" y="25" textAnchor="middle" className="text-xs font-semibold fill-gray-700">
            {toothNum}
          </text>
        </svg>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Upper Arch */}
      <div className="flex justify-center gap-1 items-end">
        {upperTeeth.map((toothNum) => (
          <div
            key={toothNum}
            className={`relative cursor-pointer transition-all ${getToothStyle(toothNum)}`}
            style={{ width: '32px', height: '40px' }}
            onMouseEnter={() => setHoveredTooth(toothNum.toString())}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {renderToothShape(toothNum)}
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
      <div className="flex justify-center gap-1 items-start">
        {lowerTeeth.map((toothNum) => (
          <div
            key={toothNum}
            className={`relative cursor-pointer transition-all ${getToothStyle(toothNum)}`}
            style={{ width: '32px', height: '40px' }}
            onMouseEnter={() => setHoveredTooth(toothNum.toString())}
            onMouseLeave={() => setHoveredTooth(null)}
          >
            {renderToothShape(toothNum)}
            {getToothIcon(toothNum)}
          </div>
        ))}
      </div>
    </div>
  );
}
