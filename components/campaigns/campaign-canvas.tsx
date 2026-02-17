'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CampaignStep, CampaignBuilderState, DragState } from './campaign-builder-types';
import { CampaignNode } from './campaign-node';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, Plus } from 'lucide-react';

interface CampaignCanvasProps {
  campaign: CampaignBuilderState;
  selectedStepId: string | null;
  onSelectStep: (stepId: string | null) => void;
  onUpdateStep: (step: CampaignStep) => void;
  onReorderSteps: (steps: CampaignStep[]) => void;
  onAddStep: (type: CampaignStep['type']) => void;
  allowedStepTypes?: readonly CampaignStep['type'][];
}

const tasksPerRow = 3;
const taskSpacingX = 250;
const taskSpacingY = 200;
const startX = 150;
const startY = 150;

export function CampaignCanvas({
  campaign,
  selectedStepId,
  onSelectStep,
  onUpdateStep,
  onReorderSteps,
  onAddStep,
  allowedStepTypes = ['EMAIL', 'SMS', 'DELAY'],
}: CampaignCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    stepId: null,
    startPosition: null,
  });
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const steps = campaign.steps || [];

  const calculateDimensions = useCallback(() => {
    const numRows = Math.ceil(Math.max(1, steps.length) / tasksPerRow);
    const requiredWidth = startX + tasksPerRow * taskSpacingX + 100;
    const requiredHeight = startY + numRows * taskSpacingY + 100;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({
        width: Math.max(rect.width || 1200, requiredWidth),
        height: Math.max(rect.height || 600, requiredHeight),
      });
    } else {
      setDimensions({ width: requiredWidth, height: requiredHeight });
    }
  }, [steps.length]);

  useEffect(() => {
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [calculateDimensions]);

  const getGridPosition = useCallback((displayOrder: number) => {
    const row = Math.floor((displayOrder - 1) / tasksPerRow);
    const colInRow = (displayOrder - 1) % tasksPerRow;
    const col = row % 2 === 0 ? colInRow : tasksPerRow - 1 - colInRow;
    return {
      x: startX + col * taskSpacingX,
      y: startY + row * taskSpacingY,
    };
  }, []);

  const getStepPosition = useCallback(
    (step: CampaignStep) => getGridPosition(step.displayOrder),
    [getGridPosition]
  );

  const getGridFromPosition = useCallback((x: number, y: number) => {
    const col = Math.round((x - startX) / taskSpacingX);
    const row = Math.round((y - startY) / taskSpacingY);
    const displayOrder = row * tasksPerRow + col + 1;
    return { row, col, displayOrder };
  }, []);

  const handleDragStart = useCallback(
    (stepId: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = steps.find((s) => s.id === stepId);
      if (!step) return;
      const pos = getGridPosition(step.displayOrder);
      setDragState({ isDragging: true, stepId, startPosition: pos });
      setDraggedPosition(pos);
    },
    [steps, getGridPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState.isDragging || !dragState.stepId || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setDraggedPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [dragState]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.stepId || !draggedPosition) {
      setDragState({ isDragging: false, stepId: null, startPosition: null });
      setDraggedPosition(null);
      return;
    }
    const { displayOrder: newDisplayOrder } = getGridFromPosition(draggedPosition.x, draggedPosition.y);
    const step = steps.find((s) => s.id === dragState.stepId);
    if (step) {
      const clampedOrder = Math.max(1, Math.min(steps.length, newDisplayOrder));
      const updatedTasks = steps.map((t) => {
        if (t.id === step.id) return { ...t, displayOrder: clampedOrder };
        if (t.displayOrder >= clampedOrder && t.displayOrder < step.displayOrder)
          return { ...t, displayOrder: t.displayOrder + 1 };
        if (t.displayOrder <= clampedOrder && t.displayOrder > step.displayOrder)
          return { ...t, displayOrder: t.displayOrder - 1 };
        return t;
      });
      const sorted = [...updatedTasks].sort((a, b) => a.displayOrder - b.displayOrder);
      const finalSteps = sorted.map((t, i) => ({ ...t, displayOrder: i + 1 }));
      onReorderSteps(finalSteps);
    }
    setDragState({ isDragging: false, stepId: null, startPosition: null });
    setDraggedPosition(null);
  }, [dragState, draggedPosition, steps, getGridFromPosition, onReorderSteps]);

  const getActualPosition = useCallback(
    (step: CampaignStep) => {
      if (dragState.isDragging && dragState.stepId === step.id && draggedPosition)
        return draggedPosition;
      return getGridPosition(step.displayOrder);
    },
    [dragState, draggedPosition, getGridPosition]
  );

  const renderConnections = () => {
    const sortedSteps = [...steps].sort((a, b) => a.displayOrder - b.displayOrder);
    const lines: React.ReactNode[] = [];
    for (let i = 0; i < sortedSteps.length - 1; i++) {
      const from = sortedSteps[i];
      const to = sortedSteps[i + 1];
      const fromPos = getActualPosition(from);
      const toPos = getActualPosition(to);
      const fromRow = Math.floor((from.displayOrder - 1) / tasksPerRow);
      const toRow = Math.floor((to.displayOrder - 1) / tasksPerRow);
      const isHovered = hoveredStepId === from.id || hoveredStepId === to.id;

      if (fromRow === toRow) {
        lines.push(
          <motion.line
            key={`line-${from.id}-${to.id}`}
            x1={fromPos.x}
            y1={fromPos.y}
            x2={toPos.x}
            y2={toPos.y}
            stroke={isHovered ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.3)'}
            strokeWidth={isHovered ? '3' : '2'}
            fill="none"
            className="transition-all duration-300"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        );
        const angle = Math.atan2(0, toPos.x - fromPos.x);
        const arrowSize = 8;
        const arrowX = toPos.x - 40 * Math.cos(angle);
        lines.push(
          <motion.polygon
            key={`arrow-${from.id}-${to.id}`}
            points={`${arrowX},${toPos.y} ${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)},${toPos.y - arrowSize * Math.sin(angle - Math.PI / 6)} ${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)},${toPos.y - arrowSize * Math.sin(angle + Math.PI / 6)}`}
            fill={isHovered ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.5)'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 + 0.3 }}
          />
        );
      } else {
        const isFromRowEven = fromRow % 2 === 0;
        const midX1 = isFromRowEven ? fromPos.x + 50 : fromPos.x - 50;
        const midY1 = fromPos.y;
        const midY2 = fromPos.y + 50;
        const midX2 = toRow % 2 === 0 ? toPos.x - 50 : toPos.x + 50;
        lines.push(
          <motion.path
            key={`line-${from.id}-${to.id}`}
            d={`M ${fromPos.x} ${fromPos.y} L ${midX1} ${midY1} L ${midX2} ${midY2} L ${toPos.x} ${midY2} L ${toPos.x} ${toPos.y}`}
            stroke={isHovered ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.3)'}
            strokeWidth={isHovered ? '3' : '2'}
            fill="none"
            className="transition-all duration-300"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 }}
          />
        );
        const arrowSize = 8;
        const arrowY = toPos.y - 40;
        lines.push(
          <motion.polygon
            key={`arrow-${from.id}-${to.id}`}
            points={`${toPos.x},${arrowY} ${toPos.x - arrowSize},${arrowY - arrowSize * Math.sqrt(3) / 2} ${toPos.x + arrowSize},${arrowY - arrowSize * Math.sqrt(3) / 2}`}
            fill={isHovered ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.5)'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 + 0.3 }}
          />
        );
      }
    }
    return lines;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full bg-white rounded-xl overflow-auto',
        'border-2 border-purple-200 shadow-lg'
      )}
      style={{ minHeight: '600px', height: '100%' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelectStep(null)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-white" />
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ minHeight: dimensions.height }}
      >
        {renderConnections()}
      </svg>
      <AnimatePresence>
        {steps.map((step) => {
          const isDragging = dragState.isDragging && dragState.stepId === step.id;
          const position =
            isDragging && draggedPosition ? draggedPosition : getStepPosition(step);
          return (
            <CampaignNode
              key={step.id}
              step={step}
              isSelected={selectedStepId === step.id}
              isDragging={isDragging}
              position={position}
              onSelect={() => onSelectStep(step.id)}
              onDragStart={(e) => handleDragStart(step.id, e)}
              onHover={() => setHoveredStepId(step.id)}
              onHoverEnd={() => setHoveredStepId(null)}
            />
          );
        })}
      </AnimatePresence>
      <motion.div
        className="absolute top-4 right-4 text-xs text-gray-600 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-3 h-3 text-purple-600" />
          <span className="font-semibold text-gray-900">Tips</span>
        </div>
        <p className="text-gray-600">Click step to edit</p>
        <p className="text-gray-600">Drag to reposition</p>
      </motion.div>
      <div className="absolute bottom-4 right-4 flex gap-3 text-xs z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">Steps</div>
          <div className="text-gray-900 font-bold">{steps.length}</div>
        </div>
        <div className="flex gap-1">
          {allowedStepTypes.map((type) => (
            <button
              key={type}
              onClick={() => onAddStep(type)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-purple-700 text-xs font-medium"
            >
              <Plus className="w-3 h-3" />
              {type}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
