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
  // Show preview even if no X-ray data - use default mock visualization
  const hasData = !!xrayData;
  
  return (
    <div className="relative">
      {/* Realistic X-Ray Visualization - Grayscale with realistic tooth structure */}
      <div className="relative w-full h-48 bg-black rounded-lg flex items-center justify-center mb-3 overflow-hidden">
        {/* X-ray background - dark with subtle noise texture */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black opacity-90">
          {/* Noise texture simulation */}
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        {/* Realistic X-ray tooth structure - grayscale */}
        <svg className="relative w-40 h-44" viewBox="0 0 100 120" preserveAspectRatio="xMidYMid meet">
          <defs>
            {/* Gradient for enamel (lighter) */}
            <linearGradient id="enamel-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e5e5" stopOpacity="0.95"/>
              <stop offset="50%" stopColor="#d4d4d4" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#c4c4c4" stopOpacity="0.85"/>
            </linearGradient>
            {/* Gradient for dentin (darker) */}
            <linearGradient id="dentin-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a3a3a3" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#8a8a8a" stopOpacity="0.75"/>
              <stop offset="100%" stopColor="#737373" stopOpacity="0.7"/>
            </linearGradient>
            {/* Gradient for pulp chamber (darkest) */}
            <linearGradient id="pulp-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#525252" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#404040" stopOpacity="0.5"/>
            </linearGradient>
            {/* Bone structure */}
            <linearGradient id="bone-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#6b6b6b" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#4a4a4a" stopOpacity="0.3"/>
            </linearGradient>
          </defs>

          {/* Bone structure around tooth */}
          <rect x="0" y="0" width="100" height="120" fill="url(#bone-gradient)" opacity="0.3"/>
          
          {/* Root structure - darker, more radiopaque */}
          <ellipse cx="50" cy="90" rx="8" ry="20" fill="url(#dentin-gradient)"/>
          <ellipse cx="50" cy="95" rx="6" ry="15" fill="url(#dentin-gradient)" opacity="0.8"/>
          
          {/* Root canals - darker lines */}
          <line x1="48" y1="70" x2="48" y2="100" stroke="#404040" strokeWidth="1.5" opacity="0.6"/>
          <line x1="52" y1="70" x2="52" y2="100" stroke="#404040" strokeWidth="1.5" opacity="0.6"/>
          
          {/* Crown structure - enamel layer */}
          <ellipse cx="50" cy="35" rx="18" ry="25" fill="url(#enamel-gradient)"/>
          
          {/* Dentin core */}
          <ellipse cx="50" cy="40" rx="14" ry="20" fill="url(#dentin-gradient)"/>
          
          {/* Pulp chamber - dark central area */}
          <ellipse cx="50" cy="45" rx="6" ry="10" fill="url(#pulp-gradient)"/>
          
          {/* Caries detection - darker area (radiolucent) */}
          <ellipse cx="62" cy="38" rx="4" ry="5" fill="#2a2a2a" opacity="0.7">
            <animate attributeName="opacity" values="0.5;0.8;0.5" dur="2s" repeatCount="indefinite"/>
          </ellipse>
          
          {/* Periapical lesion - dark area at root tip */}
          <ellipse cx="50" cy="108" rx="6" ry="8" fill="#1a1a1a" opacity="0.6">
            <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2.5s" repeatCount="indefinite"/>
          </ellipse>
          
          {/* Anatomical details - enamel-dentin junction */}
          <ellipse cx="50" cy="50" rx="12" ry="18" fill="none" stroke="#6b6b6b" strokeWidth="0.5" opacity="0.4"/>
          
          {/* Cusps and grooves - subtle variations */}
          <ellipse cx="42" cy="30" rx="3" ry="4" fill="#d4d4d4" opacity="0.6"/>
          <ellipse cx="58" cy="30" rx="3" ry="4" fill="#d4d4d4" opacity="0.6"/>
          <ellipse cx="50" cy="28" rx="2.5" ry="3" fill="#e5e5e5" opacity="0.7"/>
        </svg>

        {/* Diagnostic Overlays - positioned around X-ray */}
        {/* Top Left */}
        <div className="absolute top-2 left-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm z-10">
          <div className="text-[10px] font-medium text-gray-900">Caries Detected: Distal-Occlusal</div>
          <div className="text-[10px] text-gray-600">Severity: Moderate (1.5mm)</div>
        </div>

        {/* Top Right */}
        <div className="absolute top-2 right-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm z-10">
          <div className="text-[10px] font-medium text-gray-900">Diagnostic</div>
          <div className="text-[10px] text-gray-600">D: 1.5mm, M: 4.23mm</div>
        </div>

        {/* Bottom Left */}
        <div className="absolute bottom-2 left-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm z-10">
          <div className="text-[10px] font-medium text-gray-900">Periapical Lesions</div>
          <div className="text-[10px] text-gray-600">Tooth #30</div>
          <div className="text-[10px] text-red-600">Requires Endodontic Evaluation</div>
        </div>

        {/* Bottom Right */}
        <div className="absolute bottom-2 right-2 bg-white/95 border border-purple-300 rounded px-2 py-1 shadow-sm z-10">
          <div className="text-[10px] font-medium text-gray-900">Bone Density</div>
          <div className="text-[10px] text-green-600 font-semibold">90% (Healthy)</div>
        </div>

        {/* Connecting lines pointing to specific areas */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {/* Line to caries */}
          <line x1="20%" y1="15%" x2="65%" y2="32%" stroke="#9333ea" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/>
          {/* Line to periapical lesion */}
          <line x1="20%" y1="85%" x2="50%" y2="90%" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/>
          {/* Line to diagnostic measurement */}
          <line x1="75%" y1="15%" x2="65%" y2="32%" stroke="#9333ea" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/>
          {/* Line to bone density */}
          <line x1="75%" y1="85%" x2="50%" y2="75%" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7"/>
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
