/**
 * 3D Odontogram Component
 * Realistic rotatable 3D dental arch using React Three Fiber.
 * Anatomically shaped teeth in a parabolic arch, color-coded by condition.
 */

'use client';

import { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
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
  type ToothType,
} from '@/lib/dental/tooth-geometry';

interface ToothData {
  condition?: string;
  date?: string;
  notes?: string;
  procedureCode?: string;
  restoration?: string;
  [key: string]: any;
}

interface OdontogramData {
  [toothNumber: string]: ToothData;
}

interface Odontogram3DProps {
  leadId: string;
  toothData: OdontogramData;
  onToothClick?: (toothNumber: string) => void;
  readOnly?: boolean;
}

const CONDITION_COLORS: Record<string, string> = {
  healthy:    '#f0ece0',
  caries:     '#dc2626',
  crown:      '#3b82f6',
  filling:    '#2563eb',
  missing:    '#4b5563',
  extraction: '#7c3aed',
  implant:    '#6366f1',
  root_canal: '#f97316',
};

function ToothMesh({
  toothNumber,
  condition,
  onClick,
}: {
  toothNumber: number;
  condition: string;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const type = getToothType(toothNumber);
  const pos = getArchPosition(toothNumber);
  const rot = getToothRotation(toothNumber);
  const isUpper = toothNumber <= 16;

  const baseColor = CONDITION_COLORS[condition] || CONDITION_COLORS.healthy;
  const isMissing = condition === 'missing' || condition === 'extraction';

  const crownH = getCrownHeight(type);
  const rootH = getRootHeight(type);
  const gumR = getGumRadius(type);
  const rootDir = isUpper ? 1 : -1;

  const crownGeo = useMemo(() => createCrownGeometry(type), [type]);
  const occlGeo = useMemo(() => createOcclusalGeometry(type), [type]);
  const rootGeo = useMemo(() => createRootGeometry(type), [type]);

  // Crown loft is built Y-up from 0 (CEJ) to crownH (occlusal).
  // Upper teeth: crown points down into the mouth, roots point up.
  // Lower teeth: crown points up, roots point down.
  // We flip the entire tooth group via scale.y for upper teeth.
  const flipY = isUpper ? -1 : 1;

  return (
    <group
      ref={meshRef}
      position={pos}
      rotation={[0, rot, 0]}
      scale={hovered ? 1.12 : 1}
      onClick={(e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onClick?.(); }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
    >
      {!isMissing ? (
        <group scale={[1, flipY, 1]}>
          {/* Crown body — lofted from CEJ (y=0) to occlusal (y=crownH) */}
          <mesh geometry={crownGeo} castShadow>
            <meshPhysicalMaterial
              color={baseColor}
              roughness={0.35}
              metalness={0.05}
              clearcoat={0.6}
              clearcoatRoughness={0.2}
              emissive={hovered ? '#a855f7' : '#000000'}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Occlusal cap with cusps/incisal edge */}
          <mesh geometry={occlGeo} castShadow>
            <meshPhysicalMaterial
              color={condition === 'filling' ? '#b0c4de' : baseColor}
              roughness={0.30}
              metalness={0.05}
              clearcoat={0.7}
              clearcoatRoughness={0.15}
            />
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

          {/* Gum cuff at CEJ */}
          <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[gumR, 0.04, 8, 24]} />
            <meshStandardMaterial color="#e88a8a" roughness={0.65} transparent opacity={0.55} />
          </mesh>

          {/* Condition indicator glow ring */}
          {condition !== 'healthy' && (
            <mesh position={[0, crownH + 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[gumR - 0.02, gumR + 0.06, 24]} />
              <meshBasicMaterial color={baseColor} side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
          )}
        </group>
      ) : (
        <group scale={[1, flipY, 1]}>
          <mesh geometry={crownGeo}>
            <meshStandardMaterial color="#94a3b8" roughness={0.8} transparent opacity={0.2} wireframe />
          </mesh>
        </group>
      )}

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
          color: hovered ? '#9333ea' : '#94a3b8',
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

function ArchLabels() {
  const labelStyle = (size: number, color: string): React.CSSProperties => ({
    fontSize: `${size}px`,
    fontWeight: 600,
    color,
    userSelect: 'none',
    whiteSpace: 'nowrap',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  });

  return (
    <>
      <Html position={[0, 1.8, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={labelStyle(13, '#94a3b8')}>Upper Arch</span>
      </Html>
      <Html position={[0, -1.8, 1]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={labelStyle(13, '#94a3b8')}>Lower Arch</span>
      </Html>
      <Html position={[-4.2, 0, 0.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={labelStyle(11, '#cbd5e1')}>Right</span>
      </Html>
      <Html position={[4.2, 0, 0.5]} center distanceFactor={10} style={{ pointerEvents: 'none' }}>
        <span style={labelStyle(11, '#cbd5e1')}>Left</span>
      </Html>
    </>
  );
}

function OdontogramScene({
  toothData,
  onToothClick,
}: {
  toothData: OdontogramData;
  onToothClick?: (toothNumber: string) => void;
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
          {teeth.map((n) => (
            <ToothMesh
              key={n}
              toothNumber={n}
              condition={toothData[String(n)]?.condition || 'healthy'}
              onClick={() => onToothClick?.(String(n))}
            />
          ))}

          <GumTissue isUpper />
          <GumTissue isUpper={false} />
          <ArchLabels />
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
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">Loading 3D view...</p>
      </div>
    </Html>
  );
}

export function Odontogram3D({ leadId, toothData, onToothClick, readOnly = false }: Odontogram3DProps) {
  const controlsRef = useRef<any>(null);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>3D Odontogram</CardTitle>
            <CardDescription>
              Rotate, zoom, and interact with the 3D dental arch. Click a tooth to view details.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => controlsRef.current?.reset()}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset View
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2">
          {Object.entries(CONDITION_COLORS).map(([condition, color]) => (
            <Badge
              key={condition}
              variant="outline"
              className="text-xs capitalize"
              style={{ borderColor: color, color: condition === 'healthy' ? '#78716c' : color }}
            >
              <span className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block" style={{ backgroundColor: color }} />
              {condition.replace('_', ' ')}
            </Badge>
          ))}
        </div>

        <div className="w-full h-[550px] border rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 overflow-hidden">
          <Canvas shadows camera={{ position: [0, 2, 10], fov: 45 }}>
            <Suspense fallback={<Loader3D />}>
              <OdontogramScene toothData={toothData} onToothClick={onToothClick} />
            </Suspense>
          </Canvas>
        </div>

        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Controls:</strong> Drag to rotate &middot; Scroll to zoom &middot; Right-drag to pan &middot; Click a tooth for details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
