/**
 * 3D Odontogram Component
 * Rotatable 3D tooth chart using React Three Fiber
 * 
 * Required packages:
 * npm install @react-three/fiber @react-three/drei three
 */

'use client';

import { useState, useRef, Suspense, createElement } from 'react';

// Dynamic imports for React Three Fiber (to handle missing packages gracefully)
// These will be loaded at runtime, not build time
let Canvas: any = null;
let useFrame: any = null;
let OrbitControls: any = null;
let Text: any = null;
let PerspectiveCamera: any = null;
let THREE: any = null;

// Check if packages are available (will be evaluated at runtime)
if (typeof window !== 'undefined') {
  try {
    // @ts-ignore - dynamic require
    const r3f = require('@react-three/fiber');
    // @ts-ignore - dynamic require
    const drei = require('@react-three/drei');
    // @ts-ignore - dynamic require
    THREE = require('three');
    Canvas = r3f.Canvas;
    useFrame = r3f.useFrame;
    OrbitControls = drei.OrbitControls;
    Text = drei.Text;
    PerspectiveCamera = drei.PerspectiveCamera;
  } catch (e) {
    // Packages not installed - component will show installation message
  }
}
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

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

// Tooth positions in 3D space (arranged in arch shape)
const TOOTH_3D_POSITIONS: { [key: string]: { x: number; y: number; z: number } } = {
  // Upper right (maxilla) - 1-8
  '1': { x: -3.5, y: 0.5, z: 0 }, '2': { x: -3, y: 0.5, z: 0 }, '3': { x: -2.5, y: 0.5, z: 0 },
  '4': { x: -2, y: 0.5, z: 0 }, '5': { x: -1.5, y: 0.5, z: 0 }, '6': { x: -1, y: 0.5, z: 0 },
  '7': { x: -0.5, y: 0.5, z: 0 }, '8': { x: 0, y: 0.5, z: 0 },
  // Upper left - 9-16
  '9': { x: 0, y: 0.5, z: 0 }, '10': { x: 0.5, y: 0.5, z: 0 }, '11': { x: 1, y: 0.5, z: 0 },
  '12': { x: 1.5, y: 0.5, z: 0 }, '13': { x: 2, y: 0.5, z: 0 }, '14': { x: 2.5, y: 0.5, z: 0 },
  '15': { x: 3, y: 0.5, z: 0 }, '16': { x: 3.5, y: 0.5, z: 0 },
  // Lower left (mandible) - 17-24
  '17': { x: 3.5, y: -0.5, z: 0 }, '18': { x: 3, y: -0.5, z: 0 }, '19': { x: 2.5, y: -0.5, z: 0 },
  '20': { x: 2, y: -0.5, z: 0 }, '21': { x: 1.5, y: -0.5, z: 0 }, '22': { x: 1, y: -0.5, z: 0 },
  '23': { x: 0.5, y: -0.5, z: 0 }, '24': { x: 0, y: -0.5, z: 0 },
  // Lower right - 25-32
  '25': { x: 0, y: -0.5, z: 0 }, '26': { x: -0.5, y: -0.5, z: 0 }, '27': { x: -1, y: -0.5, z: 0 },
  '28': { x: -1.5, y: -0.5, z: 0 }, '29': { x: -2, y: -0.5, z: 0 }, '30': { x: -2.5, y: -0.5, z: 0 },
  '31': { x: -3, y: -0.5, z: 0 }, '32': { x: -3.5, y: -0.5, z: 0 },
};

const CONDITION_COLORS: { [key: string]: string } = {
  healthy: '#22c55e', // green
  caries: '#ef4444', // red
  crown: '#3b82f6', // blue
  filling: '#eab308', // yellow
  missing: '#6b7280', // gray
  extraction: '#a855f7', // purple
  implant: '#6366f1', // indigo
  root_canal: '#f97316', // orange
};

