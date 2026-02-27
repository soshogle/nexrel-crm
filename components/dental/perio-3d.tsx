/**
 * 3D Periodontal Chart — React Three Fiber visualization
 * Shows teeth in an arch layout with pocket depth bars at each measurement site
 * (mesial, buccal, distal, lingual), color-coded by severity.
 * BOP shown as glowing red spheres. Click a tooth for details.
 */

'use client';

import { useState, useMemo, Suspense, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Loader2 } from 'lucide-react';
import {
  getToothType, getArchPosition, getToothRotation,
  getCrownHeight, getRootHeight, getGumRadius,
  createCrownGeometry, createOcclusalGeometry, createRootGeometry,
} from '@/lib/dental/tooth-geometry';

interface PdSite { pd: number; bop?: boolean }
interface ToothData { mesial?: PdSite; buccal?: PdSite; distal?: PdSite; lingual?: PdSite }

interface Perio3DProps {
  measurements?: Record<string, ToothData>;
  onToothClick?: (toothNumber: string) => void;
}


function pdColor(pd: number): string {
  if (pd <= 3) return '#10b981';
  if (pd <= 6) return '#f59e0b';
  return '#ef4444';
}

function worstPd(td: ToothData): number {
  return Math.max(
    td.mesial?.pd ?? 0, td.buccal?.pd ?? 0,
    td.distal?.pd ?? 0, td.lingual?.pd ?? 0,
  );
}

const SITE_OFFSETS: Record<string, [number, number]> = {
  mesial:  [-0.25, 0],
  buccal:  [0, -0.3],
  distal:  [0.25, 0],
  lingual: [0, 0.3],
};

