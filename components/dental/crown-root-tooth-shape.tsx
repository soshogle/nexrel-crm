/**
 * Crown + Root Tooth Shape - matches reference ArchOdontogram image
 * Type-aware sizing, pearl-white gradient, colored glow stroke for highlighted teeth
 */

'use client';

export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

/** Derives tooth type from Universal Numbering System (1-32) */
export function getToothTypeFromNum(toothNum: number): ToothType {
  const n = ((toothNum - 1) % 16) + 1; // normalize to 1–16
  if (n <= 3 || n >= 14) return 'molar';
  if (n <= 5 || n >= 12) return 'premolar';
  if (n === 6 || n === 11) return 'canine';
  return 'incisor';
}

/** Rendered pixel widths per tooth type (all same height, varying width) */
export const TOOTH_WIDTH: Record<ToothType, number> = {
  molar: 22,
  premolar: 18,
  canine: 15,
  incisor: 13,
};

export const TOOTH_HEIGHT = 36;

interface CrownRootToothShapeProps {
  isUpper: boolean;
  toothNum: number;
  toothType?: ToothType;
  /** Pearl-white for normal, translucent tint for highlighted */
  fillColor?: string;
  /** Colored stroke for highlighted, subtle for normal */
  strokeColor?: string;
  /** When set, applies a CSS drop-shadow glow in this color */
  glowColor?: string;
  showImplantLines?: boolean;
  isSelected?: boolean;
}

export function CrownRootToothShape({
  isUpper,
  toothNum,
  toothType,
  fillColor,
  strokeColor = '#c4b8d0',
  glowColor,
  showImplantLines = false,
  isSelected = false,
}: CrownRootToothShapeProps) {
  const type = toothType ?? getToothTypeFromNum(toothNum);
  const w = TOOTH_WIDTH[type];
  const h = TOOTH_HEIGHT;

  // CSS glow via drop-shadow
  const shadowFilter = glowColor
    ? `drop-shadow(0 0 4px ${glowColor}) drop-shadow(0 0 8px ${glowColor}80)`
    : isSelected
    ? 'drop-shadow(0 0 5px rgba(59,130,246,0.8))'
    : 'none';

  const isHighlighted = !!glowColor;
  const sw = isHighlighted ? '1.5' : '0.8';

  // Pearl-white gradient: bright top-left to slightly darker bottom-right
  const gradId = `tg-${toothNum}`;
  const gradStart = isHighlighted ? fillColor ?? '#ffffff' : '#ffffff';
  const gradMid   = isHighlighted ? fillColor ?? '#f0f0f8' : '#f4f4f8';
  const gradEnd   = isHighlighted ? fillColor ?? '#dcdcec' : '#dcdcec';

  // Crown path (viewBox 0 0 28 42)
  const crownPath = isUpper
    ? 'M14,2 C8,2 6,4 6,8 L6,16 C6,18 7,20 9,22 L10,24 L18,24 L19,22 C21,20 22,18 22,16 L22,8 C22,4 20,2 14,2 Z'
    : 'M14,40 C8,40 6,38 6,34 L6,26 C6,24 7,22 9,20 L10,18 L18,18 L19,20 C21,22 22,24 22,26 L22,34 C22,38 20,40 14,40 Z';

  // Primary root
  const rootPath = isUpper
    ? 'M10,24 L11,32 C11,36 12,40 14,40 C16,40 17,36 17,32 L18,24 Z'
    : 'M10,18 L11,10 C11,6 12,2 14,2 C16,2 17,6 17,10 L18,18 Z';

  // Second root for molars (slightly offset)
  const molarRoot2 = isUpper
    ? 'M14,24 L15,32 C15,36 16,40 18.5,40 C21,40 21.5,37 21,33 L20,24 Z'
    : 'M14,18 L15,10 C15,6 16,2 18.5,2 C21,2 21.5,5 21,9 L20,18 Z';

  // Cusp bumps for molars (tiny ellipses drawn on crown face)
  const MolarCusps = () => isUpper ? (
    <>
      <ellipse cx="9" cy="12" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx="14" cy="10" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx="19" cy="12" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
    </>
  ) : (
    <>
      <ellipse cx="9"  cy="30" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx="14" cy="32" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
      <ellipse cx="19" cy="30" rx="2" ry="1.5" fill="rgba(255,255,255,0.6)" />
    </>
  );

  // Subtle highlight sheen on crown
  const sheenPath = isUpper
    ? 'M9,5 C10,4 12,3 14,3 C16,3 18,4 19,5'
    : 'M9,37 C10,38 12,39 14,39 C16,39 18,38 19,37';

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 28 42"
      style={{ filter: shadowFilter, overflow: 'visible', flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={gradId} x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%"   stopColor={gradStart} />
          <stop offset="50%"  stopColor={gradMid} />
          <stop offset="100%" stopColor={gradEnd} />
        </linearGradient>
      </defs>

      {/* Second molar root */}
      {type === 'molar' && (
        <path d={molarRoot2} fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={sw} opacity="0.9" />
      )}

      {/* Primary root */}
      <path d={rootPath} fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={sw} opacity="0.9" />

      {/* Crown body */}
      <path d={crownPath} fill={`url(#${gradId})`} stroke={strokeColor} strokeWidth={sw} />

      {/* Molar cusps */}
      {type === 'molar' && <MolarCusps />}

      {/* Highlight sheen */}
      <path d={sheenPath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1" strokeLinecap="round" />

      {/* Implant lines */}
      {showImplantLines && (
        <g>
          <line x1="14" y1={isUpper ? 24 : 18} x2="14" y2={isUpper ? 38 : 4}  stroke="#059669" strokeWidth="1.5" />
          <line x1="11" y1={isUpper ? 28 : 14} x2="17" y2={isUpper ? 28 : 14} stroke="#059669" strokeWidth="1.5" />
          <line x1="11" y1={isUpper ? 32 : 10} x2="17" y2={isUpper ? 32 : 10} stroke="#059669" strokeWidth="1.5" />
        </g>
      )}
    </svg>
  );
}
