'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity, Zap, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

  const size = 600;
  const centerX = size / 2;
  const centerY = size / 2;
  const outerRadius = 250;
  const middleRadius = 180;
  const innerRadius = 100;
  const coreRadius = 60;

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
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const radius = middleRadius;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    // Calculate segment boundaries for perfect circle
    const startAngle = angle - angleStep / 2;
    const endAngle = angle + angleStep / 2;
    
    return {
      ...point,
      x,
      y,
      angle,
      startAngle,
      endAngle,
      radius,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'from-emerald-400 to-green-500';
      case 'healthy':
        return 'from-purple-400 to-violet-500';
      case 'warning':
        return 'from-amber-400 to-yellow-500';
      case 'critical':
        return 'from-red-400 to-rose-500';
      default:
        return 'from-gray-400 to-gray-500';
    }
  };

  const getStatusGlow = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'shadow-emerald-500/50';
      case 'healthy':
        return 'shadow-purple-500/50';
      case 'warning':
        return 'shadow-amber-500/50';
      case 'critical':
        return 'shadow-red-500/50';
      default:
        return 'shadow-gray-500/50';
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

  // Draw a perfect circular segment
  const drawSegment = (point: any, isHovered: boolean, isSelected: boolean) => {
    const { startAngle, endAngle } = point;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

    // Outer arc points
    const outerX1 = centerX + Math.cos(startAngle) * outerRadius;
    const outerY1 = centerY + Math.sin(startAngle) * outerRadius;
    const outerX2 = centerX + Math.cos(endAngle) * outerRadius;
    const outerY2 = centerY + Math.sin(endAngle) * outerRadius;

    // Inner arc points
    const innerX1 = centerX + Math.cos(startAngle) * innerRadius;
    const innerY1 = centerY + Math.sin(startAngle) * innerRadius;
    const innerX2 = centerX + Math.cos(endAngle) * innerRadius;
    const innerY2 = centerY + Math.sin(endAngle) * innerRadius;

    const pathData = `
      M ${outerX1} ${outerY1}
      A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerX2} ${outerY2}
      L ${innerX2} ${innerY2}
      A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerX1} ${innerY1}
      Z
    `;

    return (
      <motion.path
        key={point.id}
        d={pathData}
        fill={`url(#gradient-${point.status})`}
        opacity={isSelected ? 0.8 : isHovered ? 0.6 : 0.3}
        className={`cursor-pointer transition-all ${isHovered || isSelected ? `drop-shadow-lg ${getStatusGlow(point.status)}` : ''}`}
        onClick={() => handlePointClick(point)}
        onMouseEnter={() => setHoveredDataPoint(point)}
        onMouseLeave={() => setHoveredDataPoint(null)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: isSelected ? 0.8 : isHovered ? 0.6 : 0.3,
          scale: isHovered || isSelected ? 1.05 : 1,
        }}
        transition={{ duration: 0.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      />
    );
  };

  return (
    <div className="relative w-full flex items-center justify-center p-8">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background gradient circles */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 blur-3xl" />
        
        <svg 
          ref={svgRef} 
          width={size} 
          height={size} 
          className="w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
        >
          <defs>
            {/* Gradient definitions matching app colors */}
            <linearGradient id="gradient-excellent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="gradient-healthy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="gradient-critical" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.4" />
            </linearGradient>
            
            {/* Core gradient */}
            <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.5" />
            </radialGradient>

            {/* Connection lines gradient */}
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
            </linearGradient>
          </defs>

          {/* Draw connections */}
          {data.connections.slice(0, 20).map((conn) => {
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
                strokeWidth={Math.max(conn.strength / 30, 1)}
                opacity={conn.strength / 200}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: Math.random() * 0.5 }}
              />
            );
          })}

          {/* Draw segments in perfect circle */}
          {positionedPoints.map((point) => 
            drawSegment(
              point, 
              hoveredDataPoint?.id === point.id,
              selectedDataPoint?.id === point.id
            )
          )}

          {/* Central Core Circle - Perfect Circle */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={coreRadius}
            fill="url(#coreGradient)"
            className="cursor-pointer"
            onClick={() => setSelectedDataPoint(null)}
            animate={{
              scale: isAnimating ? [1, 1.05, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            whileHover={{ scale: 1.1 }}
          />

          {/* Core Label */}
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            className="fill-white text-sm font-bold pointer-events-none"
            style={{ fontSize: '14px' }}
          >
            Business Core
          </text>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            className="fill-white/80 text-xs pointer-events-none"
            style={{ fontSize: '12px' }}
          >
            {data.core.overallHealth}% Health
          </text>

          {/* Data Point Labels - Only show on hover/selected to reduce crowding */}
          {positionedPoints.map((point) => {
            const isVisible = hoveredDataPoint?.id === point.id || selectedDataPoint?.id === point.id;
            if (!isVisible) return null;

            return (
              <g key={`label-${point.id}`}>
                {/* Background circle for label */}
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="45"
                  fill="rgba(0, 0, 0, 0.7)"
                  className="pointer-events-none"
                />
                {/* Label text */}
                <text
                  x={point.x}
                  y={point.y - 12}
                  textAnchor="middle"
                  className="fill-white text-xs font-semibold pointer-events-none"
                  style={{ fontSize: '11px' }}
                >
                  {point.label.length > 15 ? point.label.substring(0, 15) + '...' : point.label}
                </text>
                {/* Value */}
                <text
                  x={point.x}
                  y={point.y + 8}
                  textAnchor="middle"
                  className="fill-white text-sm font-bold pointer-events-none"
                  style={{ fontSize: '14px' }}
                >
                  {formatValue(point.value, point.unit)}
                </text>
                {/* Status indicator */}
                <circle
                  cx={point.x}
                  cy={point.y + 22}
                  r="3"
                  className={`fill-current ${getStatusColor(point.status).split(' ')[0].replace('from-', 'text-')}`}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating labels around the circle - less crowded, only key metrics */}
        <div className="absolute inset-0 pointer-events-none">
          {positionedPoints.slice(0, 8).map((point, index) => {
            const angle = point.angle;
            const labelRadius = outerRadius + 40;
            const labelX = centerX + Math.cos(angle) * labelRadius;
            const labelY = centerY + Math.sin(angle) * labelRadius;
            const isVisible = !hoveredDataPoint && !selectedDataPoint;

            return (
              <motion.div
                key={`floating-${point.id}`}
                className="absolute"
                style={{
                  left: `${(labelX / size) * 100}%`,
                  top: `${(labelY / size) * 100}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: isVisible ? 0.7 : 0,
                  scale: isVisible ? 1 : 0,
                }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1 border border-purple-500/30">
                  <div className="text-white text-xs font-medium whitespace-nowrap">
                    {point.label.length > 12 ? point.label.substring(0, 12) + '...' : point.label}
                  </div>
                  <div className={`text-xs font-bold ${getStatusColor(point.status).split(' ')[0].replace('from-', 'text-')}`}>
                    {formatValue(point.value, point.unit)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Side Panels - Less crowded info display */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col gap-4 p-4 pointer-events-none">
        {/* Current Operations */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-purple-500/20 to-violet-500/20 backdrop-blur-md border border-purple-500/30 rounded-xl p-4 min-w-[200px] pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-purple-300" />
            <div className="text-purple-200 text-sm font-semibold">Current Operations</div>
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Health: <span className="font-bold">{data.leftHemisphere.overallHealth}%</span></div>
            <div>Alerts: <span className="font-bold text-red-400">{data.leftHemisphere.criticalAlerts}</span></div>
            <div>Opportunities: <span className="font-bold text-green-400">{data.leftHemisphere.opportunities}</span></div>
          </div>
        </motion.div>

        {/* Future Predictions */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-md border border-pink-500/30 rounded-xl p-4 min-w-[200px] pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-pink-300" />
            <div className="text-pink-200 text-sm font-semibold">Future Predictions</div>
          </div>
          <div className="text-white text-xs space-y-1">
            <div>Health: <span className="font-bold">{data.rightHemisphere.overallHealth}%</span></div>
            <div>Alerts: <span className="font-bold text-red-400">{data.rightHemisphere.criticalAlerts}</span></div>
            <div>Opportunities: <span className="font-bold text-green-400">{data.rightHemisphere.opportunities}</span></div>
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
            className="absolute right-0 top-0 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md border border-purple-500/30 rounded-xl p-6 min-w-[280px] pointer-events-auto shadow-2xl"
          >
            <div className="flex items-start justify-between mb-4">
              <h4 className="text-white font-bold text-lg">{selectedDataPoint.label}</h4>
              <button
                onClick={() => setSelectedDataPoint(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className={`text-3xl font-bold mb-4 bg-gradient-to-r ${getStatusColor(selectedDataPoint.status)} bg-clip-text text-transparent`}>
              {formatValue(selectedDataPoint.value, selectedDataPoint.unit)}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Status</span>
                <Badge className={`${getStatusColor(selectedDataPoint.status)} text-white border-0`}>
                  {selectedDataPoint.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Category</span>
                <span className="text-white">{selectedDataPoint.category}</span>
              </div>
              {selectedDataPoint.confidence && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Confidence</span>
                  <span className="text-white">{selectedDataPoint.confidence.toFixed(0)}%</span>
                </div>
              )}
              {selectedDataPoint.change !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Change</span>
                  <span className={selectedDataPoint.change > 0 ? 'text-green-400' : 'text-red-400'}>
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
                className="mt-4 w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                View Details →
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Critical Alerts - Bottom */}
      {data.core.criticalAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-xl px-6 py-3 max-w-md pointer-events-auto"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="text-red-300 text-sm font-semibold">Critical Alerts</div>
          </div>
          <div className="space-y-1">
            {data.core.criticalAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-white text-xs">
                • {alert.title}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
