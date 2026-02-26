/**
 * Shared Realistic Tooth Shape - EXACT match to ExactArchOdontogram
 * Used by Periodontal Chart so both show identical anatomically accurate teeth
 */

'use client';

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

export function getToothType(toothNum: number): ToothType {
  const num = toothNum % 8;
  if (num === 1 || num === 2 || num === 0) return 'molar';
  if (num === 3 || num === 4) return 'premolar';
  if (num === 5) return 'canine';
  return 'incisor';
}

export function getToothDimensions(type: ToothType) {
  return {
    width: type === 'molar' ? 44 : type === 'premolar' ? 34 : type === 'canine' ? 28 : 24,
    height: type === 'molar' ? 52 : type === 'premolar' ? 46 : type === 'canine' ? 50 : 44,
  };
}

interface RealisticToothShapeProps {
  toothNum: number;
  idPrefix?: string;
  glow?: boolean;
}

export function RealisticToothShape({ toothNum, idPrefix = 'perio', glow = true }: RealisticToothShapeProps) {
  const type = getToothType(toothNum);
  const { width, height } = getToothDimensions(type);
  const prefix = `${idPrefix}-${toothNum}`;

  const fill = `url(#tooth-shade-${prefix})`;
  const stroke = '#d1d5db';
  const strokeWidth = 1;

  if (type === 'molar') {
    return (
      <svg
        className={`w-full h-full ${glow ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.35)]' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`tooth-shade-${prefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefefe" stopOpacity="1" />
            <stop offset="50%" stopColor="#f5f5f5" stopOpacity="1" />
            <stop offset="100%" stopColor="#e8e8e8" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={`M${width*0.12},${height*0.15} C${width*0.08},${height*0.12} ${width*0.05},${height*0.18} ${width*0.08},${height*0.25} C${width*0.06},${height*0.35} ${width*0.08},${height*0.45} ${width*0.12},${height*0.55} C${width*0.1},${height*0.65} ${width*0.12},${height*0.75} ${width*0.15},${height*0.82} C${width*0.18},${height*0.88} ${width*0.22},${height*0.92} ${width*0.28},${height*0.95} L${width*0.72},${height*0.95} C${width*0.78},${height*0.92} ${width*0.82},${height*0.88} ${width*0.85},${height*0.82} C${width*0.88},${height*0.75} ${width*0.9},${height*0.65} ${width*0.88},${height*0.55} C${width*0.92},${height*0.45} ${width*0.94},${height*0.35} ${width*0.92},${height*0.25} C${width*0.95},${height*0.18} ${width*0.92},${height*0.12} ${width*0.88},${height*0.15} C${width*0.85},${height*0.1} ${width*0.78},${height*0.08} ${width*0.72},${height*0.05} L${width*0.28},${height*0.05} C${width*0.22},${height*0.08} ${width*0.15},${height*0.1} ${width*0.12},${height*0.15} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <ellipse cx={width * 0.22} cy={height * 0.28} rx="3.5" ry="3" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.22} cy={height * 0.28} rx="2" ry="1.5" fill="#e5e7eb" opacity="0.9" />
        <ellipse cx={width * 0.35} cy={height * 0.24} rx="3" ry="2.5" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.35} cy={height * 0.24} rx="1.5" ry="1.2" fill="#e5e7eb" opacity="0.9" />
        <path d={`M${width*0.28},${height*0.26} Q${width*0.4},${height*0.22} ${width*0.5},${height*0.23} Q${width*0.6},${height*0.22} ${width*0.72},${height*0.26}`} fill="none" stroke="#9ca3af" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
        <ellipse cx={width * 0.65} cy={height * 0.24} rx="3" ry="2.5" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.65} cy={height * 0.24} rx="1.5" ry="1.2" fill="#e5e7eb" opacity="0.9" />
        <ellipse cx={width * 0.78} cy={height * 0.28} rx="3.5" ry="3" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.78} cy={height * 0.28} rx="2" ry="1.5" fill="#e5e7eb" opacity="0.9" />
        <ellipse cx={width * 0.22} cy={height * 0.72} rx="3.5" ry="3" fill="#d1d5db" opacity="0.7" />
        <ellipse cx={width * 0.5} cy={height * 0.76} rx="3" ry="2.5" fill="#d1d5db" opacity="0.7" />
        <ellipse cx={width * 0.78} cy={height * 0.72} rx="3.5" ry="3" fill="#d1d5db" opacity="0.7" />
      </svg>
    );
  }

  if (type === 'premolar') {
    return (
      <svg
        className={`w-full h-full ${glow ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.35)]' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`tooth-shade-${prefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefefe" stopOpacity="1" />
            <stop offset="50%" stopColor="#f5f5f5" stopOpacity="1" />
            <stop offset="100%" stopColor="#e8e8e8" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={`M${width*0.15},${height*0.12} C${width*0.1},${height*0.08} ${width*0.08},${height*0.15} ${width*0.1},${height*0.22} C${width*0.08},${height*0.3} ${width*0.1},${height*0.4} ${width*0.15},${height*0.5} C${width*0.12},${height*0.6} ${width*0.15},${height*0.7} ${width*0.2},${height*0.78} C${width*0.25},${height*0.85} ${width*0.32},${height*0.9} ${width*0.4},${height*0.92} L${width*0.6},${height*0.92} C${width*0.68},${height*0.9} ${width*0.75},${height*0.85} ${width*0.8},${height*0.78} C${width*0.85},${height*0.7} ${width*0.88},${height*0.6} ${width*0.85},${height*0.5} C${width*0.9},${height*0.4} ${width*0.92},${height*0.3} ${width*0.9},${height*0.22} C${width*0.92},${height*0.15} ${width*0.9},${height*0.08} ${width*0.85},${height*0.12} C${width*0.82},${height*0.08} ${width*0.75},${height*0.05} ${width*0.68},${height*0.05} L${width*0.32},${height*0.05} C${width*0.25},${height*0.05} ${width*0.18},${height*0.08} ${width*0.15},${height*0.12} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <ellipse cx={width * 0.35} cy={height * 0.3} rx="3.5" ry="3" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.35} cy={height * 0.3} rx="2" ry="1.5" fill="#e5e7eb" opacity="0.9" />
        <ellipse cx={width * 0.65} cy={height * 0.3} rx="3.5" ry="3" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width * 0.65} cy={height * 0.3} rx="2" ry="1.5" fill="#e5e7eb" opacity="0.9" />
        <path d={`M${width*0.38},${height*0.32} Q${width*0.5},${height*0.28} ${width*0.62},${height*0.32}`} fill="none" stroke="#9ca3af" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'canine') {
    return (
      <svg
        className={`w-full h-full ${glow ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.35)]' : ''}`}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={`tooth-shade-${prefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefefe" stopOpacity="1" />
            <stop offset="50%" stopColor="#f5f5f5" stopOpacity="1" />
            <stop offset="100%" stopColor="#e8e8e8" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path
          d={`M${width/2},${height*0.05} C${width*0.55},${height*0.08} ${width*0.6},${height*0.15} ${width*0.58},${height*0.25} L${width*0.88},${height*0.38} C${width*0.92},${height*0.42} ${width*0.9},${height*0.48} ${width*0.85},${height*0.52} C${width*0.88},${height*0.6} ${width*0.85},${height*0.68} ${width*0.8},${height*0.75} C${width*0.75},${height*0.82} ${width*0.68},${height*0.88} ${width*0.6},${height*0.92} L${width*0.4},${height*0.92} C${width*0.32},${height*0.88} ${width*0.25},${height*0.82} ${width*0.2},${height*0.75} C${width*0.15},${height*0.68} ${width*0.12},${height*0.6} ${width*0.15},${height*0.52} C${width*0.1},${height*0.48} ${width*0.08},${height*0.42} ${width*0.12},${height*0.38} L${width*0.42},${height*0.25} C${width*0.4},${height*0.15} ${width*0.45},${height*0.08} ${width*0.5},${height*0.05} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
        <ellipse cx={width / 2} cy={height * 0.25} rx="2.5" ry="2" fill="#d1d5db" opacity="0.8" />
        <ellipse cx={width / 2} cy={height * 0.25} rx="1.2" ry="1" fill="#e5e7eb" opacity="0.9" />
      </svg>
    );
  }

  return (
    <svg
      className={`w-full h-full ${glow ? 'drop-shadow-[0_0_8px_rgba(192,132,252,0.35)]' : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={`tooth-shade-${prefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fefefe" stopOpacity="1" />
          <stop offset="50%" stopColor="#f5f5f5" stopOpacity="1" />
          <stop offset="100%" stopColor="#e8e8e8" stopOpacity="1" />
        </linearGradient>
      </defs>
      <path
        d={`M${width*0.2},${height*0.12} C${width*0.15},${height*0.08} ${width*0.12},${height*0.15} ${width*0.15},${height*0.22} L${width*0.15},${height*0.75} C${width*0.12},${height*0.82} ${width*0.15},${height*0.88} ${width*0.2},${height*0.92} L${width*0.8},${height*0.92} C${width*0.85},${height*0.88} ${width*0.88},${height*0.82} ${width*0.85},${height*0.75} L${width*0.85},${height*0.22} C${width*0.88},${height*0.15} ${width*0.85},${height*0.08} ${width*0.8},${height*0.12} C${width*0.75},${height*0.08} ${width*0.5},${height*0.05} ${width*0.5},${height*0.05} C${width*0.5},${height*0.05} ${width*0.25},${height*0.08} ${width*0.2},${height*0.12} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <path d={`M${width*0.22},${height*0.12} Q${width*0.5},${height*0.08} ${width*0.78},${height*0.12}`} fill="none" stroke="#9ca3af" strokeWidth="1.2" opacity="0.5" strokeLinecap="round" />
      <path d={`M${width*0.5},${height*0.12} L${width*0.5},${height*0.3}`} fill="none" stroke="#d1d5db" strokeWidth="0.8" opacity="0.4" />
    </svg>
  );
}
