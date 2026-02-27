/**
 * Predictive Outcome Viewer
 *
 * 3D visualization showing progressive tooth deterioration over time.
 * Timeline slider morphs teeth between Today → 6 Months → 12 Months.
 * Integrates data from the trajectory engine (personal rates, AI x-ray
 * findings, declined treatment consequences, cost comparison).
 */

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  AlertTriangle, TrendingUp, DollarSign, Activity, Play, Pause,
  RotateCcw, Loader2, ChevronRight, Clock, Shield, X,
} from 'lucide-react';
import type { TrajectoryResult, ToothProjection, ToothCondition, ConfidenceLevel } from '@/lib/dental/trajectory-engine';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const bl = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
}

function conditionColor(c: ToothCondition): string {
  const map: Record<string, string> = {
    healthy: '#f0ece0', caries: '#8B4513', crown: '#3b82f6', filling: '#2563eb',
    missing: '#4b5563', extraction: '#7c3aed', implant: '#6366f1', root_canal: '#f97316',
  };
  return map[c] || '#f0ece0';
}

function riskBadgeColor(risk: string): string {
  if (risk === 'critical') return 'bg-red-500/20 text-red-400 border-red-500/40';
  if (risk === 'high') return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
  if (risk === 'moderate') return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  return 'bg-green-500/20 text-green-400 border-green-500/40';
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
}

type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';
function getToothType(n: number): ToothType {
  const x = ((n - 1) % 16) + 1;
  if (x <= 3 || x >= 14) return 'molar';
  if (x <= 5 || x >= 12) return 'premolar';
  if (x === 6 || x === 11) return 'canine';
  return 'incisor';
}

function getArchPosition(n: number): [number, number, number] {
  const archWidth = 7, archDepth = 3.5;
  const isUpper = n <= 16;
  const t = isUpper ? (n - 1) / 15 : (32 - n) / 15;
  const angle = (t - 0.5) * Math.PI;
  return [
    Math.sin(angle) * archWidth * 0.5,
    isUpper ? 0.7 : -0.7,
    -Math.cos(angle) * archDepth + archDepth * 0.5,
  ];
}

function getToothRotation(n: number): number {
  const isUpper = n <= 16;
  const t = isUpper ? (n - 1) / 15 : (32 - n) / 15;
  return (t - 0.5) * Math.PI;
}

// ─── 3D Tooth with deterioration ────────────────────────────────────────────────

