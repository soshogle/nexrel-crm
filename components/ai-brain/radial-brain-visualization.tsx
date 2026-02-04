'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity, Zap, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ComprehensiveBrainData, BrainDataPoint } from '@/lib/ai-brain-enhanced-service';

interface RadialBrainVisualizationProps {
  data: ComprehensiveBrainData;
  onDataPointClick?: (dataPoint: BrainDataPoint) => void;
}

export function RadialBrainVisualization({
  data,
  onDataPointClick,
}: RadialBrainVisualizationProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<BrainDataPoint | null>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<BrainDataPoint | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [pulseScale, setPulseScale] = useState(1);

  const size = 700;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 280;
  const middleRadius = 200;
  const innerRadius = 120;
  const coreRadius = 70;

  // Slow, subtle rotation animation (professional)
  useEffect(() => {
    const interval = setInterval(() => {
      setRotation(prev => (prev + 0.05) % 360);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Subtle pulse animation for core (much slower)
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseScale(prev => prev === 1 ? 1.02 : 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, [data]);

  // Combine all data points and distribute them evenly in a perfect circle
  const allDataPoints = [
    ...data.leftHemisphere.dataPoints,
    ...data.rightHemisphere.dataPoints,
  ];

  // Distribute evenly around the circle (360 degrees)
  const totalPoints = allDataPoints.length;
  const angleStep = (2 * Math.PI) / Math.max(totalPoints, 1);

  const positionedPoints = allDataPoints.map((point, index) => {
    const baseAngle = (index * angleStep - Math.PI / 2) + (rotation * Math.PI / 180);
    const radius = middleRadius; // Fixed radius - no pulsing movement
    const x = centerX + Math.cos(baseAngle) * radius;
    const y = centerY + Math.sin(baseAngle) * radius;
    
    const startAngle = baseAngle - angleStep / 2;
    const endAngle = baseAngle + angleStep / 2;
    
    return {
      ...point,
      x,
      y,
      angle: baseAngle,
      startAngle,
      endAngle,
      radius,
      pulse: 1, // No pulsing - static
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return { from: '#059669', to: '#10b981' }; // Muted Green
      case 'healthy':
        return { from: '#6b21a8', to: '#7c3aed' }; // Muted Purple
      case 'warning':
        return { from: '#d97706', to: '#f59e0b' }; // Muted Amber
      case 'critical':
        return { from: '#dc2626', to: '#ef4444' }; // Muted Red
      default:
        return { from: '#6b21a8', to: '#7c3aed' }; // Muted Purple default
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'USD' || unit === '$') {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
      return `$${value.toFixed(0)}`;
    }
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    }
    return `${Math.round(value)}${unit}`;
  };

  const handlePointClick = (point: BrainDataPoint) => {
    setSelectedDataPoint(point);
    onDataPointClick?.(point);
  };

  // Draw a perfect circular segment with minimal effects
  const drawSegment = (point: any, isHovered: boolean, isSelected: boolean) => {
    const { startAngle, endAngle } = point;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const dynamicRadius = outerRadius; // Static - no pulsing
    const dynamicInnerRadius = innerRadius; // Static - no pulsing

    const outerX1 = centerX + Math.cos(startAngle) * dynamicRadius;
    const outerY1 = centerY + Math.sin(startAngle) * dynamicRadius;
    const outerX2 = centerX + Math.cos(endAngle) * dynamicRadius;
    const outerY2 = centerY + Math.sin(endAngle) * dynamicRadius;

    const innerX1 = centerX + Math.cos(startAngle) * dynamicInnerRadius;
    const innerY1 = centerY + Math.sin(startAngle) * dynamicInnerRadius;
    const innerX2 = centerX + Math.cos(endAngle) * dynamicInnerRadius;
    const innerY2 = centerY + Math.sin(endAngle) * dynamicInnerRadius;

    const pathData = `
      M ${outerX1} ${outerY1}
      A ${dynamicRadius} ${dynamicRadius} 0 ${largeArc} 1 ${outerX2} ${outerY2}
      L ${innerX2} ${innerY2}
      A ${dynamicInnerRadius} ${dynamicInnerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
      Z
    `;

    const colors = getStatusColor(point.status);

    return (
      <motion.path
        key={point.id}
        d={pathData}
        fill={`url(#gradient-${point.status}-${point.id})`}
        opacity={isSelected ? 0.9 : isHovered ? 0.7 : 0.4}
        className="cursor-pointer transition-all"
        onClick={() => handlePointClick(point)}
        onMouseEnter={() => setHoveredDataPoint(point)}
        onMouseLeave={() => setHoveredDataPoint(null)}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: isSelected ? 0.85 : isHovered ? 0.65 : 0.45,
          scale: 1, // No scaling animation
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        whileHover={{ opacity: 0.75 }}
        whileTap={{ scale: 0.98 }}
        style={{
          filter: isHovered || isSelected ? `drop-shadow(0 0 8px ${colors.from}80)` : 'none',
        }}
      />
    );
  };

  // Calculate real-time stats
  const totalDataPoints = allDataPoints.length;
  const activeAlerts = data.core.criticalAlerts.length;
  const avgHealth = (data.leftHemisphere.overallHealth + data.rightHemisphere.overallHealth) / 2;
  const totalConnections = data.connections.length;

  return (
    <div className="relative w-full flex items-center justify-center p-8 bg-white">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Static background gradient - professional */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, rgba(255, 255, 255, 0) 70%)',
          }}
        />
        
        <svg 
          ref={svgRef} 
          width={size} 
          height={size} 
          className="w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            {/* Purple/white gradient definitions */}
            {allDataPoints.map((point) => {
              const colors = getStatusColor(point.status);
              return (
                <linearGradient key={`gradient-${point.status}-${point.id}`} id={`gradient-${point.status}-${point.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={colors.from} stopOpacity="0.7" />
                  <stop offset="50%" stopColor={colors.to} stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
                </linearGradient>
              );
            })}
            
            {/* Core gradient - muted purple to white */}
            <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6b21a8" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#7c3aed" stopOpacity="0.7" />
              <stop offset="70%" stopColor="#a78bfa" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
            </radialGradient>

            {/* Connection lines gradient - muted purple to white */}
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6b21a8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
            </linearGradient>

            {/* Subtle pulse gradient for core */}
            <radialGradient id="corePulseGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6b21a8" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Static connection lines - professional appearance */}
          {data.connections.slice(0, 30).map((conn, idx) => {
            const fromPoint = positionedPoints.find((p) => p.id === conn.from);
            const toPoint = positionedPoints.find((p) => p.id === conn.to);
            if (!fromPoint || !toPoint) return null;
            
            return (
              <motion.line
                key={`${conn.from}-${conn.to}`}
                x1={fromPoint.x}
                y1={fromPoint.y}
                x2={toPoint.x}
                y2={toPoint.y}
                stroke="url(#connectionGradient)"
                strokeWidth={Math.max(conn.strength / 50, 0.3)}
                opacity={0.2 + (conn.strength / 200) * 0.3}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: 1,
                  opacity: 0.2 + (conn.strength / 200) * 0.3,
                }}
                transition={{ 
                  duration: 2, 
                  delay: idx * 0.1,
                  ease: "easeOut"
                }}
              />
            );
          })}

          {/* Draw segments with dynamic effects */}
          {positionedPoints.map((point) => 
            drawSegment(
              point, 
              hoveredDataPoint?.id === point.id,
              selectedDataPoint?.id === point.id
            )
          )}

          {/* Central Core Circle - Subtle animation */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={coreRadius}
            fill="url(#coreGradient)"
            className="cursor-pointer"
            onClick={() => setSelectedDataPoint(null)}
            animate={{
              scale: pulseScale,
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{ scale: 1.05 }}
          />

          {/* Subtle outer ring - minimal animation */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={coreRadius + 8}
            fill="none"
            stroke="url(#corePulseGradient)"
            strokeWidth="1.5"
            opacity={0.3}
            animate={{
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Core Label */}
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            className="fill-gray-800 text-sm font-bold pointer-events-none"
            style={{ fontSize: '16px' }}
          >
            Business Core
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            className="fill-purple-600 text-xs font-semibold pointer-events-none"
            style={{ fontSize: '14px' }}
          >
            {Math.round(avgHealth)}% Health
          </text>

          {/* Data Point Labels - Show on hover/selected */}
          {positionedPoints.map((point) => {
            const isVisible = hoveredDataPoint?.id === point.id || selectedDataPoint?.id === point.id;
            if (!isVisible) return null;

            const colors = getStatusColor(point.status);

            return (
              <g key={`label-${point.id}`}>
                {/* Background circle for label */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="50"
                  fill="rgba(255, 255, 255, 0.95)"
                  stroke={colors.from}
                  strokeWidth="2"
                  className="pointer-events-none"
                  style={{ filter: `drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))` }}
                />
                {/* Label text */}
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-gray-900 text-xs font-semibold pointer-events-none"
                  style={{ fontSize: '11px' }}
                >
                  {point.label.length > 15 ? point.label.substring(0, 15) + '...' : point.label}
                </text>
                {/* Value */}
                <text
                  x={point.x}
                  y={point.y + 10}
                  textAnchor="middle"
                  className="fill-gray-800 text-sm font-bold pointer-events-none"
                  style={{ fontSize: '14px' }}
                >
                  {formatValue(point.value, point.unit)}
                </text>
                {/* Status indicator */}
                <circle
                  cx={point.x}
                  cy={point.y + 24}
                  r="4"
                  fill={colors.from}
                />
              </g>
            );
          })}
        </svg>

        {/* Real-time Stats Display - Top - Professional */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="absolute top-0 left-1/2 transform -translate-x-1/2 bg-white/98 backdrop-blur-sm border border-gray-300 rounded-lg px-6 py-2.5 shadow-md cursor-pointer"
          style={{ marginTop: '-15px' }}
        >
          <div className="flex items-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-600"></div>
              <span className="text-gray-600 font-medium">Active:</span>
              <span className="text-gray-900 font-bold">{totalDataPoints}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-gray-600" />
              <span className="text-gray-600 font-medium">Connections:</span>
              <span className="text-gray-900 font-bold">{totalConnections}</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-gray-600 font-medium">Alerts:</span>
              <span className="text-red-700 font-bold">{activeAlerts}</span>
            </div>
          </div>
        </motion.div>

        {/* Static labels around the circle - Professional, no floating */}
        <div className="absolute inset-0 pointer-events-none">
          {positionedPoints.slice(0, 12).map((point, index) => {
            const angle = point.angle;
            const labelRadius = outerRadius + 50;
            const labelX = centerX + Math.cos(angle) * labelRadius;
            const labelY = centerY + Math.sin(angle) * labelRadius;
            const isVisible = !hoveredDataPoint && !selectedDataPoint;

            const colors = getStatusColor(point.status);

            return (
              <motion.div
                key={`floating-${point.id}`}
                className="absolute"
                style={{
                  left: `${(labelX / size) * 100}%`,
                  top: `${(labelY / size) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: isVisible ? 0.7 : 0,
                }}
                transition={{ 
                  delay: index * 0.05,
                  duration: 0.5,
                }}
              >
                <div className="bg-white/98 backdrop-blur-sm rounded-md px-2.5 py-1.5 border border-gray-300 shadow-sm" style={{ borderColor: colors.from + '40' }}>
                  <div className="text-gray-700 text-xs font-semibold whitespace-nowrap">
                    {point.label.length > 12 ? point.label.substring(0, 12) + '...' : point.label}
                  </div>
                  <div className="text-xs font-bold text-gray-900">
                    {formatValue(point.value, point.unit)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Side Panels - Real-time stats with hover zoom */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col gap-4 p-4 pointer-events-none">
        {/* Current Operations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.05, x: 5 }}
          className="bg-white/98 backdrop-blur-sm border border-gray-300 rounded-lg p-4 min-w-[220px] pointer-events-auto shadow-md cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-gray-700" />
            <div className="text-gray-900 text-sm font-semibold">Current Operations</div>
          </div>
          <div className="text-gray-600 text-xs space-y-2">
            <div className="flex justify-between">
              <span>Health:</span>
              <span className="font-bold text-gray-900">{data.leftHemisphere.overallHealth}%</span>
            </div>
            <div className="flex justify-between">
              <span>Alerts:</span>
              <span className="font-bold text-red-700">{data.leftHemisphere.criticalAlerts}</span>
            </div>
            <div className="flex justify-between">
              <span>Opportunities:</span>
              <span className="font-bold text-green-700">{data.leftHemisphere.opportunities}</span>
            </div>
            <div className="flex justify-between">
              <span>Data Points:</span>
              <span className="font-bold text-gray-900">{data.leftHemisphere.dataPoints.length}</span>
            </div>
          </div>
        </motion.div>

        {/* Future Predictions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.05, x: 5 }}
          className="bg-white/98 backdrop-blur-sm border border-gray-300 rounded-lg p-4 min-w-[220px] pointer-events-auto shadow-md cursor-pointer"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-gray-700" />
            <div className="text-gray-900 text-sm font-semibold">Future Predictions</div>
          </div>
          <div className="text-gray-600 text-xs space-y-2">
            <div className="flex justify-between">
              <span>Health:</span>
              <span className="font-bold text-gray-900">{data.rightHemisphere.overallHealth}%</span>
            </div>
            <div className="flex justify-between">
              <span>Alerts:</span>
              <span className="font-bold text-red-700">{data.rightHemisphere.criticalAlerts}</span>
            </div>
            <div className="flex justify-between">
              <span>Opportunities:</span>
              <span className="font-bold text-green-700">{data.rightHemisphere.opportunities}</span>
            </div>
            <div className="flex justify-between">
              <span>Data Points:</span>
              <span className="font-bold text-gray-900">{data.rightHemisphere.dataPoints.length}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Selected Data Point Details - Right side */}
      <AnimatePresence>
        {selectedDataPoint && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute right-0 top-0 bg-white/95 backdrop-blur-sm border-2 border-purple-200 rounded-xl p-6 min-w-[300px] pointer-events-auto shadow-xl"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-gray-900 font-bold text-lg">{selectedDataPoint.label}</h4>
              <button
                onClick={() => setSelectedDataPoint(null)}
                className="text-gray-500 hover:text-gray-900 transition-colors text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            <div className="text-3xl font-bold mb-4 text-purple-600">
              {formatValue(selectedDataPoint.value, selectedDataPoint.unit)}
            </div>

            <div className="space-y-2 text-sm border-t border-gray-200 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                <Badge className="bg-purple-100 text-purple-700 border-purple-300">
                  {selectedDataPoint.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Category</span>
                <span className="text-gray-900 font-medium">{selectedDataPoint.category}</span>
              </div>
              {selectedDataPoint.confidence && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Confidence</span>
                  <span className="text-gray-900 font-medium">{selectedDataPoint.confidence.toFixed(0)}%</span>
                </div>
              )}
              {selectedDataPoint.change !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Change</span>
                  <span className={selectedDataPoint.change > 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {selectedDataPoint.change > 0 ? '+' : ''}
                    {selectedDataPoint.change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {onDataPointClick && (
              <button
                onClick={() => {
                  onDataPointClick(selectedDataPoint);
                  setSelectedDataPoint(null);
                }}
                className="mt-4 w-full bg-gray-900 text-white py-2 rounded-md font-medium hover:bg-gray-800 transition-all shadow-sm"
              >
                View Details →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical Alerts - Bottom - Professional */}
      {data.core.criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-white/98 backdrop-blur-sm border border-red-300 rounded-lg px-6 py-2.5 max-w-md pointer-events-auto shadow-md cursor-pointer"
          style={{ marginBottom: '-15px' }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-red-700" />
            <div className="text-red-700 text-xs font-semibold">Critical Alerts</div>
          </div>
          <div className="space-y-0.5">
            {data.core.criticalAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-gray-700 text-xs">
                • {alert.title}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
