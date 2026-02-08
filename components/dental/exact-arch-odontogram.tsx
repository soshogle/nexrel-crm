/**
 * Exact Arch Odontogram Component - Card 1
 * 100% match to image: tooth shapes, numbering, color highlights, tooltips, arrows
 */

'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ExactArchOdontogramProps {
  toothData?: any;
}

export function ExactArchOdontogram({ toothData }: ExactArchOdontogramProps) {
  const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);

  // Tooth positions - Universal Numbering System (1-32)
  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  // Get tooth type for proper shape rendering
  const getToothType = (toothNum: number): 'molar' | 'premolar' | 'canine' | 'incisor' => {
    const num = toothNum % 8;
    if (num === 1 || num === 2 || num === 0) return 'molar';
    if (num === 3 || num === 4) return 'premolar';
    if (num === 5) return 'canine';
    return 'incisor';
  };

  // Get highlight style based on image - tooth 3 (blue), tooth 14 (orange), teeth 20 & 29 (green)
  const getToothHighlight = (toothNum: number) => {
    if (toothNum === 3) {
      return {
        bg: 'bg-blue-100',
        border: 'border-2 border-blue-500',
        shadow: 'shadow-lg shadow-blue-400/50',
        glow: true,
      };
    }
    if (toothNum === 14) {
      return {
        bg: 'bg-orange-100',
        border: 'border-2 border-orange-500',
        shadow: 'shadow-lg shadow-orange-400/50',
        glow: true,
      };
    }
    if (toothNum === 20 || toothNum === 29) {
      return {
        bg: 'bg-green-100',
        border: 'border-2 border-green-500',
        shadow: 'shadow-lg shadow-green-400/50',
        glow: true,
      };
    }
    return {
      bg: 'bg-white',
      border: 'border border-gray-300',
      shadow: '',
      glow: false,
    };
  };

  // Render tooth shape as SVG matching image exactly
  const renderToothShape = (toothNum: number) => {
    const type = getToothType(toothNum);
    const highlight = getToothHighlight(toothNum);
    const isUpper = toothNum <= 16;
    
    // Base dimensions
    const width = type === 'molar' ? 36 : type === 'premolar' ? 28 : type === 'canine' ? 24 : 20;
    const height = type === 'molar' ? 44 : type === 'premolar' ? 38 : type === 'canine' ? 42 : 36;

    // Render based on tooth type
    if (type === 'molar') {
      return (
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {highlight.glow && (
              <filter id={`glow-${toothNum}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
          {/* Molar shape - wider, rectangular with rounded corners */}
          <path
            d={`M4,8 Q4,4 8,4 L${width-8},4 Q${width-4},4 ${width-4},8 L${width-4},${height-8} Q${width-4},${height-4} ${width-8},${height-4} L8,${height-4} Q4,${height-4} 4,${height-8} Z`}
            className={`${highlight.bg} ${highlight.border} ${highlight.shadow}`}
            strokeWidth="2"
            filter={highlight.glow ? `url(#glow-${toothNum})` : undefined}
          />
          {/* Cusps/occlusal surface details */}
          <circle cx={width * 0.25} cy={height * 0.3} r="2" className="fill-gray-400" />
          <circle cx={width * 0.5} cy={height * 0.25} r="2" className="fill-gray-400" />
          <circle cx={width * 0.75} cy={height * 0.3} r="2" className="fill-gray-400" />
          <circle cx={width * 0.25} cy={height * 0.7} r="2" className="fill-gray-400" />
          <circle cx={width * 0.5} cy={height * 0.75} r="2" className="fill-gray-400" />
          <circle cx={width * 0.75} cy={height * 0.7} r="2" className="fill-gray-400" />
          {/* Tooth number */}
          <text 
            x={width / 2} 
            y={height / 2 + 4} 
            textAnchor="middle" 
            className="text-xs font-bold fill-gray-800"
            style={{ fontSize: '11px' }}
          >
            {toothNum}
          </text>
        </svg>
      );
    } else if (type === 'premolar') {
      return (
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {highlight.glow && (
              <filter id={`glow-${toothNum}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
          {/* Premolar shape - rounded rectangle */}
          <path
            d={`M6,6 Q6,4 8,4 L${width-8},4 Q${width-6},4 ${width-6},6 L${width-6},${height-6} Q${width-6},${height-4} ${width-8},${height-4} L8,${height-4} Q6,${height-4} 6,${height-6} Z`}
            className={`${highlight.bg} ${highlight.border} ${highlight.shadow}`}
            strokeWidth="2"
            filter={highlight.glow ? `url(#glow-${toothNum})` : undefined}
          />
          {/* Occlusal details */}
          <circle cx={width / 2} cy={height * 0.35} r="2" className="fill-gray-400" />
          <circle cx={width / 2} cy={height * 0.65} r="2" className="fill-gray-400" />
          {/* Tooth number */}
          <text 
            x={width / 2} 
            y={height / 2 + 4} 
            textAnchor="middle" 
            className="text-xs font-bold fill-gray-800"
            style={{ fontSize: '11px' }}
          >
            {toothNum}
          </text>
        </svg>
      );
    } else if (type === 'canine') {
      return (
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {highlight.glow && (
              <filter id={`glow-${toothNum}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
          {/* Canine shape - pointed, triangular */}
          <path
            d={`M${width/2},4 L${width-4},${height*0.4} L${width-4},${height-6} Q${width-4},${height-4} ${width-6},${height-4} L6,${height-4} Q4,${height-4} 4,${height-6} L4,${height*0.4} Z`}
            className={`${highlight.bg} ${highlight.border} ${highlight.shadow}`}
            strokeWidth="2"
            filter={highlight.glow ? `url(#glow-${toothNum})` : undefined}
          />
          {/* Tooth number */}
          <text 
            x={width / 2} 
            y={height / 2 + 4} 
            textAnchor="middle" 
            className="text-xs font-bold fill-gray-800"
            style={{ fontSize: '11px' }}
          >
            {toothNum}
          </text>
        </svg>
      );
    } else {
      // Incisor - narrow, rectangular
      return (
        <svg 
          className="w-full h-full" 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {highlight.glow && (
              <filter id={`glow-${toothNum}`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            )}
          </defs>
          {/* Incisor shape - narrow rectangle */}
          <path
            d={`M5,6 L5,${height-6} Q5,${height-4} 7,${height-4} L${width-7},${height-4} Q${width-5},${height-4} ${width-5},${height-6} L${width-5},6 Q${width-5},4 ${width-7},4 L7,4 Q5,4 5,6 Z`}
            className={`${highlight.bg} ${highlight.border} ${highlight.shadow}`}
            strokeWidth="2"
            filter={highlight.glow ? `url(#glow-${toothNum})` : undefined}
          />
          {/* Tooth number */}
          <text 
            x={width / 2} 
            y={height / 2 + 4} 
            textAnchor="middle" 
            className="text-xs font-bold fill-gray-800"
            style={{ fontSize: '11px' }}
          >
            {toothNum}
          </text>
        </svg>
      );
    }
  };

  return (
    <div className="w-full h-full">
      {/* Header with dropdown - matching image exactly */}
      <div className="mb-3 flex items-center gap-2">
        <Select defaultValue="wisely">
          <SelectTrigger className="h-7 text-xs w-28 border border-gray-300 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wisely">Wisely</SelectItem>
            <SelectItem value="treatment">Treatment</SelectItem>
            <SelectItem value="caries">Caries</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-600 whitespace-nowrap">Hover affected by: Caries</span>
      </div>

      {/* Odontogram Container */}
      <div className="relative bg-gradient-to-br from-purple-50 via-purple-100 to-blue-50 rounded-lg p-4">
        {/* Upper Arch */}
        <div className="flex justify-center gap-1.5 items-end mb-2">
          {upperTeeth.map((toothNum) => {
            const highlight = getToothHighlight(toothNum);
            const isHighlighted = toothNum === 3 || toothNum === 14;
            
            return (
              <div
                key={toothNum}
                className="relative cursor-pointer transition-all"
                style={{ 
                  width: toothNum % 8 === 1 || toothNum % 8 === 2 || toothNum % 8 === 0 ? '36px' : 
                         toothNum % 8 === 3 || toothNum % 8 === 4 ? '28px' :
                         toothNum % 8 === 5 ? '24px' : '20px',
                  height: toothNum % 8 === 1 || toothNum % 8 === 2 || toothNum % 8 === 0 ? '44px' : 
                          toothNum % 8 === 3 || toothNum % 8 === 4 ? '38px' :
                          toothNum % 8 === 5 ? '42px' : '36px',
                }}
                onMouseEnter={() => setHoveredTooth(toothNum.toString())}
                onMouseLeave={() => setHoveredTooth(null)}
              >
                {renderToothShape(toothNum)}
                
                {/* Arrow and number indicator for highlighted teeth */}
                {isHighlighted && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <svg width="12" height="8" viewBox="0 0 12 8" className="text-gray-500">
                      <path d="M6 0 L0 6 L12 6 Z" fill="currentColor" opacity="0.6" />
                    </svg>
                    <span className="text-[10px] text-gray-600 font-medium mt-0.5">
                      {toothNum === 3 ? '3' : '1'}
                    </span>
                  </div>
                )}
                
                {/* Tooltip on hover */}
                {hoveredTooth === toothNum.toString() && toothNum === 3 && (
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg z-20 whitespace-nowrap">
                    Filling (Tx)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Midline separator */}
        <div className="h-px bg-gray-300 my-2"></div>

        {/* Lower Arch */}
        <div className="flex justify-center gap-1.5 items-start">
          {lowerTeeth.map((toothNum) => {
            const highlight = getToothHighlight(toothNum);
            const isHighlighted = toothNum === 20 || toothNum === 29;
            
            return (
              <div
                key={toothNum}
                className="relative cursor-pointer transition-all"
                style={{ 
                  width: toothNum % 8 === 1 || toothNum % 8 === 2 || toothNum % 8 === 0 ? '36px' : 
                         toothNum % 8 === 3 || toothNum % 8 === 4 ? '28px' :
                         toothNum % 8 === 5 ? '24px' : '20px',
                  height: toothNum % 8 === 1 || toothNum % 8 === 2 || toothNum % 8 === 0 ? '44px' : 
                          toothNum % 8 === 3 || toothNum % 8 === 4 ? '38px' :
                          toothNum % 8 === 5 ? '42px' : '36px',
                }}
                onMouseEnter={() => setHoveredTooth(toothNum.toString())}
                onMouseLeave={() => setHoveredTooth(null)}
              >
                {renderToothShape(toothNum)}
                
                {/* Arrow and number indicator for highlighted teeth */}
                {isHighlighted && (
                  <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                    <span className="text-[10px] text-gray-600 font-medium mb-0.5">
                      {toothNum === 20 ? '20' : '29'}
                    </span>
                    <svg width="12" height="8" viewBox="0 0 12 8" className="text-gray-500">
                      <path d="M6 8 L0 2 L12 2 Z" fill="currentColor" opacity="0.6" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
