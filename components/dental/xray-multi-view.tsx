/**
 * Multi-Angle X-Ray Viewer
 *
 * Combines three views:
 * 1. Film Mount — classic dental lightbox with x-rays in anatomical positions
 * 2. Tooth-Centric — click a tooth to see every x-ray angle covering it
 * 3. Timeline — same region over time with AI diff
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Grid3x3, Focus, Clock, Loader2, ZoomIn, ZoomOut, X, ChevronLeft,
  ChevronRight, AlertTriangle, Brain, Maximize2, Minimize2, Search,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface XRay {
  id: string;
  xrayType: string;
  teethIncluded: string[];
  dateTaken: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  fullUrl?: string;
  imageUrl?: string;
  aiAnalysis?: {
    findings?: string;
    confidence?: number;
    recommendations?: string;
    model?: string;
    analyzedAt?: string;
  };
  notes?: string;
}

interface XRayMultiViewProps {
  leadId: string;
  clinicId?: string;
  onOpenDicom?: (xray: XRay) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getImageUrl(xray: XRay): string {
  return xray.fullUrl || xray.previewUrl || xray.thumbnailUrl || xray.imageUrl || `/api/dental/xrays/${xray.id}/image`;
}

function getThumbUrl(xray: XRay): string {
  return xray.thumbnailUrl || xray.previewUrl || xray.fullUrl || xray.imageUrl || `/api/dental/xrays/${xray.id}/image`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function xrayTypeLabel(t: string): string {
  const map: Record<string, string> = {
    PANORAMIC: 'Panoramic', BITEWING: 'Bitewing', PERIAPICAL: 'Periapical',
    CEPHALOMETRIC: 'Cephalometric', CBCT: 'CBCT',
  };
  return map[t] || t;
}

function xrayTypeBadgeColor(t: string): string {
  const map: Record<string, string> = {
    PANORAMIC: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    BITEWING: 'bg-green-500/20 text-green-400 border-green-500/30',
    PERIAPICAL: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    CEPHALOMETRIC: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    CBCT: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  };
  return map[t] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// Film mount positions — maps x-ray type + teeth to anatomical grid positions
type MountSlot = {
  row: number;
  col: number;
  colSpan: number;
  label: string;
};

function getFilmMountSlots(xrays: XRay[]): Array<XRay & { slot: MountSlot }> {
  const result: Array<XRay & { slot: MountSlot }> = [];

  // Sort by type priority and tooth position
  const sorted = [...xrays].sort((a, b) => {
    const typePriority: Record<string, number> = { PANORAMIC: 0, CEPHALOMETRIC: 1, BITEWING: 2, PERIAPICAL: 3, CBCT: 4 };
    return (typePriority[a.xrayType] ?? 5) - (typePriority[b.xrayType] ?? 5);
  });

  let periapicalRow1Col = 0;
  let periapicalRow3Col = 0;
  let bitewingCol = 0;

  for (const xray of sorted) {
    const teeth = xray.teethIncluded.map(Number).filter(n => !isNaN(n));
    const hasUpper = teeth.some(t => t >= 1 && t <= 16);
    const hasLower = teeth.some(t => t >= 17 && t <= 32);
    const isRight = teeth.some(t => (t >= 1 && t <= 8) || (t >= 25 && t <= 32));

    switch (xray.xrayType) {
      case 'PANORAMIC':
        result.push({ ...xray, slot: { row: 0, col: 0, colSpan: 8, label: 'Panoramic' } });
        break;

      case 'CEPHALOMETRIC':
        result.push({ ...xray, slot: { row: 0, col: 0, colSpan: 4, label: 'Cephalometric' } });
        break;

      case 'BITEWING':
        result.push({
          ...xray,
          slot: {
            row: 2,
            col: isRight ? (bitewingCol < 2 ? bitewingCol * 2 : 0) : 4 + (bitewingCol < 2 ? 0 : (bitewingCol - 2) * 2),
            colSpan: 2,
            label: `Bitewing ${isRight ? 'R' : 'L'}`,
          },
        });
        bitewingCol++;
        break;

      case 'PERIAPICAL':
        if (hasUpper) {
          result.push({
            ...xray,
            slot: { row: 1, col: periapicalRow1Col, colSpan: 1, label: `PA #${teeth.join(',')}` },
          });
          periapicalRow1Col++;
        } else {
          result.push({
            ...xray,
            slot: { row: 3, col: periapicalRow3Col, colSpan: 1, label: `PA #${teeth.join(',')}` },
          });
          periapicalRow3Col++;
        }
        break;

      default:
        result.push({ ...xray, slot: { row: 4, col: 0, colSpan: 2, label: xrayTypeLabel(xray.xrayType) } });
        break;
    }
  }

  return result;
}

// ─── Image Viewer with zoom/pan ─────────────────────────────────────────────────

function XRayImage({
  src, alt, className, onClick, showZoom,
}: {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  showZoom?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative group overflow-hidden bg-black ${className || ''}`} onClick={onClick}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs">
          Image unavailable
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      )}
      {showZoom && loaded && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer">
          <Maximize2 className="h-5 w-5 text-white drop-shadow-lg" />
        </div>
      )}
    </div>
  );
}

// ─── Expanded Image Lightbox ────────────────────────────────────────────────────

function Lightbox({
  xray, xrays, onClose, onNavigate, onOpenDicom,
}: {
  xray: XRay;
  xrays: XRay[];
  onClose: () => void;
  onNavigate: (xray: XRay) => void;
  onOpenDicom?: (xray: XRay) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const currentIndex = xrays.findIndex(x => x.id === xray.id);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(xrays[currentIndex - 1]);
  }, [currentIndex, xrays, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < xrays.length - 1) onNavigate(xrays[currentIndex + 1]);
  }, [currentIndex, xrays, onNavigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handlePrev, handleNext]);

  const analysis = xray.aiAnalysis;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex" onClick={onClose}>
      <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
        {/* Navigation arrows */}
        {currentIndex > 0 && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            onClick={handlePrev}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        {currentIndex < xrays.length - 1 && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
            onClick={handleNext}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Image */}
        <div className="max-w-[80vw] max-h-[85vh] overflow-auto">
          <img
            src={getImageUrl(xray)}
            alt={`${xrayTypeLabel(xray.xrayType)} X-Ray`}
            className="max-w-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
            draggable={false}
          />
        </div>

        {/* Top bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={xrayTypeBadgeColor(xray.xrayType)}>
              {xrayTypeLabel(xray.xrayType)}
            </Badge>
            <span className="text-sm text-gray-300">{formatDate(xray.dateTaken)}</span>
            <span className="text-xs text-gray-500">
              Teeth: {xray.teethIncluded.join(', ')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-gray-400 min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
            <button className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" onClick={() => setZoom(z => Math.min(3, z + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </button>
            {onOpenDicom && (
              <button className="px-3 py-1.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs flex items-center gap-1" onClick={() => onOpenDicom(xray)}>
                <Brain className="h-3.5 w-3.5" /> Open in Viewer
              </button>
            )}
            <button className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Film counter */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500">
          {currentIndex + 1} / {xrays.length}
        </div>
      </div>

      {/* AI Analysis sidebar */}
      {analysis && (
        <div className="w-80 bg-gray-950 border-l border-gray-800 p-4 overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="text-xs text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5" /> AI Analysis
          </div>

          {analysis.confidence && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Confidence</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${analysis.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs text-indigo-400 font-mono">{Math.round(analysis.confidence * 100)}%</span>
              </div>
            </div>
          )}

          {analysis.findings && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Findings</div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.findings}</p>
            </div>
          )}

          {analysis.recommendations && (
            <div className="mb-3">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Recommendations</div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.recommendations}</p>
            </div>
          )}

          {analysis.model && (
            <div className="text-[9px] text-gray-600 mt-4">
              Model: {analysis.model} {analysis.analyzedAt && `• ${formatDate(analysis.analyzedAt)}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── View 1: Film Mount Layout ──────────────────────────────────────────────────

function FilmMountView({ xrays, onSelect, onOpenDicom }: { xrays: XRay[]; onSelect: (x: XRay) => void; onOpenDicom?: (x: XRay) => void }) {
  const mounted = useMemo(() => getFilmMountSlots(xrays), [xrays]);

  // Group by xray type for organized display
  const panoramics = xrays.filter(x => x.xrayType === 'PANORAMIC');
  const bitewings = xrays.filter(x => x.xrayType === 'BITEWING');
  const periapicals = xrays.filter(x => x.xrayType === 'PERIAPICAL');
  const cephalometrics = xrays.filter(x => x.xrayType === 'CEPHALOMETRIC');
  const cbcts = xrays.filter(x => x.xrayType === 'CBCT');

  // Sort bitewings: right side first
  const sortedBitewings = [...bitewings].sort((a, b) => {
    const aTeeth = a.teethIncluded.map(Number);
    const bTeeth = b.teethIncluded.map(Number);
    const aRight = aTeeth.some(t => t <= 8 || t >= 25);
    const bRight = bTeeth.some(t => t <= 8 || t >= 25);
    if (aRight && !bRight) return -1;
    if (!aRight && bRight) return 1;
    return Math.min(...aTeeth) - Math.min(...bTeeth);
  });

  return (
    <div className="space-y-3">
      {/* Panoramic — full width */}
      {panoramics.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Panoramic</div>
          <div className="grid grid-cols-1 gap-2">
            {panoramics.map(xray => (
              <div key={xray.id} className="relative rounded-lg overflow-hidden border border-gray-700 hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                <XRayImage src={getThumbUrl(xray)} alt="Panoramic" className="h-48 w-full" showZoom />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={`text-[9px] ${xrayTypeBadgeColor('PANORAMIC')}`}>Panoramic</Badge>
                    <span className="text-[10px] text-gray-400">{formatDate(xray.dateTaken)}</span>
                  </div>
                  {xray.aiAnalysis && (
                    <div className="flex items-center gap-1 mt-1">
                      <Brain className="h-3 w-3 text-indigo-400" />
                      <span className="text-[9px] text-indigo-400">AI Analyzed</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upper periapicals */}
      {periapicals.filter(x => x.teethIncluded.some(t => Number(t) <= 16)).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Upper Arch Periapicals</div>
          <div className="grid grid-cols-4 gap-1.5">
            {periapicals.filter(x => x.teethIncluded.some(t => Number(t) <= 16)).map(xray => (
              <div key={xray.id} className="relative rounded-md overflow-hidden border border-gray-700 hover:border-amber-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                <XRayImage src={getThumbUrl(xray)} alt={`PA ${xray.teethIncluded.join(',')}`} className="h-20" showZoom />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
                  <span className="text-[8px] text-gray-400">#{xray.teethIncluded.join(',')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bitewings — middle row */}
      {sortedBitewings.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Bitewings</div>
          <div className="grid grid-cols-2 gap-2">
            {sortedBitewings.map(xray => {
              const teeth = xray.teethIncluded.map(Number);
              const isRight = teeth.some(t => t <= 8 || t >= 25);
              return (
                <div key={xray.id} className="relative rounded-md overflow-hidden border border-gray-700 hover:border-green-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                  <XRayImage src={getThumbUrl(xray)} alt={`Bitewing ${isRight ? 'R' : 'L'}`} className="h-28" showZoom />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[8px] ${xrayTypeBadgeColor('BITEWING')}`}>
                        BW {isRight ? 'Right' : 'Left'}
                      </Badge>
                      <span className="text-[9px] text-gray-400">{formatDate(xray.dateTaken)}</span>
                    </div>
                    {xray.aiAnalysis && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Brain className="h-2.5 w-2.5 text-indigo-400" />
                        <span className="text-[8px] text-indigo-400">AI Analyzed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lower periapicals */}
      {periapicals.filter(x => x.teethIncluded.some(t => Number(t) >= 17)).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Lower Arch Periapicals</div>
          <div className="grid grid-cols-4 gap-1.5">
            {periapicals.filter(x => x.teethIncluded.some(t => Number(t) >= 17)).map(xray => (
              <div key={xray.id} className="relative rounded-md overflow-hidden border border-gray-700 hover:border-amber-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                <XRayImage src={getThumbUrl(xray)} alt={`PA ${xray.teethIncluded.join(',')}`} className="h-20" showZoom />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1.5 py-0.5">
                  <span className="text-[8px] text-gray-400">#{xray.teethIncluded.join(',')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cephalometric / CBCT */}
      {(cephalometrics.length > 0 || cbcts.length > 0) && (
        <div className="space-y-1.5">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider px-1">Specialty Imaging</div>
          <div className="grid grid-cols-2 gap-2">
            {[...cephalometrics, ...cbcts].map(xray => (
              <div key={xray.id} className="relative rounded-md overflow-hidden border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                <XRayImage src={getThumbUrl(xray)} alt={xrayTypeLabel(xray.xrayType)} className="h-28" showZoom />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                  <Badge variant="outline" className={`text-[8px] ${xrayTypeBadgeColor(xray.xrayType)}`}>
                    {xrayTypeLabel(xray.xrayType)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {xrays.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">No x-rays available for this patient</div>
      )}
    </div>
  );
}

// ─── View 2: Tooth-Centric Cross-Reference ──────────────────────────────────────

function ToothCentricView({ xrays, onSelect, onOpenDicom }: { xrays: XRay[]; onSelect: (x: XRay) => void; onOpenDicom?: (x: XRay) => void }) {
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  // Build tooth → xrays index
  const toothIndex = useMemo(() => {
    const idx: Record<number, XRay[]> = {};
    for (const xray of xrays) {
      for (const t of xray.teethIncluded) {
        const num = Number(t);
        if (!isNaN(num) && num >= 1 && num <= 32) {
          if (!idx[num]) idx[num] = [];
          if (!idx[num].find(x => x.id === xray.id)) {
            idx[num].push(xray);
          }
        }
      }
    }
    return idx;
  }, [xrays]);

  const selectedXrays = selectedTooth ? (toothIndex[selectedTooth] || []) : [];

  // Combined AI findings for selected tooth
  const combinedFindings = useMemo(() => {
    if (!selectedTooth) return [];
    return selectedXrays
      .filter(x => x.aiAnalysis?.findings)
      .map(x => ({
        type: x.xrayType,
        date: x.dateTaken,
        findings: x.aiAnalysis!.findings!,
        recommendations: x.aiAnalysis?.recommendations,
        confidence: x.aiAnalysis?.confidence,
      }));
  }, [selectedTooth, selectedXrays]);

  return (
    <div className="space-y-4">
      {/* Tooth selector — arch layout */}
      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Select a tooth to see all x-ray angles</div>

        {/* Upper arch */}
        <div className="flex justify-center gap-0.5 mb-1">
          {Array.from({ length: 16 }, (_, i) => i + 1).map(n => {
            const count = toothIndex[n]?.length || 0;
            const isSelected = selectedTooth === n;
            return (
              <button
                key={n}
                onClick={() => setSelectedTooth(prev => prev === n ? null : n)}
                className={`w-7 h-8 rounded text-[9px] font-mono font-bold transition-all relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                    : count > 0
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800/50 text-gray-600 cursor-default'
                }`}
                disabled={count === 0}
              >
                {n}
                {count > 0 && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 text-[7px] text-white flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lower arch */}
        <div className="flex justify-center gap-0.5">
          {Array.from({ length: 16 }, (_, i) => i + 17).map(n => {
            const count = toothIndex[n]?.length || 0;
            const isSelected = selectedTooth === n;
            return (
              <button
                key={n}
                onClick={() => setSelectedTooth(prev => prev === n ? null : n)}
                className={`w-7 h-8 rounded text-[9px] font-mono font-bold transition-all relative ${
                  isSelected
                    ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                    : count > 0
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-800/50 text-gray-600 cursor-default'
                }`}
                disabled={count === 0}
              >
                {n}
                {count > 0 && !isSelected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 text-[7px] text-white flex items-center justify-center">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected tooth's x-rays */}
      {selectedTooth && selectedXrays.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-indigo-300">Tooth #{selectedTooth}</span>
            <span className="text-xs text-gray-500">{selectedXrays.length} angle{selectedXrays.length !== 1 ? 's' : ''} available</span>
          </div>

          {/* Side-by-side x-ray comparison */}
          <div className={`grid gap-2 ${selectedXrays.length === 1 ? 'grid-cols-1' : selectedXrays.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {selectedXrays.map(xray => (
              <div key={xray.id} className="relative rounded-lg overflow-hidden border border-gray-700 hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                <XRayImage
                  src={getImageUrl(xray)}
                  alt={`${xrayTypeLabel(xray.xrayType)} — Tooth #${selectedTooth}`}
                  className="h-44"
                  showZoom
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                  <Badge variant="outline" className={`text-[8px] ${xrayTypeBadgeColor(xray.xrayType)}`}>
                    {xrayTypeLabel(xray.xrayType)}
                  </Badge>
                  <span className="text-[9px] text-gray-400 ml-2">{formatDate(xray.dateTaken)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Combined AI findings */}
          {combinedFindings.length > 0 && (
            <div className="bg-indigo-950/20 rounded-lg p-3 border border-indigo-500/20">
              <div className="text-[10px] text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" /> Combined AI Analysis — Tooth #{selectedTooth}
              </div>
              <div className="space-y-2.5">
                {combinedFindings.map((f, i) => (
                  <div key={i} className="border-l-2 border-indigo-500/30 pl-2.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className={`text-[7px] ${xrayTypeBadgeColor(f.type)}`}>
                        {xrayTypeLabel(f.type)}
                      </Badge>
                      <span className="text-[9px] text-gray-500">{formatDate(f.date)}</span>
                      {f.confidence && (
                        <span className="text-[9px] text-indigo-400 font-mono">{Math.round(f.confidence * 100)}%</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{f.findings}</p>
                    {f.recommendations && (
                      <p className="text-[10px] text-amber-400/80 mt-0.5">{f.recommendations}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTooth && selectedXrays.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">No x-rays cover tooth #{selectedTooth}</div>
      )}

      {!selectedTooth && (
        <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center gap-2">
          <Search className="h-6 w-6 text-gray-600" />
          Tap a tooth number above to see all x-ray angles
        </div>
      )}
    </div>
  );
}

// ─── View 3: Timeline Comparison ────────────────────────────────────────────────

function TimelineView({ xrays, onSelect }: { xrays: XRay[]; onSelect: (x: XRay) => void }) {
  // Group x-rays by type+region, then sort by date
  const groups = useMemo(() => {
    const map: Record<string, XRay[]> = {};

    for (const xray of xrays) {
      const teeth = xray.teethIncluded.map(Number).sort((a, b) => a - b);
      const regionKey = teeth.length > 16 ? 'full-mouth' : teeth.join(',');
      const key = `${xray.xrayType}|${regionKey}`;

      if (!map[key]) map[key] = [];
      map[key].push(xray);
    }

    // Sort each group by date and only keep groups with 1+ entries
    return Object.entries(map)
      .map(([key, items]) => ({
        key,
        type: key.split('|')[0],
        region: key.split('|')[1],
        items: items.sort((a, b) => new Date(a.dateTaken).getTime() - new Date(b.dateTaken).getTime()),
      }))
      .filter(g => g.items.length >= 1)
      .sort((a, b) => {
        const typePriority: Record<string, number> = { PANORAMIC: 0, BITEWING: 1, PERIAPICAL: 2, CEPHALOMETRIC: 3, CBCT: 4 };
        return (typePriority[a.type] ?? 5) - (typePriority[b.type] ?? 5);
      });
  }, [xrays]);

  if (groups.length === 0) {
    return <div className="text-center py-16 text-gray-500 text-sm">No x-rays available for timeline</div>;
  }

  return (
    <div className="space-y-4">
      {groups.map(group => {
        const regionLabel = group.region === 'full-mouth'
          ? 'Full Mouth'
          : `Teeth #${group.region}`;

        return (
          <div key={group.key} className="bg-gray-900/30 rounded-lg p-3 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className={`text-[9px] ${xrayTypeBadgeColor(group.type)}`}>
                {xrayTypeLabel(group.type)}
              </Badge>
              <span className="text-xs text-gray-400">{regionLabel}</span>
              {group.items.length > 1 && (
                <span className="text-[9px] text-gray-600">
                  {formatDate(group.items[0].dateTaken)} → {formatDate(group.items[group.items.length - 1].dateTaken)}
                </span>
              )}
            </div>

            {/* Timeline strip */}
            <div className="relative">
              {group.items.length > 1 && (
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-700 -translate-y-1/2 z-0" />
              )}
              <div className={`grid gap-3 relative z-10 ${
                group.items.length === 1 ? 'grid-cols-1' : group.items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}>
                {group.items.map((xray, idx) => (
                  <div key={xray.id} className="space-y-1">
                    <div className="relative rounded-md overflow-hidden border border-gray-700 hover:border-indigo-500/50 transition-all cursor-pointer" onClick={() => onSelect(xray)}>
                      <XRayImage
                        src={getThumbUrl(xray)}
                        alt={`${xrayTypeLabel(xray.xrayType)} — ${formatDate(xray.dateTaken)}`}
                        className={group.type === 'PANORAMIC' ? 'h-32' : 'h-24'}
                        showZoom
                      />
                      {xray.aiAnalysis && (
                        <div className="absolute top-1 right-1">
                          <Brain className="h-3 w-3 text-indigo-400" />
                        </div>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] text-gray-400">{formatDate(xray.dateTaken)}</div>
                      {idx === 0 && group.items.length > 1 && (
                        <div className="text-[8px] text-gray-600">Earliest</div>
                      )}
                      {idx === group.items.length - 1 && group.items.length > 1 && (
                        <div className="text-[8px] text-indigo-400">Latest</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI diff between first and last if both analyzed */}
            {group.items.length > 1 && group.items[0].aiAnalysis?.findings && group.items[group.items.length - 1].aiAnalysis?.findings && (
              <div className="mt-2 bg-gray-800/50 rounded-md p-2 border border-gray-700">
                <div className="text-[9px] text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> AI Comparison
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[8px] text-gray-500 mb-0.5">{formatDate(group.items[0].dateTaken)}</div>
                    <p className="text-[10px] text-gray-400 line-clamp-3">{group.items[0].aiAnalysis!.findings}</p>
                  </div>
                  <div>
                    <div className="text-[8px] text-indigo-400 mb-0.5">{formatDate(group.items[group.items.length - 1].dateTaken)}</div>
                    <p className="text-[10px] text-gray-300 line-clamp-3">{group.items[group.items.length - 1].aiAnalysis!.findings}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function XRayMultiView({ leadId, clinicId, onOpenDicom }: XRayMultiViewProps) {
  const [xrays, setXrays] = useState<XRay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'mount' | 'tooth' | 'timeline'>('mount');
  const [lightboxXray, setLightboxXray] = useState<XRay | null>(null);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);

    const params = new URLSearchParams({ leadId });
    if (clinicId) params.set('clinicId', clinicId);

    fetch(`/api/dental/xrays?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.success !== false) {
          const list = Array.isArray(data) ? data : Array.isArray(data.xrays) ? data.xrays : [];
          setXrays(list);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [leadId, clinicId]);

  const handleSelect = useCallback((xray: XRay) => {
    setLightboxXray(xray);
  }, []);

  if (loading) {
    return (
      <Card className="bg-gray-950 border-indigo-500/20">
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 text-indigo-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-400">Loading x-rays...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gray-950 border-indigo-500/20 overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Grid3x3 className="h-4 w-4 text-indigo-400" />
                Multi-Angle X-Ray Viewer
              </CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                {xrays.length} x-ray{xrays.length !== 1 ? 's' : ''} •{' '}
                {[...new Set(xrays.map(x => x.xrayType))].map(t => xrayTypeLabel(t)).join(', ')}
              </p>
            </div>

            <Tabs value={activeView} onValueChange={v => setActiveView(v as any)}>
              <TabsList className="bg-gray-900 border border-gray-800 h-8">
                <TabsTrigger value="mount" className="text-xs h-6 px-2.5 data-[state=active]:bg-indigo-600">
                  <Grid3x3 className="h-3 w-3 mr-1" /> Film Mount
                </TabsTrigger>
                <TabsTrigger value="tooth" className="text-xs h-6 px-2.5 data-[state=active]:bg-indigo-600">
                  <Focus className="h-3 w-3 mr-1" /> By Tooth
                </TabsTrigger>
                <TabsTrigger value="timeline" className="text-xs h-6 px-2.5 data-[state=active]:bg-indigo-600">
                  <Clock className="h-3 w-3 mr-1" /> Timeline
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {activeView === 'mount' && <FilmMountView xrays={xrays} onSelect={handleSelect} onOpenDicom={onOpenDicom} />}
          {activeView === 'tooth' && <ToothCentricView xrays={xrays} onSelect={handleSelect} onOpenDicom={onOpenDicom} />}
          {activeView === 'timeline' && <TimelineView xrays={xrays} onSelect={handleSelect} />}
        </CardContent>
      </Card>

      {lightboxXray && (
        <Lightbox
          xray={lightboxXray}
          xrays={xrays}
          onClose={() => setLightboxXray(null)}
          onNavigate={setLightboxXray}
          onOpenDicom={onOpenDicom}
        />
      )}
    </>
  );
}
