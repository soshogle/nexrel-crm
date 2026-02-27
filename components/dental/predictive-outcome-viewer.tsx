/**
 * Predictive Outcome Viewer
 *
 * 3D visualization showing progressive tooth deterioration over time.
 * Timeline slider morphs teeth between Today → 6 Months → 12 Months.
 * Uses anatomically-shaped tooth geometry with realistic gum tissue.
 */

'use client';

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Center, Html, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  AlertTriangle, TrendingUp, DollarSign, Activity, Play, Pause,
  RotateCcw, Loader2, ChevronRight, Clock, Shield, X,
} from 'lucide-react';
import type { TrajectoryResult, ToothProjection, ToothCondition } from '@/lib/dental/trajectory-engine';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const [r1, g1, b1c] = parse(a);
  const [r2, g2, b2c] = parse(b);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const bl = Math.round(lerp(b1c, b2c, t));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`;
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

// ─── Anatomical tooth crown profiles (LatheGeometry) ────────────────────────

function createToothCrownGeometry(type: ToothType, scale: number = 1): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const s = scale;

  switch (type) {
    case 'molar': {
      // Broad, flat crown with bulging sides and cusped top
      pts.push(new THREE.Vector2(0, -0.22 * s));
      pts.push(new THREE.Vector2(0.16 * s, -0.20 * s));
      pts.push(new THREE.Vector2(0.24 * s, -0.12 * s));
      pts.push(new THREE.Vector2(0.26 * s, 0));
      pts.push(new THREE.Vector2(0.25 * s, 0.08 * s));
      pts.push(new THREE.Vector2(0.22 * s, 0.14 * s));
      pts.push(new THREE.Vector2(0.18 * s, 0.18 * s));
      pts.push(new THREE.Vector2(0.12 * s, 0.19 * s));
      pts.push(new THREE.Vector2(0.06 * s, 0.17 * s));
      pts.push(new THREE.Vector2(0, 0.20 * s));
      break;
    }
    case 'premolar': {
      pts.push(new THREE.Vector2(0, -0.20 * s));
      pts.push(new THREE.Vector2(0.12 * s, -0.18 * s));
      pts.push(new THREE.Vector2(0.19 * s, -0.10 * s));
      pts.push(new THREE.Vector2(0.20 * s, 0));
      pts.push(new THREE.Vector2(0.19 * s, 0.10 * s));
      pts.push(new THREE.Vector2(0.15 * s, 0.16 * s));
      pts.push(new THREE.Vector2(0.08 * s, 0.20 * s));
      pts.push(new THREE.Vector2(0, 0.22 * s));
      break;
    }
    case 'canine': {
      // Pointed tip, conical crown
      pts.push(new THREE.Vector2(0, -0.22 * s));
      pts.push(new THREE.Vector2(0.10 * s, -0.18 * s));
      pts.push(new THREE.Vector2(0.16 * s, -0.08 * s));
      pts.push(new THREE.Vector2(0.17 * s, 0));
      pts.push(new THREE.Vector2(0.15 * s, 0.10 * s));
      pts.push(new THREE.Vector2(0.10 * s, 0.20 * s));
      pts.push(new THREE.Vector2(0.04 * s, 0.26 * s));
      pts.push(new THREE.Vector2(0, 0.28 * s));
      break;
    }
    case 'incisor': {
      // Thin, flat, shovel-shaped
      pts.push(new THREE.Vector2(0, -0.18 * s));
      pts.push(new THREE.Vector2(0.08 * s, -0.16 * s));
      pts.push(new THREE.Vector2(0.14 * s, -0.08 * s));
      pts.push(new THREE.Vector2(0.15 * s, 0));
      pts.push(new THREE.Vector2(0.14 * s, 0.08 * s));
      pts.push(new THREE.Vector2(0.12 * s, 0.14 * s));
      pts.push(new THREE.Vector2(0.10 * s, 0.20 * s));
      pts.push(new THREE.Vector2(0.08 * s, 0.24 * s));
      pts.push(new THREE.Vector2(0, 0.26 * s));
      break;
    }
  }

  return new THREE.LatheGeometry(pts, 16);
}

function createRootGeometry(type: ToothType, scale: number = 1): THREE.ConeGeometry {
  const s = scale;
  switch (type) {
    case 'molar':    return new THREE.ConeGeometry(0.16 * s, 0.55 * s, 12);
    case 'premolar': return new THREE.ConeGeometry(0.13 * s, 0.50 * s, 10);
    case 'canine':   return new THREE.ConeGeometry(0.10 * s, 0.60 * s, 10);
    case 'incisor':  return new THREE.ConeGeometry(0.09 * s, 0.48 * s, 10);
  }
}

// ─── Enamel material helpers ────────────────────────────────────────────────

const ENAMEL_HEALTHY = '#e8e0d0';
const ENAMEL_SLIGHT = '#d4c8a8';
const ENAMEL_MODERATE = '#c4a87c';
const ENAMEL_SEVERE = '#9e7c50';
const ENAMEL_CARIES = '#6b4423';
const DENTIN_COLOR = '#c8a878';
const ROOT_COLOR = '#d4c098';
const GUM_HEALTHY = '#e8a0a0';
const GUM_INFLAMED = '#c84040';
const FILLING_COLOR = '#b0b8c8';
const CROWN_METAL = '#d8dce8';

// ─── Realistic Tooth ────────────────────────────────────────────────────────────

function RealisticTooth({
  toothNumber, projection, timelineT, onClick, isSelected,
}: {
  toothNumber: number;
  projection: ToothProjection;
  timelineT: number;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meshRef = useRef<THREE.Group>(null);
  const type = getToothType(toothNumber);
  const pos = getArchPosition(toothNumber);
  const rot = getToothRotation(toothNumber);
  const isUpper = toothNumber <= 16;

  const crownGeo = useMemo(() => createToothCrownGeometry(type, 1), [type]);
  const rootGeo = useMemo(() => createRootGeometry(type, 1), [type]);

  const activeCondition = timelineT < 0.5
    ? projection.currentCondition
    : timelineT < 1 ? projection.projectedCondition6mo : projection.projectedCondition12mo;
  const isMissing = activeCondition === 'missing' || activeCondition === 'extraction';

  // PD interpolation
  const worstPd = timelineT < 0.5
    ? lerp(projection.worstCurrentPd, projection.worstPd6mo, timelineT * 2)
    : lerp(projection.worstPd6mo, projection.worstPd12mo, (timelineT - 0.5) * 2);

  // Enamel color based on deterioration
  const enamelColor = useMemo(() => {
    if (activeCondition === 'caries') return ENAMEL_CARIES;
    if (activeCondition === 'crown') return CROWN_METAL;
    if (activeCondition === 'filling') return FILLING_COLOR;
    if (activeCondition === 'implant') return '#a0a8b8';

    const degradation = clamp(timelineT * (worstPd > 3 ? 1.5 : 0.2), 0, 1);
    if (degradation > 0.7) return ENAMEL_SEVERE;
    if (degradation > 0.4) return ENAMEL_MODERATE;
    if (degradation > 0.15) return ENAMEL_SLIGHT;
    return ENAMEL_HEALTHY;
  }, [activeCondition, timelineT, worstPd]);

  // Surface properties
  const roughness = activeCondition === 'crown' ? 0.15
    : activeCondition === 'filling' ? 0.3
    : lerp(0.25, 0.75, clamp(timelineT * (worstPd > 3 ? 1 : 0.2), 0, 1));
  const metalness = activeCondition === 'crown' ? 0.4
    : activeCondition === 'filling' ? 0.2
    : 0.05;

  // Gum recession
  const recessionMm = worstPd > 3 ? (worstPd - 3) * 0.06 * timelineT : 0;

  // Gum color per tooth
  const gumIntensity = clamp(worstPd > 3 ? (worstPd - 3) * 0.25 * timelineT : 0, 0, 1);
  const gumColor = lerpColor(GUM_HEALTHY, GUM_INFLAMED, gumIntensity);

  // Root dimensions
  const rootHeight = type === 'molar' ? 0.55 : type === 'canine' ? 0.6 : 0.5;
  const crownHeight = type === 'molar' ? 0.20 : type === 'canine' ? 0.28 : 0.22;
  const rootDir = isUpper ? 1 : -1;

  // Cavity size for caries
  const cavitySize = activeCondition === 'caries' ? 0.04 + timelineT * 0.08 : 0;

  // Mobility wobble
  const mobilityRisk = timelineT < 0.5 ? projection.mobilityRisk6mo : projection.mobilityRisk12mo;

  useFrame(({ clock }) => {
    if (meshRef.current && mobilityRisk >= 2) {
      meshRef.current.rotation.z = Math.sin(clock.elapsedTime * 2) * 0.02 * mobilityRisk;
    }
  });

  return (
    <group
      position={pos}
      rotation={[0, rot, 0]}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      <group ref={meshRef} scale={hovered || isSelected ? 1.08 : 1}>
        {!isMissing ? (
          <>
            {/* Crown — anatomical lathe shape */}
            <mesh
              geometry={crownGeo}
              position={[0, isUpper ? -recessionMm : recessionMm, 0]}
              rotation={[isUpper ? 0 : Math.PI, 0, 0]}
              castShadow receiveShadow
            >
              <meshPhysicalMaterial
                color={enamelColor}
                roughness={roughness}
                metalness={metalness}
                clearcoat={activeCondition === 'crown' ? 0.8 : 0.3}
                clearcoatRoughness={0.2}
                envMapIntensity={0.6}
                emissive={isSelected ? '#6366f1' : hovered ? '#8b5cf6' : '#000000'}
                emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
              />
            </mesh>

            {/* Cavity dark spot */}
            {cavitySize > 0 && (
              <mesh
                position={[0, (isUpper ? crownHeight - 0.02 : -(crownHeight - 0.02)) + (isUpper ? -recessionMm : recessionMm), 0]}
                rotation={[Math.PI / 2, 0, 0]}
              >
                <circleGeometry args={[cavitySize, 12]} />
                <meshStandardMaterial color="#1a0e08" roughness={1} />
              </mesh>
            )}

            {/* Root */}
            <mesh
              geometry={rootGeo}
              position={[0, rootDir * (crownHeight + rootHeight / 2) + (isUpper ? -recessionMm : recessionMm), 0]}
              rotation={[isUpper ? Math.PI : 0, 0, 0]}
              castShadow
            >
              <meshStandardMaterial
                color={recessionMm > 0.08 ? DENTIN_COLOR : ROOT_COLOR}
                roughness={0.6}
                metalness={0.02}
              />
            </mesh>

            {/* Gum cuff — thicker, anatomical ring with tissue look */}
            <mesh
              position={[0, (isUpper ? -(crownHeight * 0.5) : crownHeight * 0.5) + (isUpper ? -recessionMm : recessionMm), 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry args={[type === 'molar' ? 0.18 : type === 'premolar' ? 0.14 : 0.11, 0.04, 8, 16]} />
              <meshStandardMaterial
                color={gumColor}
                roughness={0.75}
                metalness={0}
                transparent
                opacity={0.85}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Risk glow */}
            {projection.riskLevel !== 'low' && timelineT > 0.15 && (
              <pointLight
                position={[0, 0, 0.25]}
                color={projection.riskLevel === 'critical' ? '#ef4444' : projection.riskLevel === 'high' ? '#f97316' : '#eab308'}
                intensity={timelineT * 1.5}
                distance={0.8}
              />
            )}
          </>
        ) : (
          // Ghost for missing teeth
          <mesh position={[0, 0, 0]}>
            <mesh geometry={crownGeo} rotation={[isUpper ? 0 : Math.PI, 0, 0]}>
              <meshStandardMaterial color="#64748b" roughness={0.8} transparent opacity={0.1} wireframe />
            </mesh>
          </mesh>
        )}
      </group>

      {/* Tooth number */}
      <Html
        position={[0, isUpper ? crownHeight + rootHeight + 0.2 : -(crownHeight + rootHeight + 0.2), 0]}
        center distanceFactor={8} style={{ pointerEvents: 'none' }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, userSelect: 'none', whiteSpace: 'nowrap',
          color: projection.riskLevel === 'critical' ? '#ef4444'
            : projection.riskLevel === 'high' ? '#f97316'
            : isSelected ? '#818cf8' : hovered ? '#9333ea' : '#6b7280',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}>
          {toothNumber}
        </span>
      </Html>
    </group>
  );
}

// ─── Gum tissue band ────────────────────────────────────────────────────────────

function GumTissue({ isUpper, timelineT }: { isUpper: boolean; timelineT: number }) {
  const geo = useMemo(() => {
    const shape = new THREE.Shape();
    const pts: Array<[number, number]> = [];

    for (let i = 0; i <= 30; i++) {
      const n = isUpper ? 1 + (i / 30) * 15 : 17 + (i / 30) * 15;
      const intN = Math.round(n);
      const [x, , z] = getArchPosition(intN);
      pts.push([x, z]);
    }

    if (pts.length > 0) {
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        shape.lineTo(pts[i][0], pts[i][1]);
      }
      // Close with inner contour (narrower arch)
      for (let i = pts.length - 1; i >= 0; i--) {
        shape.lineTo(pts[i][0] * 0.6, pts[i][1] * 0.6 + (isUpper ? 0.3 : -0.3));
      }
      shape.closePath();
    }

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [isUpper]);

  const recession = timelineT * 0.08;
  const y = isUpper ? 0.12 - recession : -0.24 + recession;

  const gumColor = lerpColor('#d88888', '#b84040', clamp(timelineT * 0.6, 0, 1));

  return (
    <mesh geometry={geo} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <meshPhysicalMaterial
        color={gumColor}
        roughness={0.7}
        metalness={0}
        clearcoat={0.1}
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
      />
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
      {/* Dental-clinic lighting */}
      <ambientLight intensity={0.35} color="#f5f0e8" />
      <directionalLight position={[4, 6, 8]} intensity={0.9} color="#ffffff" castShadow />
      <directionalLight position={[-3, -2, 6]} intensity={0.25} color="#e0e8ff" />
      <pointLight position={[0, 0, 5]} intensity={0.4} color="#ffffff" />
      <hemisphereLight args={['#dce8f0', '#2a1810', 0.3]} />

      <Center>
        <group>
          {teeth.map(n => {
            const proj = trajectory.teeth[String(n)];
            if (!proj) return null;
            return (
              <RealisticTooth
                key={n}
                toothNumber={n}
                projection={proj}
                timelineT={timelineT}
                isSelected={selectedTooth === String(n)}
                onClick={() => onToothClick(String(n))}
              />
            );
          })}

          <GumTissue isUpper timelineT={timelineT} />
          <GumTissue isUpper={false} timelineT={timelineT} />

          {/* Time label */}
          <Html position={[0, 2.2, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div style={{
              fontSize: 13, fontWeight: 700, userSelect: 'none', letterSpacing: '0.1em',
              color: timelineT > 0.5 ? '#ef4444' : timelineT > 0.05 ? '#f59e0b' : '#10b981',
              textShadow: '0 2px 12px rgba(0,0,0,0.7)',
              background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 6,
            }}>
              {timelineT <= 0.05 ? 'TODAY' : timelineT <= 0.5 ? '6 MONTHS' : '12 MONTHS'}
            </div>
          </Html>
        </group>
      </Center>

      <OrbitControls
        enableZoom enablePan enableRotate
        minDistance={4} maxDistance={18}
        minPolarAngle={Math.PI * 0.15}
        maxPolarAngle={Math.PI * 0.85}
        makeDefault
      />
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
      <rect x={pad} y={pad} width={chartW} height={(1 - 4 / maxPd) * chartH} fill="rgba(239,68,68,0.08)" />
      <line x1={pad} y1={pad + chartH - (4 / maxPd) * chartH} x2={w - pad} y2={pad + chartH - (4 / maxPd) * chartH} stroke="rgba(239,68,68,0.3)" strokeWidth={0.5} strokeDasharray="3,3" />
      {measuredPoints.length > 1 && (
        <polyline points={measuredPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#10b981" strokeWidth={1.5} />
      )}
      {lastMeasured && projectedPoints.length > 0 && (
        <polyline points={[lastMeasured, ...projectedPoints].map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="4,3" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={p.type === 'measured' ? '#10b981' : '#ef4444'} />
      ))}
      {projectedPoints.map((p, i) => (
        <text key={i} x={p.x} y={p.y - 6} textAnchor="middle" fontSize={7} fill="#94a3b8" fontFamily="monospace">{p.pd}mm</text>
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

      <Badge variant="outline" className={`text-[10px] mb-3 ${riskBadgeColor(projection.riskLevel)}`}>
        {projection.riskLevel.toUpperCase()} RISK
      </Badge>

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

      {trendData && trendData.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Your Trend</div>
          <TrendSparkline data={trendData} />
        </div>
      )}

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
                <span className="text-red-400 font-mono font-bold">+{formatCurrency(projection.treatLaterCost12mo - projection.treatNowCost)}</span>
              </div>
            )}
          </div>
        </div>
      )}

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

  // Animation — 20 seconds total, with easing for dramatic effect
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }

    let start: number | null = null;
    const duration = 20000;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const linear = Math.min(elapsed / duration, 1);
      // Ease-in-out for dramatic pacing: slow start, speed up mid, slow at end
      const eased = linear < 0.5
        ? 2 * linear * linear
        : 1 - Math.pow(-2 * linear + 2, 2) / 2;
      setTimelineT(eased);

      if (linear < 1) {
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

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setTimelineT(0);
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
  const monthsShown = Math.round(timelineT * 12);
  const timeLabel = monthsShown === 0 ? 'Today' : `${monthsShown} months`;

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
        <div className="flex items-center gap-3 px-2">
          <div className="flex gap-1">
            <Button
              variant="outline" size="sm"
              className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8"
              onClick={isPlaying ? () => setIsPlaying(false) : handlePlay}
            >
              {isPlaying ? <Pause className="h-3.5 w-3.5 mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button
              variant="outline" size="sm"
              className="border-gray-700 text-gray-400 hover:bg-gray-800 h-8 px-2"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex-1 space-y-1">
            <Slider
              value={[timelineT * 100]}
              onValueChange={([v]) => { setTimelineT(v / 100); setIsPlaying(false); }}
              max={100}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-gray-500 px-1">
              <span className={timelineT <= 0.05 ? 'text-green-400 font-bold' : ''}>Today</span>
              <span className={timelineT > 0.2 && timelineT <= 0.6 ? 'text-amber-400 font-bold' : ''}>6 Months</span>
              <span className={timelineT > 0.8 ? 'text-red-400 font-bold' : ''}>12 Months</span>
            </div>
          </div>

          <div className="text-right min-w-[80px]">
            <div className="text-sm font-mono font-bold" style={{
              color: timelineT > 0.5 ? '#ef4444' : timelineT > 0.05 ? '#f59e0b' : '#10b981',
            }}>
              {timeLabel}
            </div>
          </div>
        </div>

        {/* 3D View */}
        <div className="relative w-full h-[500px] border border-indigo-500/20 rounded-lg bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] overflow-hidden">
          <Canvas shadows camera={{ position: [0, 3, 10], fov: 40 }}>
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