function DeterioratingTooth({
  toothNumber, projection, timelineT, onClick, isSelected,
}: {
  toothNumber: number;
  projection: ToothProjection;
  timelineT: number; // 0 = today, 0.5 = 6mo, 1.0 = 12mo
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const type = getToothType(toothNumber);
  const pos = getArchPosition(toothNumber);
  const rot = getToothRotation(toothNumber);
  const isUpper = toothNumber <= 16;

  const dims = useMemo(() => {
    switch (type) {
      case 'molar':    return { w: 0.45, h: 0.35, d: 0.5, rootH: 0.55 };
      case 'premolar': return { w: 0.35, h: 0.35, d: 0.4, rootH: 0.5 };
      case 'canine':   return { w: 0.28, h: 0.4,  d: 0.35, rootH: 0.6 };
      case 'incisor':  return { w: 0.3,  h: 0.38, d: 0.25, rootH: 0.5 };
    }
  }, [type]);

  // Interpolate condition between timepoints
  const currentCondition = projection.currentCondition;
  const condition6 = projection.projectedCondition6mo;
  const condition12 = projection.projectedCondition12mo;

  const activeCondition = timelineT < 0.5 ? currentCondition : timelineT < 1 ? condition6 : condition12;
  const isMissing = activeCondition === 'missing' || activeCondition === 'extraction';

  // Interpolate PD-based deterioration
  const worstPd = timelineT < 0.5
    ? lerp(projection.worstCurrentPd, projection.worstPd6mo, timelineT * 2)
    : lerp(projection.worstPd6mo, projection.worstPd12mo, (timelineT - 0.5) * 2);

  // Visual degradation parameters
  const healthyColor = '#f0ece0';
  const damagedColor = worstPd >= 7 ? '#654321' : worstPd >= 5 ? '#8B7355' : worstPd >= 4 ? '#C4A882' : healthyColor;
  const toothColor = lerpColor(healthyColor, damagedColor, Math.min(timelineT * (worstPd > 3 ? 1.5 : 0.3), 1));

  // Roughness increases with damage
  const roughness = lerp(0.4, 0.9, Math.min(timelineT * (worstPd > 3 ? 1 : 0), 1));

  // Gum recession (lower gum line)
  const recessionMm = worstPd > 3 ? (worstPd - 3) * 0.08 * timelineT : 0;

  // Tooth geometry erosion for caries
  const hasActiveCaries = activeCondition === 'caries';
  const erosionScale = hasActiveCaries ? lerp(1, 0.85, timelineT) : 1;

  const rootDir = isUpper ? 1 : -1;

  // Gum severity color
  const gumColor = worstPd >= 6 ? '#c0392b' : worstPd >= 4 ? '#e67e22' : '#f4a0a0';
  const interpolatedGumColor = lerpColor('#f4a0a0', gumColor, Math.min(timelineT * 2, 1));

  // Mobility wiggle for severe cases
  const mobilityRisk = timelineT < 0.5 ? projection.mobilityRisk6mo : projection.mobilityRisk12mo;
  const wobble = mobilityRisk >= 2 ? Math.sin(Date.now() * 0.003) * 0.03 * mobilityRisk : 0;

  return (
    <group
      position={[pos[0] + wobble, pos[1], pos[2]]}
      rotation={[0, rot, 0]}
      scale={(hovered || isSelected ? 1.12 : 1)}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {!isMissing ? (
        <>
          {/* Crown — degrades over time */}
          <mesh
            position={[0, isUpper ? -recessionMm : recessionMm, 0]}
            scale={[erosionScale, erosionScale, erosionScale]}
            castShadow
          >
            <boxGeometry args={[dims.w, dims.h, dims.d]} />
            <meshStandardMaterial
              color={hasActiveCaries ? conditionColor('caries') : toothColor}
              roughness={roughness}
              metalness={0.02}
              emissive={isSelected ? '#818cf8' : hovered ? '#a855f7' : '#000000'}
              emissiveIntensity={isSelected ? 0.4 : hovered ? 0.25 : 0}
            />
          </mesh>

          {/* Cavity dark spot for caries */}
          {hasActiveCaries && (
            <mesh position={[0, isUpper ? -dims.h / 2 + 0.02 - recessionMm : dims.h / 2 - 0.02 + recessionMm, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <circleGeometry args={[dims.w * 0.2 * (0.5 + timelineT * 0.5), 12]} />
              <meshStandardMaterial color="#2c1810" roughness={1} />
            </mesh>
          )}

          {/* Root — exposed more as gum recedes */}
          <mesh
            position={[0, rootDir * (dims.h / 2 + dims.rootH / 2) + (isUpper ? -recessionMm : recessionMm), 0]}
            castShadow
          >
            <coneGeometry args={[dims.w * 0.35, dims.rootH, 8]} />
            <meshStandardMaterial
              color={lerp(0, 1, recessionMm * 3) > 0.3 ? '#b8956a' : '#e8dcc8'}
              roughness={0.6}
            />
          </mesh>

          {/* Gingival margin ring — reddens with inflammation */}
          <mesh
            position={[0, isUpper ? -dims.h / 2 - 0.02 - recessionMm : dims.h / 2 + 0.02 + recessionMm, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[dims.w * 0.35, dims.w * 0.55, 16]} />
            <meshBasicMaterial
              color={interpolatedGumColor}
              side={THREE.DoubleSide}
              transparent
              opacity={0.7}
            />
          </mesh>

          {/* Risk indicator — red glow for at-risk teeth */}
          {projection.riskLevel !== 'low' && timelineT > 0.1 && (
            <pointLight
              position={[0, 0, dims.d * 0.6]}
              color={projection.riskLevel === 'critical' ? '#ef4444' : projection.riskLevel === 'high' ? '#f97316' : '#eab308'}
              intensity={timelineT * 2}
              distance={1}
            />
          )}
        </>
      ) : (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[dims.w, dims.h, dims.d]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.8} transparent opacity={0.15} wireframe />
        </mesh>
      )}

      {/* Tooth number */}
      <Html
        position={[0, isUpper ? dims.h / 2 + dims.rootH + 0.25 : -(dims.h / 2 + dims.rootH + 0.25), 0]}
        center distanceFactor={8} style={{ pointerEvents: 'none' }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, userSelect: 'none', whiteSpace: 'nowrap',
          color: projection.riskLevel === 'critical' ? '#ef4444'
            : projection.riskLevel === 'high' ? '#f97316'
            : isSelected ? '#818cf8' : hovered ? '#9333ea' : '#94a3b8',
        }}>
          {toothNumber}
        </span>
      </Html>
    </group>
  );
}

// ─── Gum line ───────────────────────────────────────────────────────────────────

function GumLine({ isUpper, timelineT }: { isUpper: boolean; timelineT: number }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 15; i++) {
      const n = isUpper ? i + 1 : i + 17;
      const [x, , z] = getArchPosition(n);
      const recession = timelineT * 0.1; // slight overall recession
      const y = isUpper ? 0.35 - recession : -0.35 + recession;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, [isUpper, timelineT]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.08, 8, false), [curve]);

  const gumColor = lerpColor('#f4a0a0', '#c0392b', Math.min(timelineT * 0.8, 1));

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color={gumColor} roughness={0.7} transparent opacity={0.5 + timelineT * 0.2} />
    </mesh>
  );
}

