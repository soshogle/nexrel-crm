/**
 * Generic Multi-Industry Workflow Canvas
 * Serpentine layout workflow builder for all industries
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate, DragState } from './types';
import { TaskNode } from './task-node';
import { getIndustryConfig, getTaskTypeIcon, getTaskTypeColor } from '@/lib/workflows/industry-configs';
import { Industry } from '@prisma/client';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Info } from 'lucide-react';

interface WorkflowCanvasProps {
  workflow: WorkflowTemplate;
  industry: Industry;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onUpdateTask: (task: WorkflowTask) => void;
  onReorderTasks: (tasks: WorkflowTask[]) => void;
  onAddTask?: () => void;
}

export function WorkflowCanvas({
  workflow,
  industry,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onReorderTasks,
  onAddTask,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    startPosition: null,
  });
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  
  const industryConfig = getIndustryConfig(industry);
  
  // Ensure tasks array exists
  const tasks = workflow.tasks || [];
  
  // Grid layout configuration
  const tasksPerRow = 3;
  const taskSpacingX = 250;
  const taskSpacingY = 200;
  const startX = 150;
  const startY = 150;
  
  // Calculate required dimensions based on number of tasks
  const calculateDimensions = useCallback(() => {
    const numRows = Math.ceil(tasks.length / tasksPerRow);
    const requiredWidth = startX + tasksPerRow * taskSpacingX + 100;
    const requiredHeight = startY + numRows * taskSpacingY + 100;
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ 
        width: Math.max(rect.width || 1200, requiredWidth), 
        height: Math.max(rect.height || 600, requiredHeight) 
      });
    } else {
      setDimensions({ width: requiredWidth, height: requiredHeight });
    }
  }, [tasks.length]);
  
  // Update dimensions on resize and when tasks change
  useEffect(() => {
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [calculateDimensions]);
  
  // Calculate grid position from display order (serpentine flow)
  const getGridPosition = useCallback((displayOrder: number) => {
    const row = Math.floor((displayOrder - 1) / tasksPerRow);
    const colInRow = (displayOrder - 1) % tasksPerRow;
    
    // Serpentine: odd rows go left-to-right, even rows go right-to-left
    const col = row % 2 === 0 ? colInRow : tasksPerRow - 1 - colInRow;
    
    return {
      x: startX + col * taskSpacingX,
      y: startY + row * taskSpacingY,
    };
  }, []);
  
  // Calculate position from task (uses displayOrder for grid positioning)
  const getTaskPosition = useCallback((task: WorkflowTask) => {
    return getGridPosition(task.displayOrder);
  }, [getGridPosition]);
  
  // Calculate grid position from screen coordinates
  const getGridFromPosition = useCallback((x: number, y: number) => {
    const col = Math.round((x - startX) / taskSpacingX);
    const row = Math.round((y - startY) / taskSpacingY);
    const displayOrder = row * tasksPerRow + col + 1;
    return { row, col, displayOrder };
  }, []);
  
  // Handle drag start
  const handleDragStart = useCallback((taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const pos = getGridPosition(task.displayOrder);
    setDragState({
      isDragging: true,
      taskId,
      startPosition: pos,
    });
    setDraggedPosition(pos);
  }, [tasks, getGridPosition]);
  
  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.taskId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDraggedPosition({ x, y });
  }, [dragState]);
  
  // Minimum drag distance (px) before reorder - prevents accidental swap on click
  const MIN_DRAG_DISTANCE = 15;

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.taskId || !draggedPosition || !dragState.startPosition) {
      setDragState({ isDragging: false, taskId: null, startPosition: null });
      setDraggedPosition(null);
      return;
    }
    
    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState({ isDragging: false, taskId: null, startPosition: null });
      setDraggedPosition(null);
      return;
    }

    // Only reorder if user actually dragged (moved mouse) - prevents accidental swap on click
    const dragDistance = Math.sqrt(
      Math.pow(draggedPosition.x - dragState.startPosition.x, 2) +
      Math.pow(draggedPosition.y - dragState.startPosition.y, 2)
    );
    if (dragDistance < MIN_DRAG_DISTANCE) {
      setDragState({ isDragging: false, taskId: null, startPosition: null });
      setDraggedPosition(null);
      return;
    }
    
    const { displayOrder: newDisplayOrder } = getGridFromPosition(draggedPosition.x, draggedPosition.y);
    
    // Find the closest task to swap with, or insert at new position
    const otherTasks = tasks.filter(t => t.id !== task.id);
    let closestTask: WorkflowTask | null = null;
    let minDistance = Infinity;
    
    for (const other of otherTasks) {
        const otherPos = getGridPosition(other.displayOrder);
        const distance = Math.sqrt(
          Math.pow(draggedPosition.x - otherPos.x, 2) +
          Math.pow(draggedPosition.y - otherPos.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestTask = other;
      }
    }
    
    // If dropped close to another task, swap positions
    if (closestTask && minDistance < 100) {
      const updatedTasks = tasks.map(t => {
        if (t.id === task.id) {
          return { ...t, displayOrder: closestTask!.displayOrder };
        }
        if (t.id === closestTask!.id) {
          return { ...t, displayOrder: task.displayOrder };
        }
        return t;
      });
      const sorted = [...updatedTasks].sort((a, b) => a.displayOrder - b.displayOrder);
      const finalTasks = sorted.map((t, index) => ({ ...t, displayOrder: index + 1 }));
      onReorderTasks(finalTasks);
    } else {
      // Update to new position, reordering other tasks if needed
      const clampedOrder = Math.max(1, Math.min(newDisplayOrder, tasks.length));
      const oldOrder = task.displayOrder;
      
      const updatedTasks = tasks.map(t => {
        if (t.id === task.id) {
          return { ...t, displayOrder: clampedOrder };
        }
        if (oldOrder < clampedOrder) {
          if (t.displayOrder > oldOrder && t.displayOrder <= clampedOrder) {
            return { ...t, displayOrder: t.displayOrder - 1 };
          }
        } else if (oldOrder > clampedOrder) {
          if (t.displayOrder >= clampedOrder && t.displayOrder < oldOrder) {
            return { ...t, displayOrder: t.displayOrder + 1 };
          }
        }
        return t;
      });
      
      const sorted = [...updatedTasks].sort((a, b) => {
        if (a.id === task.id) return clampedOrder - b.displayOrder;
        if (b.id === task.id) return a.displayOrder - clampedOrder;
        return a.displayOrder - b.displayOrder;
      });
      const finalTasks = sorted.map((t, index) => ({ ...t, displayOrder: index + 1 }));
      onReorderTasks(finalTasks);
    }
    
    setDragState({ isDragging: false, taskId: null, startPosition: null });
    setDraggedPosition(null);
  }, [dragState, draggedPosition, tasks, getGridFromPosition, getGridPosition, onUpdateTask, onReorderTasks]);
  
  // Helper to get actual position of a task (including dragged position)
  const getActualPosition = useCallback((task: WorkflowTask) => {
    if (dragState.isDragging && dragState.taskId === task.id && draggedPosition) {
      return draggedPosition;
    }
    return getGridPosition(task.displayOrder);
  }, [dragState, draggedPosition, getGridPosition]);
  
  // Draw connection lines between tasks (horizontal within rows, vertical between rows)
  const renderConnections = () => {
    const sortedTasks = [...tasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const lines: React.ReactNode[] = [];
    
    // Draw sequential connections - connect ALL tasks in sequential order
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      const from = sortedTasks[i];
      const to = sortedTasks[i + 1];
      
      // Get actual positions (including dragged positions)
      const fromPos = getActualPosition(from);
      const toPos = getActualPosition(to);
      
      const fromRow = Math.floor((from.displayOrder - 1) / tasksPerRow);
      const toRow = Math.floor((to.displayOrder - 1) / tasksPerRow);
      
      const isHovered = hoveredTaskId === from.id || hoveredTaskId === to.id;
      
      // Same row: horizontal line
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
        
        // Arrow for horizontal line
        const angle = Math.atan2(0, toPos.x - fromPos.x);
        const arrowSize = 8;
        const arrowX = toPos.x - 40 * Math.cos(angle);
        const arrowY = toPos.y;
        
        lines.push(
          <motion.polygon
            key={`arrow-${from.id}-${to.id}`}
            points={`
              ${arrowX},${arrowY}
              ${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle - Math.PI / 6)}
              ${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle + Math.PI / 6)}
            `}
            fill={isHovered ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.5)'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 + 0.3 }}
          />
        );
      } else {
        // Different rows: L-shaped connection (horizontal then vertical)
        const isFromRowEven = fromRow % 2 === 0;
        const isToRowEven = toRow % 2 === 0;
        
        // Calculate connection points
        let midX1: number, midY1: number, midX2: number, midY2: number;
        
        if (isFromRowEven) {
          midX1 = fromPos.x + 50;
          midY1 = fromPos.y;
        } else {
          midX1 = fromPos.x - 50;
          midY1 = fromPos.y;
        }
        
        midY2 = fromPos.y + 50;
        midX2 = isToRowEven ? toPos.x - 50 : toPos.x + 50;
        
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
        
        // Arrow at the target (vertical)
        const arrowSize = 8;
        const arrowX = toPos.x;
        const arrowY = toPos.y - 40;
        
        lines.push(
          <motion.polygon
            key={`arrow-${from.id}-${to.id}`}
            points={`
              ${arrowX},${arrowY}
              ${arrowX - arrowSize},${arrowY - arrowSize * Math.sqrt(3) / 2}
              ${arrowX + arrowSize},${arrowY - arrowSize * Math.sqrt(3) / 2}
            `}
            fill={isHovered ? 'rgba(139, 92, 246, 0.8)' : 'rgba(139, 92, 246, 0.5)'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.05 + 0.3 }}
          />
        );
      }
    }
    
    // Draw branch connections (from parent to child tasks)
    sortedTasks.forEach((task) => {
      if (task.parentTaskId) {
        const parentTask = tasks.find(t => t.id === task.parentTaskId);
        if (!parentTask) return;
        
        const parentPos = getActualPosition(parentTask);
        const childPos = getActualPosition(task);
        
        const isHovered = hoveredTaskId === parentTask.id || hoveredTaskId === task.id;
        
        // Branch lines use curved path with green color
        const midX = (parentPos.x + childPos.x) / 2;
        const midY = (parentPos.y + childPos.y) / 2;
        const ctrlX = midX;
        const ctrlY = midY - 50;
        
        lines.push(
          <motion.path
            key={`branch-${parentTask.id}-${task.id}`}
            d={`M ${parentPos.x} ${parentPos.y} Q ${ctrlX} ${ctrlY} ${childPos.x} ${childPos.y}`}
            stroke={isHovered ? 'rgba(34, 197, 94, 0.7)' : 'rgba(34, 197, 94, 0.4)'}
            strokeWidth={isHovered ? '2.5' : '2'}
            strokeDasharray="4 4"
            fill="none"
            className="transition-all duration-300"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          />
        );
      }
    });
    
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
      onClick={() => onSelectTask(null)}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-white to-white" />
      
      {/* SVG Layer for connections */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        style={{ minHeight: dimensions.height }}
      >
        {renderConnections()}
      </svg>
      
      {/* Task Nodes */}
      <AnimatePresence>
        {tasks.map((task) => {
          const isDragging = dragState.isDragging && dragState.taskId === task.id;
          const position = isDragging && draggedPosition
            ? draggedPosition
            : getTaskPosition(task);
          
          // Get icon and color from industry config
          const icon = getTaskTypeIcon(industry, task.taskType);
          const color = getTaskTypeColor(industry, task.taskType);
          
          return (
            <TaskNode
              key={task.id}
              task={task}
              icon={icon}
              color={color}
              isSelected={selectedTaskId === task.id}
              isDragging={isDragging}
              position={position}
              onSelect={() => onSelectTask(task.id)}
              onDragStart={(e) => handleDragStart(task.id, e)}
              onHover={() => setHoveredTaskId(task.id)}
              onHoverEnd={() => setHoveredTaskId(null)}
            />
          );
        })}
      </AnimatePresence>
      
      {/* Instructions */}
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
        <p className="text-gray-600">Click task to edit</p>
        <p className="text-gray-600">Drag to reposition</p>
        <p className="text-gray-600">Drop on task to swap</p>
      </motion.div>
      
      {/* Stats */}
      <div className="absolute bottom-4 right-4 flex gap-3 text-xs z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">Tasks</div>
          <div className="text-gray-900 font-bold">{tasks.length}</div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">HITL Gates</div>
          <div className="text-purple-600 font-bold">
            {tasks.filter(t => t.isHITL).length}
          </div>
        </div>
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">Agents</div>
          <div className="text-gray-900 font-bold">
            {new Set(tasks.map(t => t.assignedAgentId).filter(Boolean)).size}
          </div>
        </div>
      </div>
    </div>
  );
}
