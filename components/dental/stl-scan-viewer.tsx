/**
 * STL / 3D Intraoral Scan Viewer
 * Upload and view STL/PLY files from iTero, 3Shape, Medit scanners.
 * Uses React Three Fiber + drei for 3D rendering.
 * Reuses existing /api/dental/documents for file storage.
 */

'use client';

import { useState, useCallback, useRef, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, useProgress, Html } from '@react-three/drei';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/lib/dental/clinic-context';
import {
  Upload,
  Box,
  Loader2,
  RotateCcw,
  Maximize2,
  Download,
  X,
  Eye,
  Grid3X3,
} from 'lucide-react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface StlScanViewerProps {
  leadId: string;
  compact?: boolean;
}

interface ScanRecord {
  id: string;
  url: string;
  fileName: string;
  dateTaken: string;
  scanType: string;
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-gray-500">{progress.toFixed(0)}%</p>
      </div>
    </Html>
  );
}

function isValidGeometry(geo: THREE.BufferGeometry): boolean {
  const posAttr = geo.getAttribute('position');
  if (!posAttr || posAttr.count < 9) return false; // need at least 3 triangles

  // Check for degenerate geometry (all vertices in a tiny volume or NaN)
  const arr = posAttr.array as Float32Array;
  let hasNaN = false;
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < arr.length; i += 3) {
    if (isNaN(arr[i]) || isNaN(arr[i + 1]) || isNaN(arr[i + 2])) { hasNaN = true; break; }
    minX = Math.min(minX, arr[i]);   maxX = Math.max(maxX, arr[i]);
    minY = Math.min(minY, arr[i+1]); maxY = Math.max(maxY, arr[i+1]);
    minZ = Math.min(minZ, arr[i+2]); maxZ = Math.max(maxZ, arr[i+2]);
  }
  if (hasNaN) return false;

  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  // Reject geometry with extreme extents (parsed garbage) or near-zero size
  if (extent > 10000 || extent < 0.001) return false;

  return true;
}

