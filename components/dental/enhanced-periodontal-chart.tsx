/**
 * Enhanced Periodontal Chart - Curve Dental style
 * Odontogram-style teeth with perio overlays: PD, BOP, recession, gingival lines
 * Sidebar card: patient info, medical alerts, allergies, conditions, tooth filters
 * Per [Curve Dental checklist](https://www.curvedental.com/dental-blog/essential-periodontal-charting-checklist)
 */

'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, Pill, Stethoscope } from 'lucide-react';

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
  /** Show patient sidebar (Medical Alerts, Allergies, etc.). Use false in grid, true when chart modal is open. */
  showSidebar?: boolean;
}

const SITES = ['mesial', 'buccal', 'distal', 'lingual'] as const;
const SITE_LABELS = { mesial: 'M', buccal: 'B', distal: 'D', lingual: 'L' };

// Demo measurements when none provided - for visual preview
const DEMO_MEASUREMENTS: Record<string, ToothMeasurements> = (() => {
  const m: Record<string, ToothMeasurements> = {};
  for (let t = 1; t <= 32; t++) {
    const pd = t <= 16 ? 2 + (t % 3) : 2 + ((t - 17) % 3);
    m[String(t)] = {
      mesial: { pd, bop: t % 5 === 0 },
      buccal: { pd, bop: false },
      distal: { pd, bop: t % 7 === 0 },
      lingual: { pd, bop: false },
    };
  }
  return m;
})();