function PdBarMesh({
  pd, bop, siteKey, isUpper, toothRotation,
}: {
  pd: number; bop?: boolean; siteKey: string; isUpper: boolean; toothRotation: number;
}) {
  if (!pd || pd === 0) return null;

  const color = pdColor(pd);
  const barHeight = Math.min(pd * 0.12, 1.2);
  const [offX, offZ] = SITE_OFFSETS[siteKey] || [0, 0];
  const barDir = isUpper ? 1 : -1;

  const rotatedX = offX * Math.cos(-toothRotation) - offZ * Math.sin(-toothRotation);
  const rotatedZ = offX * Math.sin(-toothRotation) + offZ * Math.cos(-toothRotation);

  return (
    <group position={[rotatedX, barDir * (0.25 + barHeight / 2), rotatedZ]}>
      <mesh>
        <cylinderGeometry args={[0.04, 0.04, barHeight, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {bop && (
        <mesh position={[0, barDir * (barHeight / 2 + 0.06), 0]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial
            color="#ef4444"
            emissive="#ef4444"
            emissiveIntensity={0.8}
            roughness={0.2}
          />
        </mesh>
      )}
    </group>
  );
}

function PerioToothMesh({
  toothNumber, toothData, onClick, isSelected,
}: {
  toothNumber: number; toothData: ToothData; onClick?: () => void; isSelected?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const type = getToothType(toothNumber);
  const pos = getArchPosition(toothNumber);
  const rot = getToothRotation(toothNumber);
  const isUpper = toothNumber <= 16;
  const worst = worstPd(toothData);
  const severity = pdColor(worst);

  const crownH = getCrownHeight(type);
  const rootH = getRootHeight(type);
  const gumR = getGumRadius(type);
  const rootDir = isUpper ? 1 : -1;

  const crownGeo = useMemo(() => createCrownGeometry(type), [type]);
  const occlGeo = useMemo(() => createOcclusalGeometry(type), [type]);
  const rootGeo = useMemo(() => createRootGeometry(type), [type]);

  const flipY = isUpper ? -1 : 1;

  return (
    <group
      position={pos}
      rotation={[0, rot, 0]}
      scale={hovered || isSelected ? 1.12 : 1}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      <group scale={[1, flipY, 1]}>
        {/* Crown body — lofted from CEJ to occlusal */}
        <mesh geometry={crownGeo} castShadow>
          <meshPhysicalMaterial
            color="#f0ece0"
            roughness={0.35}
            metalness={0.05}
            clearcoat={0.6}
            clearcoatRoughness={0.2}
            emissive={isSelected ? '#818cf8' : hovered ? '#a855f7' : '#000000'}
            emissiveIntensity={isSelected ? 0.4 : hovered ? 0.3 : 0}
          />
        </mesh>

        {/* Occlusal cap with cusps */}
        <mesh geometry={occlGeo} castShadow>
          <meshPhysicalMaterial
            color="#f0ece0"
            roughness={0.30}
            metalness={0.05}
            clearcoat={0.7}
            clearcoatRoughness={0.15}
          />
        </mesh>

        {/* Gingival margin severity ring */}
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[gumR, 0.04, 8, 24]} />
          <meshStandardMaterial color={severity} roughness={0.5} transparent opacity={0.65} />
        </mesh>

        {/* Root(s) — extend downward from CEJ */}
        {type === 'molar' ? (
          <>
            <mesh geometry={rootGeo} position={[-0.08, 0, -0.06]} rotation={[Math.PI, 0, 0]} castShadow>
              <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
            </mesh>
            <mesh geometry={rootGeo} position={[0.08, 0, -0.06]} rotation={[Math.PI, 0, 0]} castShadow>
              <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
            </mesh>
            <mesh geometry={rootGeo} position={[0, 0, 0.06]} rotation={[Math.PI, 0, 0]} castShadow>
              <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
            </mesh>
          </>
        ) : type === 'premolar' ? (
          <>
            <mesh geometry={rootGeo} position={[-0.04, 0, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
            </mesh>
            <mesh geometry={rootGeo} position={[0.04, 0, 0]} rotation={[Math.PI, 0, 0]} castShadow>
              <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
            </mesh>
          </>
        ) : (
          <mesh geometry={rootGeo} position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} castShadow>
            <meshStandardMaterial color="#e0d3bc" roughness={0.55} />
          </mesh>
        )}
      </group>

      {/* PD bars — placed outside the flip group so they always point correctly */}
      {(['mesial', 'buccal', 'distal', 'lingual'] as const).map(site => (
        <PdBarMesh
          key={site}
          pd={toothData[site]?.pd ?? 0}
          bop={toothData[site]?.bop}
          siteKey={site}
          isUpper={isUpper}
          toothRotation={rot}
        />
      ))}

      {/* Tooth number label */}
      <Html
        position={[0, isUpper ? crownH / 2 + rootH + 0.25 : -(crownH / 2 + rootH + 0.25), 0]}
        center
        distanceFactor={8}
        style={{ pointerEvents: 'none' }}
      >
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          color: isSelected ? '#818cf8' : hovered ? '#9333ea' : '#94a3b8',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}>
          {toothNumber}
        </span>
      </Html>
    </group>
  );
}

function GumTissue({ isUpper }: { isUpper: boolean }) {
  const geo = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 15; i++) {
      const n = isUpper ? i + 1 : i + 17;
      const [x, , z] = getArchPosition(n);
      points.push(new THREE.Vector3(x, 0, z));
    }
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    const bandW = 0.18, bandH = 0.12;
    const shape = new THREE.Shape();
    shape.moveTo(-bandW, -bandH);
    shape.quadraticCurveTo(-bandW, bandH, 0, bandH * 1.1);
    shape.quadraticCurveTo(bandW, bandH, bandW, -bandH);
    shape.lineTo(-bandW, -bandH);

    return new THREE.ExtrudeGeometry(shape, {
      steps: 80,
      extrudePath: curve,
      bevelEnabled: false,
    });
  }, [isUpper]);

  const y = isUpper ? 0.35 : -0.35;

  return (
    <mesh geometry={geo} position={[0, y, 0]}>
      <meshStandardMaterial
        color="#e88a8a"
        roughness={0.65}
        transparent
        opacity={0.55}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function PerioScene({
  measurements, onToothClick, selectedTooth,
}: {
  measurements: Record<string, ToothData>;
  onToothClick?: (toothNumber: string) => void;
  selectedTooth: string | null;
}) {
  const teeth = useMemo(() => Array.from({ length: 32 }, (_, i) => i + 1), []);

  return (
    <>
      <hemisphereLight args={['#c8d8e8', '#3a2a1a', 0.4]} />
      <directionalLight position={[5, 8, 8]} intensity={1.1} castShadow />
      <directionalLight position={[-5, -4, 6]} intensity={0.35} />
      <pointLight position={[0, 0, 6]} intensity={0.5} />

      <Center>
        <group>
          {teeth.map(n => (
            <PerioToothMesh
              key={n}
              toothNumber={n}
              toothData={measurements[String(n)] ?? {}}
              isSelected={selectedTooth === String(n)}
              onClick={() => onToothClick?.(String(n))}
            />
          ))}
          <GumTissue isUpper />
          <GumTissue isUpper={false} />

          {/* Arch labels */}
          <Html position={[0, 1.8, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', userSelect: 'none' }}>
              UPPER ARCH
            </span>
          </Html>
          <Html position={[0, -1.8, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', userSelect: 'none' }}>
              LOWER ARCH
            </span>
          </Html>
        </group>
      </Center>

      <OrbitControls
        enableZoom
        enablePan
        enableRotate
        minDistance={4}
        maxDistance={18}
        autoRotate={false}
        makeDefault
      />
    </>
  );
}

function Loader3D() {
  return (
    <Html center>
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading 3D view...</p>
      </div>
    </Html>
  );
}

function ToothDetailPanel({ toothNumber, data }: { toothNumber: string; data: ToothData }) {
  const sites = [
    { key: 'mesial' as const, label: 'Mesial' },
    { key: 'buccal' as const, label: 'Buccal' },
    { key: 'distal' as const, label: 'Distal' },
    { key: 'lingual' as const, label: 'Lingual' },
  ];

  return (
    <div className="absolute top-4 right-4 bg-gray-900/95 backdrop-blur border border-indigo-500/30 rounded-xl p-4 w-56 z-10">
      <div className="text-sm font-semibold text-indigo-300 mb-3">Tooth {toothNumber}</div>
      <div className="space-y-2">
        {sites.map(s => {
          const site = data[s.key];
          const pd = site?.pd ?? 0;
          const color = pdColor(pd);
          return (
            <div key={s.key} className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{s.label}</span>
              <div className="flex items-center gap-2">
                <span style={{ color }} className="font-mono font-bold">{pd}mm</span>
                {site?.bop && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700">
        <div className="text-[10px] text-gray-500">
          Worst PD: <span style={{ color: pdColor(worstPd(data)) }} className="font-bold">{worstPd(data)}mm</span>
        </div>
      </div>
    </div>
  );
}

export function Perio3D({ measurements = {}, onToothClick }: Perio3DProps) {
  const controlsRef = useRef<any>(null);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);

  const data = measurements && Object.keys(measurements).length > 0 ? measurements : undefined;
  const displayData = data ?? {};

  const allPds = Object.values(displayData).flatMap(d =>
    ['mesial', 'buccal', 'distal', 'lingual'].map(s => (d as any)[s]?.pd ?? 0),
  ).filter(Boolean);
  const bopCount = Object.values(displayData).reduce(
    (sum, d) => sum + ['mesial', 'buccal', 'distal', 'lingual'].filter(s => (d as any)[s]?.bop).length, 0,
  );
  const healthPct = allPds.length ? Math.round((allPds.filter(p => p <= 3).length / allPds.length) * 100) : 100;

  const handleToothClick = (num: string) => {
    setSelectedTooth(prev => prev === num ? null : num);
    onToothClick?.(num);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>3D Periodontal Chart</CardTitle>
            <CardDescription>
              Rotate, zoom, and click teeth to view pocket depth details
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
              {healthPct}% Healthy
            </Badge>
            {bopCount > 0 && (
              <Badge variant="outline" className="text-xs border-red-500/50 text-red-600">
                {bopCount} BOP
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => { controlsRef.current?.reset(); setSelectedTooth(null); }}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs" style={{ borderColor: '#10b981', color: '#10b981' }}>
            <span className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: '#10b981' }} />
            1-3mm Healthy
          </Badge>
          <Badge variant="outline" className="text-xs" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
            <span className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: '#f59e0b' }} />
            4-6mm Moderate
          </Badge>
          <Badge variant="outline" className="text-xs" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            <span className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: '#ef4444' }} />
            &gt;6mm Deep
          </Badge>
          <Badge variant="outline" className="text-xs" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
            <span className="w-2 h-2 rounded-full mr-1.5 inline-block bg-red-500 animate-pulse" />
            BOP
          </Badge>
        </div>

        <div className="relative w-full h-[550px] border rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 overflow-hidden">
          <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }}>
            <Suspense fallback={<Loader3D />}>
              <PerioScene
                measurements={displayData}
                onToothClick={handleToothClick}
                selectedTooth={selectedTooth}
              />
            </Suspense>
          </Canvas>

          {selectedTooth && displayData[selectedTooth] && (
            <ToothDetailPanel toothNumber={selectedTooth} data={displayData[selectedTooth]} />
          )}
        </div>

        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Controls:</strong> Drag to rotate &middot; Scroll to zoom &middot; Right-drag to pan &middot; Click a tooth for pocket depth details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
