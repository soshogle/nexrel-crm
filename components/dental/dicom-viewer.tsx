/**
 * Advanced DICOM Viewer Component
 * Features: Zoom, Pan, Window/Level, Measurements, Annotations, AI Analysis
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Ruler,
  PenTool,
  Brain,
  Download,
  Settings,
  X,
  CheckCircle2,
  AlertCircle,
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
  type: 'distance' | 'angle' | 'area';
  points: Array<{ x: number; y: number }>;
  value?: number;
  unit?: string;
}

interface Annotation {
  id: string;
  type: 'arrow' | 'circle' | 'rectangle' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
}

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

  // View state
  const [scale, setScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Window/Level (brightness/contrast)
  const [windowCenter, setWindowCenter] = useState(2000);
  const [windowWidth, setWindowWidth] = useState(4000);

  // Tools
  const [activeTool, setActiveTool] = useState<'pan' | 'zoom' | 'measure' | 'annotate'>('pan');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // AI Analysis
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(initialAnalysis);
  const [showAnalysis, setShowAnalysis] = useState(!!initialAnalysis);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      drawImage();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Draw image on canvas
  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(panX - imageRef.current.width / 2, panY - imageRef.current.height / 2);

    // Apply window/level (simplified - in production, would use actual DICOM windowing)
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw measurements
    measurements.forEach((measurement) => {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (measurement.points.length > 0) {
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        measurement.points.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      }
    });

    // Draw annotations
    annotations.forEach((annotation) => {
      ctx.strokeStyle = annotation.color;
      ctx.fillStyle = annotation.color;
      ctx.lineWidth = 2;
      if (annotation.type === 'circle' && annotation.width) {
        ctx.beginPath();
        ctx.arc(annotation.x, annotation.y, annotation.width / 2, 0, Math.PI * 2);
        ctx.stroke();
      } else if (annotation.type === 'rectangle' && annotation.width && annotation.height) {
        ctx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      } else if (annotation.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(annotation.x, annotation.y);
        ctx.lineTo(annotation.x + (annotation.width || 20), annotation.y + (annotation.height || 20));
        ctx.stroke();
      } else if (annotation.type === 'text' && annotation.text) {
        ctx.font = '16px Arial';
        ctx.fillText(annotation.text, annotation.x, annotation.y);
      }
    });

    ctx.restore();
  }, [scale, panX, panY, rotation, windowCenter, windowWidth, measurements, annotations]);

  useEffect(() => {
    drawImage();
  }, [drawImage]);

  // Mouse handlers
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x, y });
    } else if (activeTool === 'measure') {
      setIsDrawing(true);
      setDrawStart({ x, y });
    } else if (activeTool === 'annotate') {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        type: 'circle',
        x,
        y,
        width: 20,
        height: 20,
        color: '#ef4444',
      };
      setAnnotations([...annotations, newAnnotation]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && activeTool === 'pan' && lastMousePos) {
      setPanX(panX + (x - lastMousePos.x) / scale);
      setPanY(panY + (y - lastMousePos.y) / scale);
      setLastMousePos({ x, y });
    } else if (isDrawing && activeTool === 'measure' && drawStart) {
      // Update measurement preview
      drawImage();
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && activeTool === 'measure' && drawStart) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const endX = rect.width / 2;
        const endY = rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(endX - drawStart.x, 2) + Math.pow(endY - drawStart.y, 2)
        );
        const newMeasurement: Measurement = {
          id: Date.now().toString(),
          type: 'distance',
          points: [drawStart, { x: endX, y: endY }],
          value: distance * (scale / 100), // Simplified - would need pixel spacing from DICOM
          unit: 'mm',
        };
        setMeasurements([...measurements, newMeasurement]);
      }
      setIsDrawing(false);
      setDrawStart(null);
    }
    setIsDragging(false);
    setLastMousePos(null);
  };

  // Zoom
  const handleZoom = (delta: number) => {
    const newScale = Math.max(0.1, Math.min(5, scale + delta));
    setScale(newScale);
  };

  // AI Analysis
  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(`/api/dental/xrays/${xrayId}/analyze`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setShowAnalysis(true);
      onAnalysisComplete?.(data.analysis);
      toast.success('AI analysis completed');
    } catch (error) {
      console.error('Error analyzing X-ray:', error);
      toast.error('Failed to analyze X-ray');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Button
            variant={activeTool === 'pan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('pan')}
            className="h-8"
          >
            Pan
          </Button>
          <Button
            variant={activeTool === 'zoom' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTool('zoom')}
            className="h-8"
          >
            Zoom
          </Button>
          {!readOnly && (
            <>
              <Button
                variant={activeTool === 'measure' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTool('measure')}
                className="h-8"
              >
                <Ruler className="w-4 h-4 mr-1" />
                Measure
              </Button>
              <Button
                variant={activeTool === 'annotate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTool('annotate')}
                className="h-8"
              >
                <PenTool className="w-4 h-4 mr-1" />
                Annotate
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom(-0.1)}
            className="h-8"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-300 min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom(0.1)}
            className="h-8"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="h-8"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-8"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalyze}
            disabled={analyzing}
            className="h-8"
            title="AI analysis is for information purposes only. Not for diagnostic use."
          >
            <Brain className={`w-4 h-4 mr-1 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Analyzing...' : 'AI Analyze'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Viewer */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-black"
          style={{ cursor: activeTool === 'pan' ? 'grab' : activeTool === 'zoom' ? 'zoom-in' : 'crosshair' }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(e) => {
              e.preventDefault();
              handleZoom(e.deltaY > 0 ? -0.1 : 0.1);
            }}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex flex-col">
          <Tabs defaultValue="settings" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="settings" className="flex-1 p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Window Center (Brightness)
                </label>
                <Slider
                  value={[windowCenter]}
                  onValueChange={([value]) => setWindowCenter(value)}
                  min={0}
                  max={4096}
                  step={50}
                  className="w-full"
                />
                <span className="text-xs text-gray-400 mt-1">{windowCenter}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Window Width (Contrast)
                </label>
                <Slider
                  value={[windowWidth]}
                  onValueChange={([value]) => setWindowWidth(value)}
                  min={100}
                  max={8000}
                  step={100}
                  className="w-full"
                />
                <span className="text-xs text-gray-400 mt-1">{windowWidth}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Rotation
                </label>
                <Slider
                  value={[rotation]}
                  onValueChange={([value]) => setRotation(value)}
                  min={0}
                  max={360}
                  step={90}
                  className="w-full"
                />
                <span className="text-xs text-gray-400 mt-1">{rotation}°</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScale(1);
                  setPanX(0);
                  setPanY(0);
                  setRotation(0);
                }}
                className="w-full"
              >
                Reset View
              </Button>
            </TabsContent>

            <TabsContent value="measurements" className="flex-1 p-4">
              <div className="space-y-2">
                {measurements.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No measurements yet. Use the Measure tool to add measurements.
                  </p>
                ) : (
                  measurements.map((measurement) => (
                    <div
                      key={measurement.id}
                      className="p-2 bg-gray-700 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm text-white">
                          {measurement.type}: {measurement.value?.toFixed(2)} {measurement.unit}
                        </div>
                      </div>
                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMeasurements(measurements.filter((m) => m.id !== measurement.id))
                          }
                          className="h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 p-4">
              {showAnalysis && analysis ? (
                <div className="space-y-4">
                  {/* Medical Device Disclaimer */}
                  <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-200 space-y-1">
                        <p className="font-semibold">IMPORTANT DISCLAIMER:</p>
                        <p>• AI analysis is for information purposes only</p>
                        <p>• Not for diagnostic use</p>
                        <p>• Requires professional interpretation</p>
                        <p>• Not a substitute for professional judgment</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-gray-700 rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-5 h-5 text-purple-400" />
                      <h3 className="font-semibold text-white">AI Analysis</h3>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">
                      {analysis.findings}
                    </div>
                    {analysis.recommendations && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="text-xs font-semibold text-gray-400 mb-1">
                          Recommendations:
                        </div>
                        <div className="text-sm text-gray-300">{analysis.recommendations}</div>
                      </div>
                    )}
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <Badge variant="outline" className="text-xs">
                        Confidence: {Math.round((analysis.confidence || 0) * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs ml-2">
                        Model: {analysis.model || 'gpt-4-vision'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Medical Device Disclaimer */}
                  <div className="p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-yellow-200 space-y-1">
                        <p className="font-semibold">IMPORTANT DISCLAIMER:</p>
                        <p>• AI analysis is for information purposes only</p>
                        <p>• Not for diagnostic use</p>
                        <p>• Requires professional interpretation</p>
                        <p>• Not a substitute for professional judgment</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-8">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-400 mb-4">
                      No analysis yet. Click "AI Analyze" to analyze this X-ray.
                    </p>
                    <Button onClick={handleAnalyze} disabled={analyzing} size="sm">
                      <Brain className={`w-4 h-4 mr-2 ${analyzing ? 'animate-spin' : ''}`} />
                      {analyzing ? 'Analyzing...' : 'Start Analysis'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
