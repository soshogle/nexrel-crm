'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
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
  const [isAnimating, setIsAnimating] = useState(true);

  const centerX = 400;
  const centerY = 400;
  const radius = 300;
  const innerRadius = 80;

  useEffect(() => {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 2000);
    return () => clearTimeout(timer);
  }, [data]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return '#10b981'; // green
      case 'healthy':
        return '#3b82f6'; // blue
      case 'warning':
        return '#f59e0b'; // amber
      case 'critical':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  // Calculate positions for left hemisphere (Current Operations) - bottom half
  const leftDataPoints = data.leftHemisphere.dataPoints;
  const leftAngleStep = Math.PI / Math.max(leftDataPoints.length, 1);
  const leftSegments = leftDataPoints.map((point, index) => {
    // Start from -90 degrees (top), go clockwise for left hemisphere (bottom half)
    const angle = Math.PI / 2 + (index + 0.5) * leftAngleStep;
    const midRadius = innerRadius + (radius - innerRadius) * 0.5;
    const x = centerX + Math.cos(angle) * midRadius;
    const y = centerY + Math.sin(angle) * midRadius;
    return { ...point, x, y, angle, startAngle: angle - leftAngleStep / 2, endAngle: angle + leftAngleStep / 2 };
  });

  // Calculate positions for right hemisphere (Future Predictions) - top half
  const rightDataPoints = data.rightHemisphere.dataPoints;
  const rightAngleStep = Math.PI / Math.max(rightDataPoints.length, 1);
  const rightSegments = rightDataPoints.map((point, index) => {
    // Start from -90 degrees (top), go counter-clockwise for right hemisphere (top half)
    const angle = -Math.PI / 2 + (index + 0.5) * rightAngleStep;
    const midRadius = innerRadius + (radius - innerRadius) * 0.5;
    const x = centerX + Math.cos(angle) * midRadius;
    const y = centerY + Math.sin(angle) * midRadius;
    return { ...point, x, y, angle, startAngle: angle - rightAngleStep / 2, endAngle: angle + rightAngleStep / 2 };
  });

  // Draw connections
  const drawConnection = (from: any, to: any, strength: number) => {
    if (!from || !to) return null;
    const opacity = strength / 100;
    return (
      <line
        key={`${from.id}-${to.id}`}
        x1={from.x}
        y1={from.y}
        x2={to.x}
        y2={to.y}
        stroke="url(#connectionGradient)"
        strokeWidth={strength / 20}
        opacity={opacity * 0.5}
        className="transition-opacity"
      />
    );
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'USD') {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `${value.toFixed(unit === '%' ? 1 : 0)}${unit}`;
  };

  return (
    <div className="relative w-full h-full min-h-[800px] bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 rounded-xl overflow-hidden">
      {/* Background animated circles */}
      <div className="absolute inset-0 opacity-20">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute border border-purple-500/30 rounded-full"
            style={{
              left: '50%',
              top: '50%',
              width: `${(i + 1) * 200}px`,
              height: `${(i + 1) * 200}px`,
              marginLeft: `-${(i + 1) * 100}px`,
              marginTop: `-${(i + 1) * 100}px`,
            }}
            animate={{
              scale: isAnimating ? [1, 1.1, 1] : 1,
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      <svg ref={svgRef} width="800" height="800" className="w-full h-full">
        <defs>
          <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id="coreGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0.4" />
          </radialGradient>
          <linearGradient id="leftHemisphereGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="rightHemisphereGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.3" />
          </linearGradient>
        </defs>

        {/* Draw connections */}
        {data.connections.map((conn) => {
          const fromPoint = [...leftSegments, ...rightSegments].find((p) => p.id === conn.from);
          const toPoint = [...leftSegments, ...rightSegments].find((p) => p.id === conn.to);
          return drawConnection(fromPoint, toPoint, conn.strength);
        })}

        {/* Left Hemisphere Background */}
        <path
          d={`M ${centerX} ${centerY} 
              A ${radius} ${radius} 0 0 1 ${centerX} ${centerY - radius}
              A ${radius} ${radius} 0 0 1 ${centerX} ${centerY}
              Z`}
          fill="url(#leftHemisphereGradient)"
          opacity="0.1"
          className="transition-opacity"
        />

        {/* Right Hemisphere Background */}
        <path
          d={`M ${centerX} ${centerY} 
              A ${radius} ${radius} 0 0 0 ${centerX} ${centerY - radius}
              A ${radius} ${radius} 0 0 0 ${centerX} ${centerY}
              Z`}
          fill="url(#rightHemisphereGradient)"
          opacity="0.1"
          className="transition-opacity"
        />

        {/* Left Hemisphere Segments (Bottom Half) */}
        {leftSegments.map((segment) => {
          const { startAngle, endAngle } = segment;
          const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

          const x1 = centerX + Math.cos(startAngle) * innerRadius;
          const y1 = centerY + Math.sin(startAngle) * innerRadius;
          const x2 = centerX + Math.cos(endAngle) * innerRadius;
          const y2 = centerY + Math.sin(endAngle) * innerRadius;
          const x3 = centerX + Math.cos(endAngle) * radius;
          const y3 = centerY + Math.sin(endAngle) * radius;
          const x4 = centerX + Math.cos(startAngle) * radius;
          const y4 = centerY + Math.sin(startAngle) * radius;

          return (
            <g key={segment.id}>
              <motion.path
                d={`M ${x1} ${y1} 
                    L ${x4} ${y4}
                    A ${radius} ${radius} 0 ${largeArc} 1 ${x3} ${y3}
                    L ${x2} ${y2}
                    A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1} ${y1}
                    Z`}
                fill={getStatusColor(segment.status)}
                opacity={selectedDataPoint?.id === segment.id ? 0.6 : 0.25}
                className="cursor-pointer transition-all hover:opacity-0.5"
                onClick={() => {
                  setSelectedDataPoint(segment);
                  onDataPointClick?.(segment);
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: selectedDataPoint?.id === segment.id ? 0.6 : 0.25 }}
                transition={{ duration: 0.3 }}
              />
            </g>
          );
        })}

        {/* Right Hemisphere Segments (Top Half) */}
        {rightSegments.map((segment) => {
          const { startAngle, endAngle } = segment;
          const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

          const x1 = centerX + Math.cos(startAngle) * innerRadius;
          const y1 = centerY + Math.sin(startAngle) * innerRadius;
          const x2 = centerX + Math.cos(endAngle) * innerRadius;
          const y2 = centerY + Math.sin(endAngle) * innerRadius;
          const x3 = centerX + Math.cos(endAngle) * radius;
          const y3 = centerY + Math.sin(endAngle) * radius;
          const x4 = centerX + Math.cos(startAngle) * radius;
          const y4 = centerY + Math.sin(startAngle) * radius;

          return (
            <g key={segment.id}>
              <motion.path
                d={`M ${x1} ${y1} 
                    L ${x4} ${y4}
                    A ${radius} ${radius} 0 ${largeArc} 0 ${x3} ${y3}
                    L ${x2} ${y2}
                    A ${innerRadius} ${innerRadius} 0 ${largeArc} 1 ${x1} ${y1}
                    Z`}
                fill={getStatusColor(segment.status)}
                opacity={selectedDataPoint?.id === segment.id ? 0.6 : 0.25}
                className="cursor-pointer transition-all hover:opacity-0.5"
                onClick={() => {
                  setSelectedDataPoint(segment);
                  onDataPointClick?.(segment);
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: selectedDataPoint?.id === segment.id ? 0.6 : 0.25 }}
                transition={{ duration: 0.3 }}
              />
            </g>
          );
        })}

        {/* Central Core Circle */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={innerRadius}
          fill="url(#coreGradient)"
          className="cursor-pointer"
          animate={{
            scale: isAnimating ? [1, 1.05, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />

        {/* Core Label */}
        <text
          x={centerX}
          y={centerY - 10}
          textAnchor="middle"
          className="fill-white text-sm font-bold"
        >
          Business Core
        </text>
        <text
          x={centerX}
          y={centerY + 10}
          textAnchor="middle"
          className="fill-white text-xs"
        >
          {data.core.overallHealth}% Health
        </text>

        {/* Data Point Labels */}
        {[...leftSegments, ...rightSegments].map((segment) => (
          <g key={`label-${segment.id}`}>
            <text
              x={segment.x}
              y={segment.y - 15}
              textAnchor="middle"
              className="fill-white text-xs font-semibold pointer-events-none"
            >
              {segment.label}
            </text>
            <text
              x={segment.x}
              y={segment.y + 5}
              textAnchor="middle"
              className="fill-white text-lg font-bold pointer-events-none"
            >
              {formatValue(segment.value, segment.unit)}
            </text>
            {segment.trend && (
              <foreignObject
                x={segment.x - 10}
                y={segment.y + 15}
                width="20"
                height="20"
                className="pointer-events-none"
              >
                <div className="flex items-center justify-center">
                  {getTrendIcon(segment.trend)}
                </div>
              </foreignObject>
            )}
            {segment.change !== undefined && (
              <text
                x={segment.x}
                y={segment.y + 35}
                textAnchor="middle"
                className={`text-xs pointer-events-none ${
                  segment.change > 0 ? 'fill-green-400' : segment.change < 0 ? 'fill-red-400' : 'fill-gray-400'
                }`}
              >
                {segment.change > 0 ? '+' : ''}
                {segment.change.toFixed(1)}%
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Hemisphere Labels */}
      <div className="absolute top-4 left-4 bg-purple-500/20 backdrop-blur-sm border border-purple-500/30 rounded-lg px-4 py-2">
        <div className="text-purple-300 text-sm font-semibold">Current Operations</div>
        <div className="text-white text-xs">
          Health: {data.leftHemisphere.overallHealth}% | Alerts: {data.leftHemisphere.criticalAlerts} | Opportunities: {data.leftHemisphere.opportunities}
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-pink-500/20 backdrop-blur-sm border border-pink-500/30 rounded-lg px-4 py-2">
        <div className="text-pink-300 text-sm font-semibold">Future Predictions</div>
        <div className="text-white text-xs">
          Health: {data.rightHemisphere.overallHealth}% | Alerts: {data.rightHemisphere.criticalAlerts} | Opportunities: {data.rightHemisphere.opportunities}
        </div>
      </div>

      {/* Critical Alerts */}
      {data.core.criticalAlerts.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-lg px-4 py-2 max-w-md">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <div className="text-red-300 text-sm font-semibold">Critical Alerts</div>
          </div>
          <div className="space-y-1">
            {data.core.criticalAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="text-white text-xs">
                • {alert.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Data Point Details */}
      {selectedDataPoint && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 bg-gray-800/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 max-w-xs"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold">{selectedDataPoint.label}</h4>
            <Badge
              className={`${
                selectedDataPoint.status === 'excellent'
                  ? 'bg-green-500/20 text-green-400'
                  : selectedDataPoint.status === 'healthy'
                  ? 'bg-blue-500/20 text-blue-400'
                  : selectedDataPoint.status === 'warning'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
              }`}
            >
              {selectedDataPoint.status}
            </Badge>
          </div>
          <div className="text-2xl font-bold text-white mb-2">
            {formatValue(selectedDataPoint.value, selectedDataPoint.unit)}
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Category: {selectedDataPoint.category} → {selectedDataPoint.subcategory}</div>
            {selectedDataPoint.confidence && (
              <div>Confidence: {selectedDataPoint.confidence.toFixed(0)}%</div>
            )}
            {selectedDataPoint.change !== undefined && (
              <div className={selectedDataPoint.change > 0 ? 'text-green-400' : 'text-red-400'}>
                Change: {selectedDataPoint.change > 0 ? '+' : ''}
                {selectedDataPoint.change.toFixed(1)}%
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
