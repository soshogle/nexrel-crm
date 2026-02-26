/**
 * 3D Odontogram Component
 * Realistic rotatable 3D dental arch using React Three Fiber.
 * Anatomically shaped teeth in a parabolic arch, color-coded by condition.
 */

'use client';

import { useState, useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Center, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Loader2 } from 'lucide-react';

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

type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

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

function getToothType(n: number): ToothType {
  const adj = n <= 16 ? n : (n <= 24 ? 33 - n : n - 16);
  if (adj >= 1 && adj <= 3) return 'molar';
  if (adj >= 4 && adj <= 5) return 'premolar';
  if (adj === 6) return 'canine';
  return 'incisor';
}

function getArchPosition(n: number): [number, number, number] {
  const archWidth = 7;
  const archDepth = 3.5;
  const isUpper = n <= 16;

  let t: number;
  if (n <= 8) t = (8 - n) / 15;
  else if (n <= 16) t = (n - 1) / 15;
  else if (n <= 24) t = (n - 17) / 15;
  else t = (32 - n) / 15;

  const angle = (t - 0.5) * Math.PI;
  const x = Math.sin(angle) * archWidth * 0.5;
  const z = -Math.cos(angle) * archDepth + archDepth * 0.5;
  const y = isUpper ? 0.7 : -0.7;

  return [x, y, z];
}

function getToothRotation(n: number): number {
  const isUpper = n <= 16;
  let t: number;
  if (n <= 8) t = (8 - n) / 15;
  else if (n <= 16) t = (n - 1) / 15;
  else if (n <= 24) t = (n - 17) / 15;
  else t = (32 - n) / 15;
  const angle = (t - 0.5) * Math.PI;
  return isUpper ? angle : angle;
}

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

  const dims = useMemo(() => {
    switch (type) {
      case 'molar':    return { w: 0.45, h: 0.35, d: 0.5, rootH: 0.55 };
      case 'premolar': return { w: 0.35, h: 0.35, d: 0.4, rootH: 0.5 };
      case 'canine':   return { w: 0.28, h: 0.4,  d: 0.35, rootH: 0.6 };
      case 'incisor':  return { w: 0.3,  h: 0.38, d: 0.25, rootH: 0.5 };
    }
  }, [type]);

  const rootDir = isUpper ? 1 : -1;

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
        <>
          {/* Crown */}
          <mesh position={[0, 0, 0]} castShadow>
            <boxGeometry args={[dims.w, dims.h, dims.d]} />
            <meshStandardMaterial
              color={baseColor}
              roughness={0.4}
              metalness={0.05}
              emissive={hovered ? '#a855f7' : '#000000'}
              emissiveIntensity={hovered ? 0.3 : 0}
            />
          </mesh>

          {/* Occlusal surface line */}
          {(type === 'molar' || type === 'premolar') && (
            <mesh position={[0, isUpper ? -dims.h / 2 + 0.02 : dims.h / 2 - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[dims.w * 0.5, dims.d * 0.5]} />
              <meshStandardMaterial
                color={condition === 'filling' ? '#60a5fa' : '#d4cfc2'}
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Root(s) */}
          {type === 'molar' ? (
            <>
              <mesh position={[-dims.w * 0.2, rootDir * (dims.h / 2 + dims.rootH / 2), -dims.d * 0.1]}>
                <coneGeometry args={[0.07, dims.rootH, 8]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.6} />
              </mesh>
              <mesh position={[dims.w * 0.2, rootDir * (dims.h / 2 + dims.rootH / 2), -dims.d * 0.1]}>
                <coneGeometry args={[0.07, dims.rootH, 8]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.6} />
              </mesh>
              <mesh position={[0, rootDir * (dims.h / 2 + dims.rootH * 0.4), dims.d * 0.12]}>
                <coneGeometry args={[0.06, dims.rootH * 0.8, 8]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.6} />
              </mesh>
            </>
          ) : type === 'premolar' ? (
            <>
              <mesh position={[-0.06, rootDir * (dims.h / 2 + dims.rootH / 2), 0]}>
                <coneGeometry args={[0.06, dims.rootH, 8]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.6} />
              </mesh>
              <mesh position={[0.06, rootDir * (dims.h / 2 + dims.rootH / 2), 0]}>
                <coneGeometry args={[0.06, dims.rootH, 8]} />
                <meshStandardMaterial color="#c9b99a" roughness={0.6} />
              </mesh>
            </>
          ) : (
            <mesh position={[0, rootDir * (dims.h / 2 + dims.rootH / 2), 0]}>
              <coneGeometry args={[0.07, dims.rootH, 8]} />
              <meshStandardMaterial color="#c9b99a" roughness={0.6} />
            </mesh>
          )}

          {/* Condition indicator ring */}
          {condition !== 'healthy' && (
            <mesh position={[0, isUpper ? -dims.h / 2 - 0.04 : dims.h / 2 + 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[dims.w * 0.35, dims.w * 0.5, 16]} />
              <meshBasicMaterial color={baseColor} side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
          )}
        </>
      ) : (
        /* Missing / extracted tooth - show ghost outline */
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[dims.w, dims.h, dims.d]} />
          <meshStandardMaterial
            color="#94a3b8"
            roughness={0.8}
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}

      {/* Tooth number label */}
      <Text
        position={[0, isUpper ? dims.h / 2 + dims.rootH + 0.25 : -(dims.h / 2 + dims.rootH + 0.25), 0]}
        fontSize={0.18}
        color={hovered ? '#9333ea' : '#64748b'}
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {String(toothNumber)}
      </Text>
    </group>
  );
}

function GumLine({ isUpper }: { isUpper: boolean }) {
  const points = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 15; i++) {
      const n = isUpper ? i + 1 : i + 17;
      const [x, , z] = getArchPosition(n);
      const y = isUpper ? 0.35 : -0.35;
      pts.push(new THREE.Vector3(x, y, z));
    }
    return pts;
  }, [isUpper]);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 64, 0.08, 8, false), [curve]);

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color="#f4a0a0" roughness={0.7} transparent opacity={0.5} />
    </mesh>
  );
}

function ArchLabels() {
  return (
    <>
      <Text position={[0, 1.8, 1]} fontSize={0.25} color="#94a3b8" anchorX="center" font={undefined}>
        Upper Arch
      </Text>
      <Text position={[0, -1.8, 1]} fontSize={0.25} color="#94a3b8" anchorX="center" font={undefined}>
        Lower Arch
      </Text>
      <Text position={[-4.2, 0, 0.5]} fontSize={0.18} color="#cbd5e1" anchorX="center" font={undefined}>
        Right
      </Text>
      <Text position={[4.2, 0, 0.5]} fontSize={0.18} color="#cbd5e1" anchorX="center" font={undefined}>
        Left
      </Text>
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
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 8]} intensity={0.9} castShadow />
      <directionalLight position={[-5, -4, 6]} intensity={0.3} />
      <pointLight position={[0, 0, 6]} intensity={0.4} />

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

          <GumLine isUpper />
          <GumLine isUpper={false} />
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
