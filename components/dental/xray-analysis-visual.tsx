/**
 * X-Ray Analysis Visualization
 * 3D tooth visualization with diagnostic overlays matching image
 */

'use client';

import { useState } from 'react';

export function XRayAnalysisVisual() {
  return (
    <div className="relative space-y-3">
      {/* 3D Tooth Visualization Area */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
        {/* Mock 3D Tooth */}
        <div className="relative w-32 h-40">
          {/* Tooth shape */}
          <div className="absolute inset-0 bg-white/80 rounded-t-full border-2 border-gray-400 shadow-lg" />
          {/* Root */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-16 bg-white/80 rounded-b-full border-2 border-gray-400" />
          
          {/* Diagnostic Overlays */}
          {/* Top Left - Cavities */}
          <div className="absolute -top-2 -left-8 bg-white border border-purple-300 rounded p-1 shadow-sm">
            <div className="text-[10px] font-medium text-gray-900">Diagnostic: Cavities Detected</div>
            <div className="text-[10px] text-gray-600">Severity: Moderate</div>
          </div>
          
          {/* Right Side - Caries */}
          <div className="absolute top-8 -right-12 bg-white border border-purple-300 rounded p-1 shadow-sm">
            <div className="text-[10px] font-medium text-gray-900">Diagnostic: Caries: 5.9mm</div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-px bg-purple-400" />
          </div>
          
          {/* Right Side - Abscess */}
          <div className="absolute bottom-12 -right-12 bg-white border border-purple-300 rounded p-1 shadow-sm">
            <div className="text-[10px] font-medium text-gray-900">Diagnostic: Abscess: 4.23mm</div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-px bg-purple-400" />
          </div>
          
          {/* Bottom Right - Bone Density */}
          <div className="absolute -bottom-2 -right-8 bg-white border border-purple-300 rounded p-1 shadow-sm">
            <div className="text-[10px] font-medium text-gray-900">Bone Density: 90% (Healthy)</div>
          </div>
          
          {/* Bottom Left - Periodontal */}
          <div className="absolute -bottom-2 -left-16 bg-white border border-purple-300 rounded p-1 shadow-sm">
            <div className="text-[10px] font-medium text-gray-900">Periodontal Mucositis: Tooth #30</div>
            <div className="text-[10px] text-gray-600">Re-eval: Orthodontic Evaluation</div>
          </div>
        </div>
      </div>

      {/* Diagnostic Summary */}
      <div className="space-y-1 text-xs text-gray-600">
        <div className="p-2 bg-purple-50 border border-purple-200 rounded">
          <div className="font-medium text-gray-900">Diagnostic: Cavities Detected</div>
          <div className="text-gray-600">Severity: Moderate</div>
        </div>
        <div className="text-xs text-gray-600 space-y-0.5">
          <div>Diagnostic: Caries: 5.9mm</div>
          <div>Diagnostic: Abscess: 4.23mm</div>
          <div>Bone Density: 90% (Healthy)</div>
          <div>Periodontal Mucositis: Tooth #30</div>
        </div>
      </div>
    </div>
  );
}
