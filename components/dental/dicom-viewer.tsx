/**
 * Advanced DICOM Viewer Component
 * Features: Zoom, Pan, Window/Level, Measurements, Annotations, AI Analysis
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, Ruler, PenTool,
  Brain, X, AlertCircle, Hand, Trash2, Type, Circle, Square,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

interface DicomViewerProps {
  xrayId: string;
  imageUrl: string;
  dicomFile?: string;
  xrayType?: string;
  initialAnalysis?: any;
  onAnalysisComplete?: (analysis: any) => void;
  readOnly?: boolean;
}

interface Measurement {
  id: string;
  type: 'distance';
  startPx: { x: number; y: number }; // in image pixel coords
  endPx: { x: number; y: number };
  valueMm: number;
}

interface Annotation {
  id: string;
  type: 'circle' | 'rectangle' | 'text';
  imgX: number; // in image pixel coords
  imgY: number;
  imgW: number;
  imgH: number;
  text?: string;
  color: string;
}

type ActiveTool = 'pan' | 'measure' | 'annotate-circle' | 'annotate-rect' | 'annotate-text';

const MM_PER_PIXEL_DEFAULT = 0.1; // ~10 pixels per mm at native resolution (typical dental x-ray)

export function DicomViewer({
  xrayId,
  imageUrl,
  dicomFile,
  xrayType = 'PANORAMIC',
  initialAnalysis,
  onAnalysisComplete,
  readOnly = false,
}: DicomViewerProps) {
  const t = useTranslations('dental.xray');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // View state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Window/Level
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);

  // Tools
  const [activeTool, setActiveTool] = useState<ActiveTool>('pan');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawEnd, setDrawEnd] = useState<{ x: number; y: number } | null>(null);

  // Pan dragging
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(initialAnalysis);
  const [showAnalysis, setShowAnalysis] = useState(!!initialAnalysis);

  // Calibration
  const [mmPerPixel, setMmPerPixel] = useState(MM_PER_PIXEL_DEFAULT);

  // ─── Image loading ────────────────────────────────────────────────────────

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      // Auto-fit to canvas
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = rect.width / img.width;
        const scaleY = rect.height / img.height;
        setScale(Math.min(scaleX, scaleY) * 0.95);
      }
      requestDraw();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // ─── Coordinate transforms ────────────────────────────────────────────────

  const screenToImage = useCallback((screenX: number, screenY: number): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    // Reverse the canvas transform: translate(center) → rotate → scale → translate(-img/2 + pan)
    let dx = screenX - rect.left - cx;
    let dy = screenY - rect.top - cy;
    // Undo rotation
    const rad = -(rotation * Math.PI) / 180;
    const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
    // Undo scale and pan
    const imgX = rx / scale - panX + imageRef.current.width / 2;
    const imgY = ry / scale - panY + imageRef.current.height / 2;
    return { x: imgX, y: imgY };
  }, [scale, panX, panY, rotation]);

  // ─── Draw ─────────────────────────────────────────────────────────────────

  // Use a ref so requestDraw always calls the latest draw function
  const drawFnRef = useRef<() => void>(() => {});

  const requestDraw = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => drawFnRef.current());
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(rect.width / 2, rect.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(panX - imageRef.current.width / 2, panY - imageRef.current.height / 2);

    // Draw image with brightness/contrast via filter
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(imageRef.current, 0, 0);
    ctx.filter = 'none';

    // Draw measurements
    for (const m of measurements) {
      drawMeasurement(ctx, m);
    }

    // Draw active measurement preview
    if (isDrawing && drawStart && drawEnd && activeTool === 'measure') {
      const preview: Measurement = {
        id: 'preview',
        type: 'distance',
        startPx: drawStart,
        endPx: drawEnd,
        valueMm: distancePx(drawStart, drawEnd) * mmPerPixel,
      };
      drawMeasurement(ctx, preview);
    }

    // Draw annotations
    for (const a of annotations) {
      drawAnnotation(ctx, a);
    }

    // Draw active annotation preview
    if (isDrawing && drawStart && drawEnd && (activeTool === 'annotate-circle' || activeTool === 'annotate-rect')) {
      const preview: Annotation = {
        id: 'preview',
        type: activeTool === 'annotate-circle' ? 'circle' : 'rectangle',
        imgX: Math.min(drawStart.x, drawEnd.x),
        imgY: Math.min(drawStart.y, drawEnd.y),
        imgW: Math.abs(drawEnd.x - drawStart.x),
        imgH: Math.abs(drawEnd.y - drawStart.y),
        color: '#ef4444',
      };
      drawAnnotation(ctx, preview);
    }

    ctx.restore();
  }, [scale, panX, panY, rotation, brightness, contrast, measurements, annotations, isDrawing, drawStart, drawEnd, activeTool, mmPerPixel]);

  // Keep the ref in sync so requestDraw always calls the current draw
  drawFnRef.current = draw;

  useEffect(() => {
    requestDraw();
  }, [draw, requestDraw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => requestDraw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [requestDraw]);

  // ─── Drawing helpers ──────────────────────────────────────────────────────

  function distancePx(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  }

  function drawMeasurement(ctx: CanvasRenderingContext2D, m: Measurement) {
    const { startPx: s, endPx: e, valueMm } = m;

    // Line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();

    // Endpoints
    const dotR = 4 / scale;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(s.x, s.y, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(e.x, e.y, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Perpendicular end caps
    const angle = Math.atan2(e.y - s.y, e.x - s.x);
    const capLen = 8 / scale;
    const perpAngle = angle + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(s.x + Math.cos(perpAngle) * capLen, s.y + Math.sin(perpAngle) * capLen);
    ctx.lineTo(s.x - Math.cos(perpAngle) * capLen, s.y - Math.sin(perpAngle) * capLen);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(perpAngle) * capLen, e.y + Math.sin(perpAngle) * capLen);
    ctx.lineTo(e.x - Math.cos(perpAngle) * capLen, e.y - Math.sin(perpAngle) * capLen);
    ctx.stroke();

    // Label
    const midX = (s.x + e.x) / 2;
    const midY = (s.y + e.y) / 2;
    const fontSize = Math.max(12, 14 / scale);
    ctx.font = `bold ${fontSize}px monospace`;
    const label = `${valueMm.toFixed(1)} mm`;
    const textMetrics = ctx.measureText(label);
    const padX = 4 / scale;
    const padY = 3 / scale;

    // Background pill
    ctx.fillStyle = 'rgba(30,58,138,0.85)';
    const rx = midX - textMetrics.width / 2 - padX;
    const ry = midY - fontSize / 2 - padY;
    const rw = textMetrics.width + padX * 2;
    const rh = fontSize + padY * 2;
    const radius = 4 / scale;
    ctx.beginPath();
    ctx.moveTo(rx + radius, ry);
    ctx.lineTo(rx + rw - radius, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
    ctx.lineTo(rx + rw, ry + rh - radius);
    ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
    ctx.lineTo(rx + radius, ry + rh);
    ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
    ctx.lineTo(rx, ry + radius);
    ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
    ctx.fill();

    ctx.fillStyle = '#93c5fd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, midX, midY);
  }

  function drawAnnotation(ctx: CanvasRenderingContext2D, a: Annotation) {
    ctx.strokeStyle = a.color;
    ctx.lineWidth = 2 / scale;
    ctx.setLineDash([6 / scale, 4 / scale]);

    if (a.type === 'circle') {
      const rx = a.imgW / 2;
      const ry = a.imgH / 2;
      ctx.beginPath();
      ctx.ellipse(a.imgX + rx, a.imgY + ry, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (a.type === 'rectangle') {
      ctx.strokeRect(a.imgX, a.imgY, a.imgW, a.imgH);
    } else if (a.type === 'text' && a.text) {
      const fontSize = Math.max(14, 16 / scale);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = a.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const metrics = ctx.measureText(a.text);
      const pad = 3 / scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(a.imgX - pad, a.imgY - pad, metrics.width + pad * 2, fontSize + pad * 2);

      ctx.fillStyle = a.color;
      ctx.fillText(a.text, a.imgX, a.imgY);
    }

    ctx.setLineDash([]);
  }

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (readOnly && activeTool !== 'pan') return;

    const imgPt = screenToImage(e.clientX, e.clientY);
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (activeTool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: sx, y: sy });
    } else if (activeTool === 'measure') {
      setIsDrawing(true);
      setDrawStart(imgPt);
      setDrawEnd(imgPt);
    } else if (activeTool === 'annotate-circle' || activeTool === 'annotate-rect') {
      setIsDrawing(true);
      setDrawStart(imgPt);
      setDrawEnd(imgPt);
    } else if (activeTool === 'annotate-text') {
      const text = prompt('Enter annotation text:');
      if (text) {
        setAnnotations(prev => [...prev, {
          id: Date.now().toString(),
          type: 'text',
          imgX: imgPt.x,
          imgY: imgPt.y,
          imgW: 0,
          imgH: 0,
          text,
          color: '#f59e0b',
        }]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDragging && activeTool === 'pan' && lastMousePos) {
      const rect = canvasRef.current!.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      setPanX(prev => prev + (sx - lastMousePos.x) / scale);
      setPanY(prev => prev + (sy - lastMousePos.y) / scale);
      setLastMousePos({ x: sx, y: sy });
    } else if (isDrawing && (activeTool === 'measure' || activeTool === 'annotate-circle' || activeTool === 'annotate-rect')) {
      const imgPt = screenToImage(e.clientX, e.clientY);
      setDrawEnd(imgPt);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isDrawing && activeTool === 'measure' && drawStart && drawEnd) {
      const px = distancePx(drawStart, drawEnd);
      if (px > 5) {
        setMeasurements(prev => [...prev, {
          id: Date.now().toString(),
          type: 'distance',
          startPx: drawStart,
          endPx: drawEnd,
          valueMm: px * mmPerPixel,
        }]);
      }
    }

    if (isDrawing && (activeTool === 'annotate-circle' || activeTool === 'annotate-rect') && drawStart && drawEnd) {
      const w = Math.abs(drawEnd.x - drawStart.x);
      const h = Math.abs(drawEnd.y - drawStart.y);
      if (w > 5 || h > 5) {
        setAnnotations(prev => [...prev, {
          id: Date.now().toString(),
          type: activeTool === 'annotate-circle' ? 'circle' : 'rectangle',
          imgX: Math.min(drawStart.x, drawEnd.x),
          imgY: Math.min(drawStart.y, drawEnd.y),
          imgW: w,
          imgH: h,
          color: '#ef4444',
        }]);
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawEnd(null);
    setIsDragging(false);
    setLastMousePos(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // ─── Sidebar hover ────────────────────────────────────────────────────────

  const handleSidebarEnter = () => {
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    setSidebarOpen(true);
  };

  const handleSidebarLeave = () => {
    if (sidebarPinned) return;
    sidebarTimerRef.current = setTimeout(() => setSidebarOpen(false), 400);
  };

  // ─── Zoom helpers ─────────────────────────────────────────────────────────

  const handleZoom = (delta: number) => {
    setScale(prev => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // ─── AI Analysis ──────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/dental/xrays/${xrayId}/analyze`, { method: 'POST' });
      if (!response.ok) throw new Error('Analysis failed');
      const data = await response.json();
      setAnalysis(data.analysis);
      setShowAnalysis(true);
      setSidebarOpen(true);
      setSidebarPinned(true);
      onAnalysisComplete?.(data.analysis);
      toast.success('AI analysis completed');
    } catch (error) {
      console.error('Error analyzing X-ray:', error);
      toast.error('Failed to analyze X-ray');
    } finally {
      setAnalyzing(false);
    }
  };

  // ─── Cursor style ─────────────────────────────────────────────────────────

  const cursorStyle =
    activeTool === 'pan' ? (isDragging ? 'grabbing' : 'grab') :
    activeTool === 'measure' ? 'crosshair' :
    activeTool.startsWith('annotate') ? 'crosshair' : 'default';

  // ─── Active tool button helper ────────────────────────────────────────────

  const toolBtn = (tool: ActiveTool, label: string, icon: React.ReactNode) => (
    <Button
      variant={activeTool === tool ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTool(tool)}
      className={`h-8 text-xs ${activeTool === tool ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'text-gray-300 hover:text-white hover:bg-gray-700'}`}
    >
      {icon}
      <span className="ml-1">{label}</span>
    </Button>
  );

  return (
    <div
      className="relative w-full h-full bg-gray-900 flex flex-col"
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 gap-1 flex-wrap">
        <div className="flex items-center gap-1">
          {toolBtn('pan', 'Pan', <Hand className="w-3.5 h-3.5" />)}
          {toolBtn('measure', 'Measure', <Ruler className="w-3.5 h-3.5" />)}
          {!readOnly && (
            <>
              {toolBtn('annotate-circle', 'Circle', <Circle className="w-3.5 h-3.5" />)}
              {toolBtn('annotate-rect', 'Rectangle', <Square className="w-3.5 h-3.5" />)}
              {toolBtn('annotate-text', 'Text', <Type className="w-3.5 h-3.5" />)}
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleZoom(-0.15)} className="h-8 text-gray-300 hover:text-white hover:bg-gray-700 px-2">
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-300 min-w-[50px] text-center font-mono">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={() => handleZoom(0.15)} className="h-8 text-gray-300 hover:text-white hover:bg-gray-700 px-2">
            <ZoomIn className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-gray-700 mx-1" />

          <Button variant="ghost" size="sm" onClick={() => setRotation(r => (r + 90) % 360)} className="h-8 text-gray-300 hover:text-white hover:bg-gray-700 px-2">
            <RotateCw className="w-4 h-4" />
          </Button>

          <div className="w-px h-5 bg-gray-700 mx-1" />

          <Button
            variant="ghost" size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="h-8 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-900/40 px-2"
            title="AI analysis is for information purposes only. Not for diagnostic use."
          >
            <Brain className={`w-4 h-4 mr-1 ${analyzing ? 'animate-spin' : ''}`} />
            <span className="text-xs">{analyzing ? 'Analyzing...' : 'AI Analyze'}</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Main Viewer */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-black"
          style={{ cursor: cursorStyle }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />

          {/* Measurement count overlay */}
          {(measurements.length > 0 || annotations.length > 0) && (
            <div className="absolute top-2 left-2 flex gap-1.5">
              {measurements.length > 0 && (
                <Badge variant="outline" className="bg-blue-950/80 text-blue-300 border-blue-500/30 text-[10px]">
                  {measurements.length} measurement{measurements.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {annotations.length > 0 && (
                <Badge variant="outline" className="bg-red-950/80 text-red-300 border-red-500/30 text-[10px]">
                  {annotations.length} annotation{annotations.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {/* Tool hint overlay */}
          {activeTool === 'measure' && !isDrawing && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-gray-300 text-xs px-3 py-1.5 rounded-full">
              Click and drag to measure distance
            </div>
          )}
          {activeTool.startsWith('annotate') && !isDrawing && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 text-gray-300 text-xs px-3 py-1.5 rounded-full">
              {activeTool === 'annotate-text' ? 'Click to place text annotation' : 'Click and drag to draw'}
            </div>
          )}
        </div>

        {/* Sidebar — hover to expand, pin to keep open */}
        <div
          className="absolute right-0 top-0 bottom-0 z-10 flex"
          onMouseEnter={handleSidebarEnter}
          onMouseLeave={handleSidebarLeave}
        >
          {/* Hover trigger strip */}
          {!sidebarOpen && (
            <div className="w-8 h-full bg-gradient-to-l from-gray-800/80 to-transparent flex items-center justify-center cursor-pointer">
              <div className="w-1 h-16 bg-gray-600 rounded-full" />
            </div>
          )}

          {/* Sidebar panel */}
          <div
            className={`bg-gray-800 border-l border-gray-700 overflow-y-auto flex flex-col transition-all duration-300 ease-in-out ${
              sidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'
            }`}
          >
            {sidebarOpen && (
              <>
                {/* Pin / close */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">Settings</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => setSidebarPinned(!sidebarPinned)}
                      className={`h-6 px-2 text-[10px] ${sidebarPinned ? 'text-indigo-400' : 'text-gray-500'}`}
                    >
                      {sidebarPinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => { setSidebarOpen(false); setSidebarPinned(false); }}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Tabs defaultValue={showAnalysis && analysis ? 'analysis' : 'settings'} className="flex-1 flex flex-col">
                  <TabsList className="grid w-full grid-cols-3 mx-2 mt-2 bg-gray-900 border border-gray-700" style={{ width: 'calc(100% - 16px)' }}>
                    <TabsTrigger value="settings" className="text-[10px] text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">Settings</TabsTrigger>
                    <TabsTrigger value="measurements" className="text-[10px] text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">Measure</TabsTrigger>
                    <TabsTrigger value="analysis" className="text-[10px] text-gray-400 data-[state=active]:text-white data-[state=active]:bg-gray-700">AI</TabsTrigger>
                  </TabsList>

                  <TabsContent value="settings" className="flex-1 p-3 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 block">Brightness</label>
                      <Slider value={[brightness]} onValueChange={([v]) => setBrightness(v)} min={20} max={300} step={5} className="w-full" />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{brightness}%</span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 block">Contrast</label>
                      <Slider value={[contrast]} onValueChange={([v]) => setContrast(v)} min={20} max={300} step={5} className="w-full" />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{contrast}%</span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 block">Rotation</label>
                      <Slider value={[rotation]} onValueChange={([v]) => setRotation(v)} min={0} max={360} step={90} className="w-full" />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{rotation}°</span>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-300 mb-1.5 block">
                        Calibration (mm/pixel)
                      </label>
                      <Slider value={[mmPerPixel * 100]} onValueChange={([v]) => setMmPerPixel(v / 100)} min={1} max={50} step={1} className="w-full" />
                      <span className="text-[10px] text-gray-500 mt-0.5 block">{mmPerPixel.toFixed(2)} mm/px</span>
                    </div>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setScale(1); setPanX(0); setPanY(0); setRotation(0); setBrightness(100); setContrast(100); }}
                      className="w-full text-xs text-gray-300 border-gray-600 hover:text-white hover:bg-gray-700"
                    >
                      Reset View
                    </Button>
                  </TabsContent>

                  <TabsContent value="measurements" className="flex-1 p-3">
                    <div className="space-y-2">
                      {measurements.length === 0 && annotations.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-6">
                          Use Measure or Annotate tools to add markers.
                        </p>
                      ) : (
                        <>
                          {measurements.map(m => (
                            <div key={m.id} className="p-2 bg-gray-700/50 rounded-md flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Ruler className="h-3 w-3 text-blue-400" />
                                <span className="text-xs text-white font-mono">{m.valueMm.toFixed(1)} mm</span>
                              </div>
                              {!readOnly && (
                                <Button variant="ghost" size="sm" onClick={() => setMeasurements(prev => prev.filter(x => x.id !== m.id))} className="h-5 w-5 p-0 text-gray-500 hover:text-red-400">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {annotations.map(a => (
                            <div key={a.id} className="p-2 bg-gray-700/50 rounded-md flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {a.type === 'circle' ? <Circle className="h-3 w-3 text-red-400" /> :
                                 a.type === 'rectangle' ? <Square className="h-3 w-3 text-red-400" /> :
                                 <Type className="h-3 w-3 text-amber-400" />}
                                <span className="text-xs text-white">{a.type}{a.text ? `: ${a.text}` : ''}</span>
                              </div>
                              {!readOnly && (
                                <Button variant="ghost" size="sm" onClick={() => setAnnotations(prev => prev.filter(x => x.id !== a.id))} className="h-5 w-5 p-0 text-gray-500 hover:text-red-400">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                          {!readOnly && (measurements.length > 0 || annotations.length > 0) && (
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => { setMeasurements([]); setAnnotations([]); }}
                              className="w-full text-[10px] text-gray-500 hover:text-red-400 mt-2"
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Clear All
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="analysis" className="flex-1 p-3">
                    {/* Disclaimer */}
                    <div className="p-2.5 bg-yellow-900/30 border border-yellow-700/50 rounded-lg mb-3">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="text-[10px] text-yellow-200/80 space-y-0.5">
                          <p className="font-semibold">DISCLAIMER</p>
                          <p>AI analysis is for information only. Not for diagnostic use. Requires professional interpretation.</p>
                        </div>
                      </div>
                    </div>

                    {showAnalysis && analysis ? (
                      <div className="space-y-3">
                        <div className="p-2.5 bg-gray-700/50 rounded-lg">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Brain className="w-4 h-4 text-purple-400" />
                            <h3 className="font-semibold text-white text-xs">AI Analysis</h3>
                          </div>
                          <div className="text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {analysis.findings}
                          </div>
                          {analysis.recommendations && (
                            <div className="mt-2.5 pt-2.5 border-t border-gray-600">
                              <div className="text-[10px] font-semibold text-gray-400 mb-1">Recommendations:</div>
                              <div className="text-[11px] text-gray-300 leading-relaxed">{analysis.recommendations}</div>
                            </div>
                          )}
                          <div className="mt-2.5 pt-2 border-t border-gray-600 flex gap-2">
                            <Badge variant="outline" className="text-[9px] text-gray-300 border-gray-600">
                              Confidence: {Math.round((analysis.confidence || 0) * 100)}%
                            </Badge>
                            <Badge variant="outline" className="text-[9px] text-gray-300 border-gray-600">
                              {analysis.model || 'gpt-4-vision'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Brain className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                        <p className="text-xs text-gray-500 mb-3">Click "AI Analyze" to analyze this X-ray.</p>
                        <Button onClick={handleAnalyze} disabled={analyzing} size="sm" className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                          <Brain className={`w-3.5 h-3.5 mr-1 ${analyzing ? 'animate-spin' : ''}`} />
                          {analyzing ? 'Analyzing...' : 'Start Analysis'}
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
