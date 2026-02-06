/**
 * Custom Electronic Signature Component
 * Exact match to image - signature area with clear and confirm buttons
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PenTool, X } from 'lucide-react';

export function CustomSignature() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(true); // Show mock signature initially

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = 100;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw mock signature "Signit"
    if (hasSignature) {
      ctx.font = '24px cursive';
      ctx.fillText('Signit', 20, 50);
    }
  }, [hasSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setHasSignature(true);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  return (
    <div className="space-y-3">
      {/* Signature Area */}
      <div className="relative border-2 border-gray-300 rounded bg-white">
        <canvas
          ref={canvasRef}
          className="w-full h-24 cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />
        {/* Stylus icon overlay */}
        <div className="absolute top-2 right-2">
          <PenTool className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1 border-gray-300 text-gray-700"
          onClick={handleClear}
        >
          <X className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
