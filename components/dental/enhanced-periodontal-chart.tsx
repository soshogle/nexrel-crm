/**
 * Enhanced Periodontal Chart - Realistic teeth design matching Arch Odontogram
 * Anatomically accurate teeth with PD data blocks, gingival margin, BOP indicators
 * Per [Curve Dental checklist](https://www.curvedental.com/dental-blog/essential-periodontal-charting-checklist)
 */

'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CrownRootToothShape, getToothTypeFromNum } from '@/components/dental/crown-root-tooth-shape';

interface SiteData {
  pd?: number;
  bop?: boolean;
  recession?: number;
  mobility?: number;
}

interface ToothMeasurements {
  mesial?: SiteData;
  buccal?: SiteData;
  distal?: SiteData;
  lingual?: SiteData;
}

interface EnhancedPeriodontalChartProps {
  measurements?: Record<string, ToothMeasurements>;
  patient?: {
    name?: string;
    provider?: string;
    feeGuide?: string;
    allergies?: string[];
    conditions?: string;
    medications?: string[];
    medicalAlerts?: string[];
  };
}

const SITES = ['mesial', 'buccal', 'distal', 'lingual'] as const;
const SITE_LABELS = { mesial: 'M', buccal: 'B', distal: 'D', lingual: 'L' };

// Realistic healthy-adult fallback — mirrors DB seed (PD 2-3mm, isolated BOP on 6M, 11M, 22B, 27B)
const DEMO_MEASUREMENTS: Record<string, ToothMeasurements> = (() => {
  const m: Record<string, ToothMeasurements> = {};
  const bopSites: Record<number, string[]> = {
    6: ['mesial'], 11: ['mesial'], 22: ['buccal'], 27: ['buccal'],
  };
  for (let t = 1; t <= 32; t++) {
    const pd = (t % 4 === 0) ? 3 : 2;
    const bops = bopSites[t] || [];
    m[String(t)] = {
      mesial:  { pd, bop: bops.includes('mesial'), recession: 0 },
      buccal:  { pd, bop: bops.includes('buccal'), recession: 0 },
      distal:  { pd: pd === 3 ? 3 : 2, bop: false, recession: 0 },
      lingual: { pd: 2, bop: false, recession: 0 },
    };
  }
  return m;
})();