// ─── 3D Scene ───────────────────────────────────────────────────────────────────

function PredictiveScene({
  trajectory, timelineT, selectedTooth, onToothClick,
}: {
  trajectory: TrajectoryResult;
  timelineT: number;
  selectedTooth: string | null;
  onToothClick: (n: string) => void;
}) {
  const teeth = useMemo(() => Array.from({ length: 32 }, (_, i) => i + 1), []);

  return (
    <>
      <ambientLight intensity={0.45} />
      <directionalLight position={[5, 8, 8]} intensity={0.8} castShadow />
      <directionalLight position={[-5, -4, 6]} intensity={0.3} />
      <pointLight position={[0, 0, 6]} intensity={0.3} />

      <Center>
        <group>
          {teeth.map(n => {
            const proj = trajectory.teeth[String(n)];
            if (!proj) return null;
            return (
              <DeterioratingTooth
                key={n}
                toothNumber={n}
                projection={proj}
                timelineT={timelineT}
                isSelected={selectedTooth === String(n)}
                onClick={() => onToothClick(String(n))}
              />
            );
          })}
          <GumLine isUpper timelineT={timelineT} />
          <GumLine isUpper={false} timelineT={timelineT} />

          {/* Time label */}
          <Html position={[0, 2.2, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <span style={{
              fontSize: 14, fontWeight: 700, userSelect: 'none',
              color: timelineT > 0.5 ? '#ef4444' : timelineT > 0 ? '#f59e0b' : '#10b981',
              textShadow: '0 0 10px rgba(0,0,0,0.5)',
            }}>
              {timelineT === 0 ? 'TODAY' : timelineT <= 0.5 ? '6 MONTHS' : '12 MONTHS'}
            </span>
          </Html>
        </group>
      </Center>

      <OrbitControls enableZoom enablePan enableRotate minDistance={4} maxDistance={18} makeDefault />
    </>
  );
}

// ─── Trend sparkline ────────────────────────────────────────────────────────────

function TrendSparkline({ data }: { data: Array<{ date: string; pd: number; type: 'measured' | 'projected' }> }) {
  if (!data || data.length === 0) return null;

  const maxPd = Math.max(...data.map(d => d.pd), 6);
  const w = 200, h = 50, pad = 4;
  const chartW = w - pad * 2, chartH = h - pad * 2;

  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * chartW,
    y: pad + chartH - (d.pd / maxPd) * chartH,
    ...d,
  }));

  const measuredPoints = points.filter(p => p.type === 'measured');
  const projectedPoints = points.filter(p => p.type === 'projected');
  const lastMeasured = measuredPoints[measuredPoints.length - 1];

  return (
    <svg width={w} height={h} className="rounded bg-gray-900/50">
      {/* Danger zone */}
      <rect x={pad} y={pad} width={chartW} height={(1 - 4 / maxPd) * chartH} fill="rgba(239,68,68,0.08)" />
      <line x1={pad} y1={pad + chartH - (4 / maxPd) * chartH} x2={w - pad} y2={pad + chartH - (4 / maxPd) * chartH} stroke="rgba(239,68,68,0.3)" strokeWidth={0.5} strokeDasharray="3,3" />

      {/* Measured line */}
      {measuredPoints.length > 1 && (
        <polyline
          points={measuredPoints.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#10b981" strokeWidth={1.5}
        />
      )}

      {/* Projected line */}
      {lastMeasured && projectedPoints.length > 0 && (
        <polyline
          points={[lastMeasured, ...projectedPoints].map(p => `${p.x},${p.y}`).join(' ')}
          fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3"
        />
      )}

      {/* Dots */}
      {points.map((p, i) => (
        <circle
          key={i} cx={p.x} cy={p.y} r={2.5}
          fill={p.type === 'measured' ? '#10b981' : '#ef4444'}
        />
      ))}

      {/* Labels */}
      {projectedPoints.map((p, i) => (
        <text key={i} x={p.x} y={p.y - 6} textAnchor="middle" fontSize={7} fill="#94a3b8" fontFamily="monospace">
          {p.pd}mm
        </text>
      ))}
    </svg>
  );
}

