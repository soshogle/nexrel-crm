/**
 * Exact Arch Odontogram - matches reference futuristic dashboard image
 * Lavender/purple glassmorphism background, glow-outlined highlighted teeth,
 * type-based tooth shapes (molar/premolar/canine/incisor), click-to-select.
 * All props/connectivity/viewMode logic unchanged.
 */

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CrownRootToothShape, getToothTypeFromNum, TOOTH_WIDTH, TOOTH_HEIGHT } from '@/components/dental/crown-root-tooth-shape';

interface ToothInfo {
  condition?: 'healthy' | 'caries' | 'crown' | 'filling' | 'missing' | 'extraction' | 'implant' | 'root_canal';
  treatment?: string;
  completed?: boolean;
  date?: string;
  notes?: string;
}

type ViewMode = 'treatments' | 'conditions' | 'completed' | 'all';

interface ExactArchOdontogramProps {
  toothData?: Record<string, ToothInfo | any>;
  initialViewMode?: ViewMode;
  scanTeethIncluded?: string[];
}

// Glow + fill colors matching reference image
const COLORS = {
  blue:   { fill: 'rgba(96,165,250,0.35)',   stroke: '#60A5FA', glow: '#60A5FA' },
  orange: { fill: 'rgba(251,146,60,0.45)',   stroke: '#F97316', glow: '#F97316' },
  green:  { fill: 'rgba(52,211,153,0.45)',   stroke: '#34D399', glow: '#34D399' },
  purple: { fill: 'rgba(192,132,252,0.35)',  stroke: '#A855F7', glow: '#A855F7' },
  normal: { fill: 'normal',                  stroke: '#c4b8d0', glow: undefined as string | undefined },
};

export function ExactArchOdontogram({ toothData, initialViewMode = 'conditions', scanTeethIncluded }: ExactArchOdontogramProps) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [hoveredTooth,  setHoveredTooth]  = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  const isInScan = (toothNum: number) =>
    scanTeethIncluded?.some((t) => parseInt(t, 10) === toothNum);

  const getToothInfo = (toothNum: number): ToothInfo => {
    if (toothData?.[toothNum.toString()]) return toothData[toothNum.toString()];
    if (toothNum === 3)  return { condition: 'filling',  treatment: 'Filling',  completed: false };
    if (toothNum === 14 || toothNum === 15) return { condition: 'filling', treatment: 'Filling', completed: false };
    if (toothNum === 18 || toothNum === 19 || toothNum === 31) return { condition: 'filling', treatment: 'Filling', completed: false };
    if (toothNum === 29 || toothNum === 30) return { condition: 'implant', treatment: 'Implant', completed: true };
    return { condition: 'healthy' };
  };

  const shouldHighlightTooth = (toothNum: number, info: ToothInfo): boolean => {
    if (viewMode === 'all') return info.condition !== 'healthy';
    if (viewMode === 'treatments') return !!info.treatment && !info.completed;
    if (viewMode === 'conditions') return info.condition === 'caries' || info.condition === 'crown';
    if (viewMode === 'completed') return info.completed === true || info.condition === 'implant';
    return false;
  };

  /** Returns one of the COLORS presets based on tooth condition */
  const getToothColors = (toothNum: number, info: ToothInfo) => {
    if (!shouldHighlightTooth(toothNum, info)) return COLORS.normal;
    if (info.condition === 'implant') return COLORS.green;
    if (info.condition === 'missing') return { fill: 'rgba(156,163,175,0.5)', stroke: '#9CA3AF', glow: '#9CA3AF' };
    if (info.condition === 'caries')  return COLORS.orange;
    if (info.condition === 'crown')   return COLORS.purple;
    // fillings on 14/15 = orange, others = blue
    if ((toothNum === 14 || toothNum === 15) && info.condition === 'filling') return COLORS.orange;
    return COLORS.blue;
  };

  const getToothTooltip = (toothNum: number, info: ToothInfo): string => {
    if (info.condition === 'implant') return 'Implant';
    if (info.condition === 'filling') return 'Filling';
    if (info.condition === 'caries')  return 'Cavities';
    if (info.condition === 'crown')   return 'Crown';
    if (info.treatment)               return info.treatment;
    return '';
  };

  const ToothItem = ({ toothNum, isUpper }: { toothNum: number; isUpper: boolean }) => {
    const info = toothData ? getToothInfo(toothNum) : getToothInfo(toothNum);
    const colors = getToothColors(toothNum, info);
    const tooltip = getToothTooltip(toothNum, info);
    const isSelected = selectedTooth === toothNum;
    const isHovered  = hoveredTooth === toothNum.toString();
    const toothType  = getToothTypeFromNum(toothNum);

    const fillColor   = colors.fill === 'normal' ? '#f8f6fc' : colors.fill;
    const strokeColor = isSelected ? '#3B82F6' : colors.stroke;
    const glowColor   = isSelected ? '#60A5FA' : colors.glow;

    return (
      <div
        className={`relative flex flex-col items-center cursor-pointer transition-transform duration-200 ${
          isSelected ? 'scale-110' : 'hover:scale-105'
        }`}
        style={{ width: TOOTH_WIDTH[toothType] }}
        onClick={() => setSelectedTooth(isSelected ? null : toothNum)}
        onMouseEnter={() => setHoveredTooth(toothNum.toString())}
        onMouseLeave={() => setHoveredTooth(null)}
      >
        {isUpper && (
          <span className={`text-[9px] font-medium mb-0.5 ${glowColor ? 'text-gray-700' : 'text-gray-500'}`}>
            {toothNum}
          </span>
        )}

        <CrownRootToothShape
          isUpper={isUpper}
          toothNum={toothNum}
          toothType={toothType}
          fillColor={fillColor}
          strokeColor={strokeColor}
          glowColor={glowColor}
          showImplantLines={info.condition === 'implant'}
          isSelected={isSelected}
        />

        {!isUpper && (
          <span className={`text-[9px] font-medium mt-0.5 ${glowColor ? 'text-gray-700' : 'text-gray-500'}`}>
            {toothNum}
          </span>
        )}

        {/* Tooltip */}
        {isHovered && tooltip && (
          <div className={`absolute z-30 whitespace-nowrap bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow-lg ${
            isUpper ? '-top-7 left-1/2 -translate-x-1/2' : '-bottom-7 left-1/2 -translate-x-1/2'
          }`}>
            {tooltip}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #c8b4e0 0%, #b8a4d4 40%, #a898c8 100%)',
        padding: '16px 28px',
      }}
    >
      {/* Left arrow */}
      <button
        type="button"
        className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center shadow transition-colors"
      >
        <ChevronLeft className="h-4 w-4 text-gray-700" />
      </button>

      {/* Right arrow */}
      <button
        type="button"
        className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center shadow transition-colors"
      >
        <ChevronRight className="h-4 w-4 text-gray-700" />
      </button>

      {/* Upper arch – items align to bottom so crowns meet midline */}
      <div className="flex justify-center items-end mb-3 gap-0.5">
        {upperTeeth.map(n => <ToothItem key={n} toothNum={n} isUpper />)}
      </div>

      {/* Lower arch – items align to top */}
      <div className="flex justify-center items-start gap-0.5">
        {lowerTeeth.map(n => <ToothItem key={n} toothNum={n} isUpper={false} />)}
      </div>
    </div>
  );
}