export function EnhancedPeriodontalChart({ measurements, patient: _patient }: EnhancedPeriodontalChartProps) {
  const data = measurements && Object.keys(measurements).length > 0 ? measurements : DEMO_MEASUREMENTS;
  const getToothData = (toothNum: number) => data?.[String(toothNum)] || {};
  const getPdBgColor = (pd: number, isPlaceholder = false) => {
    if (isPlaceholder || pd === 0) return 'bg-white/10';
    if (pd <= 3) return 'bg-green-500';
    if (pd <= 6) return 'bg-amber-500';
    return 'bg-red-500';
  };
  const getPdTextColor = (pd: number) => {
    if (pd === 0 || pd === undefined) return 'text-gray-500';
    return 'text-white';
  };

  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  const PERIO_H = 28;

  // Data grid: 4 rows (M, B, D, L), one compact value per row
  const PdDataGrid = ({ sites }: { sites: { site: string; d: SiteData | undefined }[] }) => (
    <div className="flex flex-col gap-px w-full">
      {sites.map(({ site, d }) => {
        const pd = d?.pd ?? 0;
        const hasData = d?.pd !== undefined && d.pd > 0;
        return (
          <div key={site} className="flex items-center gap-px">
            <span className="text-[5px] font-medium text-white/50 shrink-0" style={{ width: 6 }}>
              {SITE_LABELS[site as keyof typeof SITE_LABELS]}
            </span>
            <div
              className={`flex-1 flex items-center justify-center h-2.5 rounded-sm ${getPdBgColor(pd, !hasData)} ${hasData ? getPdTextColor(d!.pd!) : 'text-white/40'}`}
              title={d?.pd ? `${site}: ${d.pd}mm` : `${site}: Not measured`}
            >
              <span className="text-[6px] font-bold leading-none">{hasData ? pd : '–'}</span>
            </div>
            {d?.bop && <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />}
          </div>
        );
      })}
    </div>
  );

  const PerioTooth = ({ toothNum, isUpper }: { toothNum: number; isUpper: boolean }) => {
    const data = getToothData(toothNum);
    const sites = SITES.map(s => ({ site: s, d: data[s as keyof ToothMeasurements] }));
    const hasData = sites.some(s => s.d?.pd !== undefined && s.d.pd > 0);

    const ToothSvg = () => (
      <div className="relative flex-shrink-0 mx-auto" style={{ width: 18, height: PERIO_H }}>
        <svg
          width={18}
          height={PERIO_H}
          viewBox="0 0 28 42"
          style={{ filter: 'drop-shadow(0 0 4px rgba(192,132,252,0.4))', overflow: 'visible' }}
        >
          <defs>
            <linearGradient id={`pg-${toothNum}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%"   stopColor="#ffffff" />
              <stop offset="60%"  stopColor="#f0f0f8" />
              <stop offset="100%" stopColor="#d8d8e8" />
            </linearGradient>
          </defs>
          <path
            d={isUpper
              ? 'M14,2 C8,2 6,4 6,8 L6,16 C6,18 7,20 9,22 L10,24 L18,24 L19,22 C21,20 22,18 22,16 L22,8 C22,4 20,2 14,2 Z'
              : 'M14,40 C8,40 6,38 6,34 L6,26 C6,24 7,22 9,20 L10,18 L18,18 L19,20 C21,22 22,24 22,26 L22,34 C22,38 20,40 14,40 Z'}
            fill={`url(#pg-${toothNum})`} stroke="#8b7eb8" strokeWidth="0.8"
          />
          <path
            d={isUpper
              ? 'M10,24 L11,32 C11,36 12,40 14,40 C16,40 17,36 17,32 L18,24 Z'
              : 'M10,18 L11,10 C11,6 12,2 14,2 C16,2 17,6 17,10 L18,18 Z'}
            fill={`url(#pg-${toothNum})`} stroke="#8b7eb8" strokeWidth="0.8" opacity="0.9"
          />
        </svg>
        {hasData && (
          <svg className="absolute inset-0 w-full overflow-visible pointer-events-none" viewBox="0 0 28 42" preserveAspectRatio="none">
            <path d="M2,21 Q14,18 26,21" fill="none" stroke="rgba(192,132,252,0.8)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        )}
      </div>
    );

    return (
      <div className="flex flex-col items-center overflow-hidden" style={{ flex: '1 1 0%', minWidth: 0 }}>
        {isUpper ? (
          <>
            <span className="text-[7px] font-medium text-white/80 leading-none mb-0.5">{toothNum}</span>
            <ToothSvg />
            <div className="mt-0.5 w-full px-px"><PdDataGrid sites={sites} /></div>
          </>
        ) : (
          <>
            <div className="mb-0.5 w-full px-px"><PdDataGrid sites={sites} /></div>
            <ToothSvg />
            <span className="text-[7px] font-medium text-white/80 leading-none mt-0.5">{toothNum}</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="relative bg-gradient-to-br from-indigo-950 via-purple-900 to-blue-950 rounded-lg p-2">
        <div className="flex items-end mb-1">
          {upperTeeth.map(n => <PerioTooth key={n} toothNum={n} isUpper />)}
        </div>
        <div className="h-px bg-white/20 my-2" />
        <div className="flex items-start">
          {lowerTeeth.map(n => <PerioTooth key={n} toothNum={n} isUpper={false} />)}
        </div>
      </div>

        <div className="flex items-center justify-between py-2 mt-2 rounded-lg bg-slate-900/90 text-white text-[10px] px-3">
          <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/90 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span>1-3mm Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>4-6mm Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span>&gt;6mm Problem</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-red-400 text-xs">●</span>
              <span>BOP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-1.5" viewBox="0 0 24 6" preserveAspectRatio="none">
                <path d="M0,3 Q6,1 12,3 T24,3" fill="none" stroke="rgba(147,51,234,0.8)" strokeWidth="1" strokeLinecap="round" />
              </svg>
              <span>Gingival margin</span>
            </div>
          </div>
          <button type="button" className="p-1.5 rounded hover:bg-white/10 text-white/90 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
    </div>
  );
}
