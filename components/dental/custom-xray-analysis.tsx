/**
 * Custom X-Ray Analysis Component
 * Exact match to image - 3D visualization with diagnostic overlays
 */

'use client';

import { useState } from 'react';

interface XRayAnalysisProps {
  xrayData?: any;
}

export function CustomXRayAnalysis({ xrayData }: XRayAnalysisProps) {
  return (
    <div className="relative">
      {/* 3D Tooth Visualization */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center mb-3">
        {/* Simplified 3D tooth representation */}
        <div className="relative w-32 h-40">
          {/* Tooth shape */}
          <div className="absolute inset-0 bg-white/80 rounded-t-full border-2 border-gray-400 shadow-lg">
            {/* Crown */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-16 bg-white/90 rounded-t-full border border-gray-300"></div>
            {/* Root */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-24 bg-white/70 rounded-b-full border border-gray-300"></div>
            {/* Caries highlight */}
            <div className="absolute top-8 right-2 w-3 h-3 bg-red-500/60 rounded-full"></div>
            {/* Abscess highlight */}
            <div className="absolute bottom-8 right-2 w-2 h-2 bg-red-600/60 rounded-full"></div>
          </div>
        </div>

        {/* Diagnostic Overlays */}
        {/* Top Left */}
        <div className="absolute top-2 left-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm">
          <div className="text-[10px] font-medium text-gray-900">Caries Detected: Stage 2</div>
          <div className="text-[10px] text-gray-600">Severity: Moderate</div>
        </div>

        {/* Top Right */}
        <div className="absolute top-2 right-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm">
          <div className="text-[10px] font-medium text-gray-900">Diagnostic</div>
          <div className="text-[10px] text-gray-600">4.23 mm</div>
        </div>

        {/* Bottom Left */}
        <div className="absolute bottom-2 left-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm">
          <div className="text-[10px] font-medium text-gray-900">Periodontal Mucositis</div>
          <div className="text-[10px] text-gray-600">Tooth #3</div>
          <div className="text-[10px] text-gray-600">Referral: Endodontic Evaluation</div>
        </div>

        {/* Bottom Right */}
        <div className="absolute bottom-2 right-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm">
          <div className="text-[10px] font-medium text-gray-900">Bone Density</div>
          <div className="text-[10px] text-green-600 font-semibold">80% (healthy)</div>
        </div>

        {/* Connecting lines (simplified) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line x1="20%" y1="15%" x2="30%" y2="25%" stroke="#9333ea" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="70%" y1="15%" x2="60%" y2="25%" stroke="#9333ea" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="20%" y1="85%" x2="30%" y2="75%" stroke="#9333ea" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="70%" y1="85%" x2="60%" y2="75%" stroke="#9333ea" strokeWidth="1" strokeDasharray="2,2" />
        </svg>
      </div>

      {/* Text Details */}
      <div className="space-y-1 text-xs text-gray-600 mt-2">
        <div>Caries Detected: Stage 2: Severity: Moderate</div>
        <div>Periodontal Mucositis: Tooth #3: Referral: Endodontic Evaluation</div>
        <div>Diagnostic: ... 4.23 mm</div>
        <div>Bone Density: 80% (healthy)</div>
      </div>
    </div>
  );
}