export function EnhancedPeriodontalChart({ measurements, patient, showSidebar = false }: EnhancedPeriodontalChartProps) {
  const [toothFilter, setToothFilter] = useState<'permanent' | 'missing' | 'unerupted' | 'deciduous'>('permanent');
  const [shortcutTab, setShortcutTab] = useState<'amalgam' | 'composite' | 'prophy'>('amalgam');

  const data = measurements && Object.keys(measurements).length > 0 ? measurements : DEMO_MEASUREMENTS;
  const getToothData = (toothNum: number) => data?.[String(toothNum)] || {};
  const getPdColor = (pd: number) => {
    if (pd <= 3) return 'text-green-600';
    if (pd <= 5) return 'text-amber-600';
    return 'text-red-600';
  };
  const getPdBgColor = (pd: number) => {
    if (pd <= 3) return 'bg-green-500/20';
    if (pd <= 5) return 'bg-amber-500/20';
    return 'bg-red-500/20';
  };

  const upperTeeth = Array.from({ length: 16 }, (_, i) => i + 1);
  const lowerTeeth = Array.from({ length: 16 }, (_, i) => i + 17);

  // Simple tooth shape SVG - matches odontogram style
  const ToothShape = ({ toothNum, isUpper, hasData, maxPd }: { toothNum: number; isUpper: boolean; hasData: boolean; maxPd: number }) => {
    const w = 36;
    const h = 40;
    const fill = hasData ? (maxPd <= 3 ? '#dcfce7' : maxPd <= 5 ? '#fef3c7' : '#fee2e2') : '#f8fafc';
    const stroke = hasData ? (maxPd <= 3 ? '#22c55e' : maxPd <= 5 ? '#f59e0b' : '#ef4444') : '#e2e8f0';
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`tooth-grad-${toothNum}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fefefe" />
            <stop offset="100%" stopColor="#e8e8e8" />
          </linearGradient>
        </defs>
        <path
          d={`M${w*0.15},${h*0.1} C${w*0.1},${h*0.15} ${w*0.08},${h*0.25} ${w*0.12},${h*0.4} C${w*0.1},${h*0.55} ${w*0.15},${h*0.7} ${w*0.2},${h*0.82} L${w*0.8},${h*0.82} C${w*0.85},${h*0.7} ${w*0.9},${h*0.55} ${w*0.88},${h*0.4} C${w*0.92},${h*0.25} ${w*0.9},${h*0.15} ${w*0.85},${h*0.1} C${w*0.78},${h*0.06} ${w*0.22},${h*0.06} ${w*0.15},${h*0.1} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth="1.2"
        />
      </svg>
    );
  };

  const PerioTooth = ({ toothNum, isUpper }: { toothNum: number; isUpper: boolean }) => {
    const data = getToothData(toothNum);
    const sites = SITES.map(s => ({ site: s, d: data[s as keyof ToothMeasurements] }));
    const hasData = sites.some(s => s.d?.pd !== undefined && s.d.pd > 0);
    const maxPd = Math.max(...sites.map(s => s.d?.pd || 0), 0);
    const hasBOP = sites.some(s => s.d?.bop);

    return (
      <div className="flex flex-col items-center relative group">
        <span className={`text-[9px] font-medium text-gray-600 mb-0.5 ${isUpper ? '' : 'order-3 mt-0.5'}`}>{toothNum}</span>
        <div className="relative w-10 h-12 flex-shrink-0">
          <ToothShape toothNum={toothNum} isUpper={isUpper} hasData={hasData} maxPd={maxPd} />
          {/* Gingival margin line */}
          {hasData && (
            <div className="absolute left-1 right-1 h-0.5 bg-slate-500/70 rounded" style={{ top: '52%' }} />
          )}
          {/* PD values - 4 sites around tooth: M(top-left), B(top-right), D(bottom-right), L(bottom-left) */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5">
              {sites.map(({ site, d }) => (
                <div key={site} className={`flex flex-col items-center justify-center rounded-sm ${getPdBgColor(d?.pd || 0)} ${d?.pd ? 'border border-current/20' : ''}`}>
                  <span className={`text-[8px] font-bold leading-none ${d?.pd ? getPdColor(d.pd) : 'text-gray-400'}`}>
                    {d?.pd ?? '-'}
                  </span>
                  <span className="text-[6px] text-gray-500">{SITE_LABELS[site]}</span>
                  {d?.bop && <span className="text-[6px] text-red-500">●</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
        {hasBOP && (
          <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500 border-2 border-white shadow-sm" title="Bleeding on Probing" />
        )}
      </div>
    );
  };

  return (
    <div className="flex gap-3 w-full min-h-[320px]">
      {/* Sidebar Card - Curve style (only when showSidebar) */}
      {showSidebar && (
      <div className="w-44 flex-shrink-0 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="p-2.5 space-y-2.5 text-xs">
          <div className="font-semibold text-gray-900 truncate">{patient?.name || 'Patient'}</div>
          <div className="text-gray-600">
            <span className="text-[10px]">Provider:</span>
            <div className="text-blue-600 underline cursor-pointer">{patient?.provider || 'Select provider'}</div>
          </div>
          <div className="text-gray-600">
            <span className="text-[10px]">Fee Guide:</span>
            <div className="text-blue-600 underline cursor-pointer">{patient?.feeGuide || 'Standard UCR'}</div>
          </div>

          {/* Medical Alerts */}
          <div>
            <div className="flex items-center gap-1 text-[10px] font-medium text-gray-700 mb-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Medical Alerts
            </div>
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded border border-red-300 bg-red-50" />
              <div className="w-4 h-4 rounded border border-green-300 bg-green-50" />
              <div className="w-4 h-4 rounded border border-blue-300 bg-blue-50" />
            </div>
          </div>

          {/* Allergies */}
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-0.5">Allergies</div>
            <div className="space-y-0.5">
              {(patient?.allergies || ['Aspirin', 'Latex']).map((a, i) => (
                <div key={i} className="flex items-center gap-1">
                  <Pill className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                  <span className="text-[10px]">{a}</span>
                </div>
              ))}
              <div className="text-[10px] text-gray-400">Other: ___</div>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-0.5">Conditions</div>
            <div className="text-[10px] text-gray-500">Other: {patient?.conditions || '___'}</div>
          </div>

          {/* Medications */}
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-0.5">Medications</div>
            <div className="space-y-0.5">
              {(patient?.medications || ['Alprazolam (Xanax)']).map((m, i) => (
                <div key={i} className="text-[10px]">{m}</div>
              ))}
            </div>
          </div>

          {/* Tooth Status Filters - Curve style */}
          <div>
            <div className="text-[10px] font-medium text-gray-700 mb-1">Tooth Status</div>
            <div className="grid grid-cols-2 gap-1">
              {(['permanent', 'missing', 'unerupted', 'deciduous'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setToothFilter(f)}
                  className={`px-1.5 py-0.5 rounded text-[9px] capitalize border transition-colors ${
                    toothFilter === f ? 'bg-blue-100 border-blue-400 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Procedure Shortcuts */}
          <div>
            <div className="flex gap-0.5 mb-1">
              {(['amalgam', 'composite', 'prophy'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setShortcutTab(t)}
                  className={`px-1.5 py-0.5 rounded text-[9px] capitalize ${
                    shortcutTab === t ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  {t === 'prophy' ? 'NP Prophy&Exam' : t}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1">
              {['2S Onlay', 'Crown', '2 BW'].map(p => (
                <button key={p} className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] hover:bg-gray-200">
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Main Chart - Odontogram style with perio overlays */}
      <div className="flex-1 min-w-0">
        <div className="relative bg-gradient-to-br from-purple-50 via-purple-100 to-blue-50 rounded-lg p-3">
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
            <button type="button" className="p-1 rounded hover:bg-white/60 text-gray-600">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10">
            <button type="button" className="p-1 rounded hover:bg-white/60 text-gray-600">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Top controls */}
          <div className="flex justify-center gap-1 mb-2">
            <button className="p-1 rounded-full bg-white/80 shadow-sm hover:bg-white">
              <Stethoscope className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>

          {/* Upper arch */}
          <div className="flex justify-center gap-0.5 items-end mb-1 px-6">
            {upperTeeth.map(n => (
              <PerioTooth key={n} toothNum={n} isUpper />
            ))}
          </div>

          <div className="h-px bg-gray-300 my-1" />

          {/* Lower arch */}
          <div className="flex justify-center gap-0.5 items-start px-6">
            {lowerTeeth.map(n => (
              <PerioTooth key={n} toothNum={n} isUpper={false} />
            ))}
          </div>
        </div>

        {/* Legend - Curve checklist items */}
        <div className="flex flex-wrap gap-3 justify-center pt-2 mt-2 border-t border-gray-200 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-green-500" />
            <span>1-3mm (Healthy)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-amber-500" />
            <span>4-5mm (Moderate)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded bg-red-500" />
            <span>&gt;5mm (Problem)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-500">●</span>
            <span>BOP</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-slate-400 rounded" />
            <span>Gingival margin</span>
          </div>
        </div>
      </div>
    </div>
  );
}