// ─── Tooth detail panel ─────────────────────────────────────────────────────────

function ToothDetailPanel({
  projection, trendData, onClose,
}: {
  projection: ToothProjection;
  trendData?: Array<{ date: string; pd: number; type: 'measured' | 'projected' }>;
  onClose: () => void;
}) {
  const sites = ['mesial', 'buccal', 'distal', 'lingual'] as const;

  return (
    <div className="absolute top-4 right-4 w-72 bg-gray-950/95 backdrop-blur-lg border border-indigo-500/30 rounded-xl p-4 z-10 shadow-2xl max-h-[90%] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-indigo-300">Tooth #{projection.toothNumber}</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Risk badge */}
      <Badge variant="outline" className={`text-[10px] mb-3 ${riskBadgeColor(projection.riskLevel)}`}>
        {projection.riskLevel.toUpperCase()} RISK
      </Badge>

      {/* Condition timeline */}
      <div className="mb-3 space-y-1">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Condition Progression</div>
        <div className="flex items-center gap-1 text-xs">
          <span className="px-1.5 py-0.5 rounded bg-green-900/30 text-green-400">{projection.currentCondition}</span>
          <ChevronRight className="h-3 w-3 text-gray-600" />
          <span className="px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400">{projection.projectedCondition6mo}</span>
          <ChevronRight className="h-3 w-3 text-gray-600" />
          <span className="px-1.5 py-0.5 rounded bg-red-900/30 text-red-400">{projection.projectedCondition12mo}</span>
        </div>
      </div>

      {/* PD by site */}
      <div className="mb-3">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Pocket Depths</div>
        <div className="grid grid-cols-4 gap-1 text-center">
          {sites.map(s => {
            const site = projection.sites[s];
            return (
              <div key={s} className="space-y-0.5">
                <div className="text-[9px] text-gray-500 uppercase">{s[0]}</div>
                <div className="text-[10px] text-green-400">{site.currentPd}mm</div>
                <div className="text-[10px] text-amber-400">{site.projectedPd6mo}mm</div>
                <div className="text-[10px] text-red-400">{site.projectedPd12mo}mm</div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-0.5 text-[8px] text-gray-600">
          <span className="text-green-500">now</span>
          <span className="text-amber-500">6mo</span>
          <span className="text-red-500">12mo</span>
        </div>
      </div>

      {/* Trend sparkline */}
      {trendData && trendData.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Your Trend</div>
          <TrendSparkline data={trendData} />
        </div>
      )}

      {/* Cost comparison */}
      {(projection.treatNowCost > 0 || projection.treatLaterCost12mo > 0) && (
        <div className="mb-3 p-2 rounded-lg bg-gray-900/50 border border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cost Impact</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-green-400">Treat now</span>
              <span className="text-green-400 font-mono font-bold">{formatCurrency(projection.treatNowCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">At 6 months</span>
              <span className="text-amber-400 font-mono font-bold">{formatCurrency(projection.treatLaterCost6mo)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-400">At 12 months</span>
              <span className="text-red-400 font-mono font-bold">{formatCurrency(projection.treatLaterCost12mo)}</span>
            </div>
            {projection.treatLaterCost12mo > projection.treatNowCost && (
              <div className="pt-1 border-t border-gray-800 flex justify-between">
                <span className="text-red-300 text-[10px]">Additional cost if you wait</span>
                <span className="text-red-400 font-mono font-bold">
                  +{formatCurrency(projection.treatLaterCost12mo - projection.treatNowCost)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alerts */}
      {projection.alerts.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Findings & Alerts</div>
          <div className="space-y-1">
            {projection.alerts.slice(0, 5).map((alert, i) => (
              <div key={i} className="flex gap-1.5 text-[10px] text-gray-400">
                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                <span>{alert}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface PredictiveOutcomeViewerProps {
  leadId: string;
  clinicId?: string;
}

export function PredictiveOutcomeViewer({ leadId, clinicId }: PredictiveOutcomeViewerProps) {
  const [trajectory, setTrajectory] = useState<TrajectoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timelineT, setTimelineT] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const animRef = useRef<number | null>(null);

  // Fetch trajectory data
  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ leadId });
    if (clinicId) params.set('clinicId', clinicId);

    fetch(`/api/dental/trajectory?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setTrajectory(data.trajectory);
        } else {
          setError(data.error || 'Failed to load trajectory');
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [leadId, clinicId]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let start: number | null = null;
    const duration = 6000; // 6 seconds for full animation

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      setTimelineT(progress);

      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setIsPlaying(false);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isPlaying]);

  const handlePlay = useCallback(() => {
    setTimelineT(0);
    setIsPlaying(true);
  }, []);

  if (loading) {
    return (
      <Card className="bg-gray-950 border-indigo-500/20">
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <span className="ml-3 text-sm text-gray-400">Analyzing patient history...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !trajectory) {
    return (
      <Card className="bg-gray-950 border-indigo-500/20">
        <CardContent className="flex items-center justify-center h-32">
          <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
          <span className="text-sm text-gray-400">{error || 'No trajectory data available'}</span>
        </CardContent>
      </Card>
    );
  }

  const { summary } = trajectory;
  const selectedProj = selectedTooth ? trajectory.teeth[selectedTooth] : null;
  const timeLabel = timelineT === 0 ? 'Today' : timelineT <= 0.5 ? `${Math.round(timelineT * 12)} months` : `${Math.round(timelineT * 12)} months`;

  return (
    <Card className="bg-gray-950 border-indigo-500/20 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Predictive Outcome Simulator
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Based on {trajectory.examCount} exam{trajectory.examCount !== 1 ? 's' : ''} over {trajectory.historySpanMonths} months
              <Badge variant="outline" className="ml-2 text-[9px] border-indigo-500/30 text-indigo-400">
                {trajectory.patientConfidence === 'high' ? 'High' : trajectory.patientConfidence === 'moderate' ? 'Moderate' : 'Estimated'} confidence
              </Badge>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {summary.teethAtRisk > 0 && (
              <Badge variant="outline" className={riskBadgeColor(summary.overallRisk)}>
                {summary.teethAtRisk} teeth at risk
              </Badge>
            )}
            {summary.costDelta > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                <DollarSign className="h-3 w-3 mr-0.5" />
                Save {formatCurrency(summary.costDelta)} treating now
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Timeline controls */}
        <div className="flex items-center gap-4 px-2">
          <Button
            variant="outline" size="sm"
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
            onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
          >
            {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>

          <div className="flex-1 space-y-1">
            <Slider
              value={[timelineT * 100]}
              onValueChange={([v]) => { setTimelineT(v / 100); setIsPlaying(false); }}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
              <span className={timelineT === 0 ? 'text-green-400 font-bold' : ''}>Today</span>
              <span className={timelineT > 0.2 && timelineT <= 0.6 ? 'text-amber-400 font-bold' : ''}>6 Months</span>
              <span className={timelineT > 0.8 ? 'text-red-400 font-bold' : ''}>12 Months</span>
            </div>
          </div>

          <div className="text-right min-w-[80px]">
            <div className="text-xs font-mono font-bold" style={{
              color: timelineT > 0.5 ? '#ef4444' : timelineT > 0 ? '#f59e0b' : '#10b981',
            }}>
              {timeLabel}
            </div>
          </div>
        </div>

        {/* 3D View */}
        <div className="relative w-full h-[500px] border border-indigo-500/20 rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 overflow-hidden">
          <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }}>
            <Suspense fallback={
              <Html center>
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </Html>
            }>
              <PredictiveScene
                trajectory={trajectory}
                timelineT={timelineT}
                selectedTooth={selectedTooth}
                onToothClick={n => setSelectedTooth(prev => prev === n ? null : n)}
              />
            </Suspense>
          </Canvas>

          {selectedProj && (
            <ToothDetailPanel
              projection={selectedProj}
              trendData={trajectory.trendData[selectedProj.toothNumber]}
              onClose={() => setSelectedTooth(null)}
            />
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cost Now</div>
            <div className="text-lg font-bold text-green-400 font-mono">{formatCurrency(summary.totalTreatNowCost)}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Cost at 12mo</div>
            <div className="text-lg font-bold text-red-400 font-mono">{formatCurrency(summary.totalTreatLaterCost12mo)}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Teeth at Risk</div>
            <div className="text-lg font-bold text-amber-400">{summary.teethAtRisk}</div>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Extraction Risk</div>
            <div className="text-lg font-bold text-red-400">{summary.projectedExtractions12mo}</div>
          </div>
        </div>

        {/* AI insights & alerts */}
        {summary.topAlerts.length > 0 && (
          <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Activity className="h-3 w-3" /> Key Findings
            </div>
            <div className="space-y-1.5">
              {summary.topAlerts.map((alert, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-400">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{alert}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Declined treatments */}
        {trajectory.declinedTreatments.length > 0 && (
          <div className="bg-red-950/20 rounded-lg p-3 border border-red-500/20">
            <div className="text-[10px] text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> Previously Recommended — Not Completed
            </div>
            <div className="space-y-1.5">
              {trajectory.declinedTreatments.map((d, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-400">
                  <span className="text-red-400 font-mono">#{d.toothNumber}</span>
                  <span>{d.procedure}</span>
                  <span className="text-gray-600">—</span>
                  <span className="text-amber-400">{d.consequenceNow}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* X-ray AI analysis summary */}
        {trajectory.aiAnalysisSummary.length > 0 && (
          <div className="bg-indigo-950/20 rounded-lg p-3 border border-indigo-500/20">
            <div className="text-[10px] text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Shield className="h-3 w-3" /> AI X-Ray Analysis Results
            </div>
            <div className="space-y-1.5">
              {trajectory.aiAnalysisSummary.slice(0, 4).map((line, i) => (
                <p key={i} className="text-[11px] text-gray-400 leading-relaxed">{line}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