// 3D Tooth Component - Only renders if packages are available
function Tooth3D({ 
  toothNumber, 
  position, 
  condition, 
  onClick 
}: { 
  toothNumber: string; 
  position: { x: number; y: number; z: number }; 
  condition?: string;
  onClick?: () => void;
}) {
  if (!THREE || !useFrame || !Text) return null;

  const meshRef = useRef<any>(null);
  const [hovered, setHovered] = useState(false);

  // Animate on hover
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  const color = condition ? CONDITION_COLORS[condition] || '#9ca3af' : '#9ca3af';
  const scale = hovered ? 1.2 : 1;

  // Use React.createElement to avoid TypeScript errors when packages aren't installed
  return (
    <>
      {createElement('group' as any, { position: [position.x, position.y, position.z] },
        createElement('mesh' as any, {
          ref: meshRef,
          onClick,
          onPointerOver: () => setHovered(true),
          onPointerOut: () => setHovered(false),
          scale,
        },
          createElement('cylinderGeometry' as any, { args: [0.15, 0.15, 0.3, 16] }),
          createElement('meshStandardMaterial' as any, { color, metalness: 0.3, roughness: 0.7 })
        ),
        Text && createElement(Text, {
          position: [0, 0.3, 0],
          fontSize: 0.1,
          color: '#000',
          anchorX: 'center',
          anchorY: 'middle',
        }, toothNumber)
      )}
    </>
  );
}

// Main 3D Scene Component
function OdontogramScene({ toothData, onToothClick }: { toothData: OdontogramData; onToothClick?: (toothNumber: string) => void }) {
  if (!THREE) return null;

  return (
    <>
      {PerspectiveCamera && createElement(PerspectiveCamera, { makeDefault: true, position: [0, 0, 8], fov: 50 })}
      {createElement('ambientLight' as any, { intensity: 0.6 })}
      {createElement('directionalLight' as any, { position: [5, 5, 5], intensity: 0.8 })}
      {createElement('directionalLight' as any, { position: [-5, 5, -5], intensity: 0.4 })}
      
      {/* Render all teeth */}
      {Object.keys(TOOTH_3D_POSITIONS).map((toothNumber) => {
        const pos = TOOTH_3D_POSITIONS[toothNumber];
        const data = toothData[toothNumber];
        return (
          <Tooth3D
            key={toothNumber}
            toothNumber={toothNumber}
            position={pos}
            condition={data?.condition}
            onClick={() => onToothClick?.(toothNumber)}
          />
        );
      })}

      {OrbitControls && createElement(OrbitControls, {
        enableZoom: true,
        enablePan: false,
        minDistance: 5,
        maxDistance: 15,
        enableRotate: true,
        autoRotate: false,
      })}
    </>
  );
}

export function Odontogram3D({ leadId, toothData, onToothClick, readOnly = false }: Odontogram3DProps) {
  const [viewMode, setViewMode] = useState<'front' | 'top' | 'side'>('front');
  const controlsRef = useRef<any>(null);

  // Check if packages are installed
  if (!Canvas || !THREE) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>3D Odontogram - Installation Required</CardTitle>
          <CardDescription>
            React Three Fiber packages need to be installed to use the 3D view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 mb-4">
              <strong>To enable 3D Odontogram, please install the required packages:</strong>
            </p>
            <code className="block p-4 bg-white rounded border border-yellow-300 text-sm">
              npm install @react-three/fiber @react-three/drei three
            </code>
            <p className="text-sm text-yellow-700 mt-4">
              After installation, restart your development server and the 3D view will be available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const resetView = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  const setPresetView = (mode: 'front' | 'top' | 'side') => {
    setViewMode(mode);
    // View preset logic can be added here if needed
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>3D Odontogram</CardTitle>
            <CardDescription>
              Rotate, zoom, and interact with the 3D tooth chart. Click a tooth to view details.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetView}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset View
            </Button>
            <Button
              variant={viewMode === 'front' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetView('front')}
            >
              Front
            </Button>
            <Button
              variant={viewMode === 'top' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetView('top')}
            >
              Top
            </Button>
            <Button
              variant={viewMode === 'side' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPresetView('side')}
            >
              Side
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(CONDITION_COLORS).map(([condition, color]) => (
            <Badge key={condition} style={{ backgroundColor: color + '40', color: '#000' }}>
              {condition}
            </Badge>
          ))}
        </div>

        {/* 3D Canvas */}
        <div className="w-full h-[600px] border rounded-lg bg-gradient-to-br from-blue-50 to-purple-50">
          {Canvas ? (
            <Suspense fallback={<div className="flex items-center justify-center h-full">Loading 3D view...</div>}>
              <Canvas>
                <OdontogramScene toothData={toothData} onToothClick={onToothClick} />
              </Canvas>
            </Suspense>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">3D View Not Available</p>
                <p className="text-sm text-muted-foreground">Please install required packages</p>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Controls:</strong> Click and drag to rotate • Scroll to zoom • Click a tooth to view details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