function ScanModel({ url, color, fileName }: { url: string; color: string; fileName?: string }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const [objGroup, setObjGroup] = useState<THREE.Group | null>(null);
  const [hasVertexColors, setHasVertexColors] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    setGeometry(null);
    setObjGroup(null);
    setError(null);
    setHasVertexColors(false);

    // Pre-check: fetch as text first to detect HTML error pages
    fetch(url)
      .then(res => {
        if (!res.ok) {
          setError(`File not found (${res.status}). Upload a real STL/PLY/OBJ scan file.`);
          return;
        }
        const contentType = res.headers.get('content-type') || '';
        // If server returned HTML instead of binary, it's an error page
        if (contentType.includes('text/html')) {
          setError('Server returned an HTML page instead of a 3D model file. Upload a real STL scan.');
          return;
        }
        // Now load with proper loader
        loadModel();
      })
      .catch(() => {
        setError('Cannot reach file server. Upload a real STL scan.');
      });

    function loadModel() {
      const ext = (fileName || url).split('.').pop()?.toLowerCase() || 'stl';

      if (ext === 'ply') {
        const loader = new PLYLoader();
        loader.load(
          url,
          (geo) => {
            if (!isValidGeometry(geo)) {
              setError('File is not a valid PLY 3D model. Upload a real intraoral scan.');
              return;
            }
            geo.computeVertexNormals();
            geo.center();
            setHasVertexColors(geo.hasAttribute('color'));
            setGeometry(geo);
          },
          undefined,
          () => setError('Failed to parse PLY file. Upload a valid 3D scan.')
        );
      } else if (ext === 'obj') {
        const loader = new OBJLoader();
        loader.load(
          url,
          (group) => {
            const box = new THREE.Box3().setFromObject(group);
            const size = box.getSize(new THREE.Vector3());
            if (size.length() < 0.001 || size.length() > 10000) {
              setError('File is not a valid OBJ 3D model. Upload a real intraoral scan.');
              return;
            }
            const center = box.getCenter(new THREE.Vector3());
            group.position.sub(center);
            setObjGroup(group);
          },
          undefined,
          () => setError('Failed to parse OBJ file. Upload a valid 3D scan.')
        );
      } else {
        const loader = new STLLoader();
        loader.load(
          url,
          (geo) => {
            if (!isValidGeometry(geo)) {
              setError('File is not a valid STL 3D model. Upload a real intraoral scan.');
              return;
            }
            geo.computeVertexNormals();
            geo.center();
            setGeometry(geo);
          },
          undefined,
          () => setError('Failed to parse STL file. Upload a valid 3D scan.')
        );
      }
    }
  }, [url, fileName]);

  if (error) {
    return (
      <Html center>
        <div className="text-center px-4">
          <p className="text-xs text-red-400 font-medium">Load Error</p>
          <p className="text-[10px] text-red-300 mt-1">{error}</p>
        </div>
      </Html>
    );
  }

  if (objGroup) {
    return (
      <primitive object={objGroup}>
        {objGroup.children.map((child, i) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (!mesh.material || (mesh.material as THREE.MeshStandardMaterial).type === 'MeshBasicMaterial') {
              mesh.material = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.3,
                metalness: 0.1,
                side: THREE.DoubleSide,
              });
            }
          }
          return null;
        })}
      </primitive>
    );
  }

  if (!geometry) return null;

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={hasVertexColors ? '#ffffff' : color}
        vertexColors={hasVertexColors}
        roughness={0.3}
        metalness={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function SceneContent({ url, color, fileName }: { url: string; color: string; fileName?: string }) {
  return (
    <Center>
      <ScanModel url={url} color={color} fileName={fileName} />
    </Center>
  );
}

export function StlScanViewer({ leadId, compact = false }: StlScanViewerProps) {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanRecord | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [modelColor, setModelColor] = useState('#e8dcc8');
  const [fetchError, setFetchError] = useState<string | null>(null);

  const SCAN_TYPES = [
    { id: 'full-arch-upper', label: 'Full Arch (Upper)' },
    { id: 'full-arch-lower', label: 'Full Arch (Lower)' },
    { id: 'bite-scan', label: 'Bite Scan' },
    { id: 'quadrant', label: 'Quadrant' },
    { id: 'impression', label: 'Digital Impression' },
  ];

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const clinicParam = activeClinic?.id ? `&clinicId=${activeClinic.id}` : '';
      let url = `/api/dental/documents?leadId=${leadId}&documentType=OTHER&category=3d-scan${clinicParam}`;
      console.log('🔍 [StlScanViewer] Fetching:', url);
      let res = await fetch(url);
      console.log('🔍 [StlScanViewer] Response status:', res.status);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.error('❌ [StlScanViewer] API error:', res.status, errText);
        setFetchError(`Failed to load scans (${res.status})`);
        return;
      }
      let data = await res.json();
      let docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];

      if (docs.length === 0 && activeClinic?.id) {
        const fallbackUrl = `/api/dental/documents?leadId=${leadId}&documentType=OTHER&category=3d-scan`;
        console.log('🔍 [StlScanViewer] 0 docs with clinicId, retrying without:', fallbackUrl);
        res = await fetch(fallbackUrl);
        if (res.ok) {
          data = await res.json();
          docs = Array.isArray(data?.documents) ? data.documents : Array.isArray(data) ? data : [];
          console.log('🔍 [StlScanViewer] Fallback returned', docs.length, 'documents');
        }
      }

      console.log('🔍 [StlScanViewer] Received', docs.length, 'documents', docs.map((d: any) => d.fileName));
      const mapped: ScanRecord[] = docs
        .filter((d: any) => {
          const name = (d.fileName || d.originalName || '').toLowerCase();
          return name.endsWith('.stl') || name.endsWith('.ply') || name.endsWith('.obj');
        })
        .map((d: any) => ({
          id: d.id,
          url: d.fileUrl || d.url || `/api/dental/documents/${d.id}/download`,
          fileName: d.fileName || d.originalName || 'scan.stl',
          dateTaken: d.createdAt || d.uploadedAt || new Date().toISOString(),
          scanType: d.tags || 'full-arch-upper',
        }));
      console.log('🔍 [StlScanViewer] Mapped', mapped.length, 'scans, URLs:', mapped.map(s => s.url));
      setScans(mapped);
      if (mapped.length > 0) setSelectedScan(mapped[0]);
    } catch (err) {
      console.error('[StlScanViewer] Error fetching scans:', err);
      setFetchError('Failed to load scans');
    } finally {
      setLoading(false);
    }
  }, [leadId, activeClinic?.id]);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  const handleUpload = async (file: File) => {
    if (!session?.user?.id) { toast.error('Please sign in'); return; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['stl', 'ply', 'obj'].includes(ext || '')) {
      toast.error('Please upload an STL, PLY, or OBJ file');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('documentType', 'OTHER');
      formData.append('category', '3d-scan');
      formData.append('tags', 'full-arch-upper');
      formData.append('accessLevel', 'RESTRICTED');
      formData.append('description', `3D intraoral scan — ${file.name}`);
      if (activeClinic?.id) formData.append('clinicId', activeClinic.id);

      const res = await fetch('/api/dental/documents', { method: 'POST', body: formData });
      if (res.ok) {
        toast.success('3D scan uploaded');
        fetchScans();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const Viewer = ({ scan, height }: { scan: ScanRecord; height: string }) => (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden bg-gradient-to-b from-gray-900 to-gray-800 relative">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.0} castShadow />
        <directionalLight position={[-3, -3, 2]} intensity={0.4} />
        <directionalLight position={[0, -5, 3]} intensity={0.3} />
        <Suspense fallback={<Loader />}>
          <SceneContent url={scan.url} color={modelColor} fileName={scan.fileName} />
        </Suspense>
        <OrbitControls
          enablePan
          enableZoom
          enableRotate
          minDistance={2}
          maxDistance={20}
          autoRotate={false}
        />
      </Canvas>
      <div className="absolute bottom-2 left-2 flex gap-1">
        <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-[10px]">
          {scan.fileName}
        </Badge>
        <Badge variant="outline" className="bg-black/50 text-white border-white/20 text-[10px]">
          {new Date(scan.dateTaken).toLocaleDateString()}
        </Badge>
      </div>
      <div className="absolute top-2 right-2 flex gap-1">
        {['#e8dcc8', '#ffffff', '#b0d4f1', '#f0c0c0'].map(c => (
          <button
            key={c}
            onClick={() => setModelColor(c)}
            className={`w-4 h-4 rounded-full border-2 ${modelColor === c ? 'border-white' : 'border-white/30'}`}
            style={{ backgroundColor: c }}
            title="Change model color"
          />
        ))}
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-500">3D Scans</span>
          <Badge variant="outline" className="text-[10px]">{scans.length} scans</Badge>
        </div>
        {loading ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">Loading scans...</p>
          </div>
        ) : fetchError ? (
          <div className="text-center py-4">
            <p className="text-[10px] text-red-500">{fetchError}</p>
            <button onClick={() => fetchScans()} className="text-[10px] text-purple-600 underline mt-1">Retry</button>
          </div>
        ) : scans.length > 0 ? (
          <div className="space-y-1.5">
            {scans.slice(0, 3).map(scan => (
              <div key={scan.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-purple-50/30 border border-gray-100">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                  <Box className="w-4 h-4 text-purple-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-700 truncate">{scan.fileName}</p>
                  <p className="text-[9px] text-gray-400">{new Date(scan.dateTaken).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
            {scans.length > 3 && (
              <p className="text-[9px] text-gray-400 text-center">+{scans.length - 3} more scans</p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Box className="w-6 h-6 text-gray-300 mx-auto mb-1" />
            <p className="text-[10px] text-gray-400">No 3D scans yet</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.ply,.obj"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold">3D Intraoral Scans</span>
          <Badge variant="outline" className="text-xs">{scans.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-xs h-7"
          >
            {uploading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            Upload STL
          </Button>
          {selectedScan && (
            <Button size="sm" variant="outline" onClick={() => setFullscreen(true)} className="text-xs h-7">
              <Maximize2 className="w-3 h-3 mr-1" /> Fullscreen
            </Button>
          )}
        </div>
      </div>

      {/* Scan list */}
      {scans.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {scans.map(scan => (
            <button
              key={scan.id}
              onClick={() => setSelectedScan(scan)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedScan?.id === scan.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            >
              <Box className="w-3 h-3 inline mr-1" />
              {scan.fileName.length > 20 ? scan.fileName.slice(0, 17) + '...' : scan.fileName}
            </button>
          ))}
        </div>
      )}

      {/* 3D Viewer */}
      {selectedScan ? (
        <Viewer scan={selectedScan} height="400px" />
      ) : loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-400">Loading scans...</p>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Box className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 font-medium">No 3D Scans Yet</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Upload STL, PLY, or OBJ files from iTero, 3Shape, Medit, or other intraoral scanners
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3 h-3 mr-1" /> Upload Scan
          </Button>
        </div>
      )}

      {/* Supported Scanners */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-[10px] text-gray-500 font-medium mb-1.5">Compatible Scanners</p>
        <div className="flex gap-2 flex-wrap">
          {['iTero', '3Shape TRIOS', 'Medit i-Series', 'Planmeca', 'Carestream', 'CEREC'].map(s => (
            <Badge key={s} variant="outline" className="text-[10px] bg-white">{s}</Badge>
          ))}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && selectedScan && (
        <div className="fixed inset-0 z-50 bg-black">
          <button
            className="absolute top-4 right-4 z-10 bg-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-gray-100"
            onClick={() => setFullscreen(false)}
          >
            <X className="w-4 h-4" />
          </button>
          <Viewer scan={selectedScan} height="100vh" />
        </div>
      )}
    </div>
  );
}
