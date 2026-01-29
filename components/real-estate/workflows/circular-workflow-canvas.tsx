'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate, DragState, AGENT_COLORS } from './types';
import { TaskNode } from './task-node';
import { cn } from '@/lib/utils';

interface CircularWorkflowCanvasProps {
  workflow: WorkflowTemplate;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onUpdateTask: (task: WorkflowTask) => void;
  onReorderTasks: (tasks: WorkflowTask[]) => void;
}

export function CircularWorkflowCanvas({
  workflow,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onReorderTasks,
}: CircularWorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    startAngle: 0,
    startRadius: 0,
  });
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        setDimensions({ width: size, height: size });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
  const maxRadius = Math.min(dimensions.width, dimensions.height) / 2 - 80;
  
  // Calculate position from angle and radius
  const getPosition = useCallback((angle: number, radius: number) => {
    const radians = (angle - 90) * (Math.PI / 180);
    return {
      x: center.x + radius * Math.cos(radians),
      y: center.y + radius * Math.sin(radians),
    };
  }, [center]);
  
  // Calculate angle and radius from position
  const getAngleAndRadius = useCallback((x: number, y: number) => {
    const dx = x - center.x;
    const dy = y - center.y;
    const radius = Math.sqrt(dx * dx + dy * dy);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return { angle, radius: Math.min(radius, maxRadius) };
  }, [center, maxRadius]);
  
  // Handle drag start
  const handleDragStart = useCallback((taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const task = workflow.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    setDragState({
      isDragging: true,
      taskId,
      startAngle: task.angle,
      startRadius: task.radius * maxRadius,
    });
  }, [workflow.tasks, maxRadius]);
  
  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.taskId || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDraggedPosition({ x, y });
  }, [dragState]);
  
  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging || !dragState.taskId || !draggedPosition) {
      setDragState({ isDragging: false, taskId: null, startAngle: 0, startRadius: 0 });
      setDraggedPosition(null);
      return;
    }
    
    const { angle, radius } = getAngleAndRadius(draggedPosition.x, draggedPosition.y);
    const task = workflow.tasks.find(t => t.id === dragState.taskId);
    
    if (task) {
      // Update the task with new position
      const updatedTask = {
        ...task,
        angle,
        radius: radius / maxRadius,
      };
      onUpdateTask(updatedTask);
      
      // Check for task swapping based on proximity
      const otherTasks = workflow.tasks.filter(t => t.id !== task.id);
      for (const other of otherTasks) {
        const otherPos = getPosition(other.angle, other.radius * maxRadius);
        const distance = Math.sqrt(
          Math.pow(draggedPosition.x - otherPos.x, 2) +
          Math.pow(draggedPosition.y - otherPos.y, 2)
        );
        
        // If dropped close to another task, swap positions
        if (distance < 50) {
          const updatedTasks = workflow.tasks.map(t => {
            if (t.id === task.id) {
              return { ...t, order: other.displayOrder, angle: other.angle, radius: other.radius };
            }
            if (t.id === other.id) {
              return { ...t, displayOrder: task.displayOrder, angle: task.angle, radius: task.radius };
            }
            return t;
          });
          onReorderTasks(updatedTasks);
          break;
        }
      }
    }
    
    setDragState({ isDragging: false, taskId: null, startAngle: 0, startRadius: 0 });
    setDraggedPosition(null);
  }, [dragState, draggedPosition, workflow.tasks, getAngleAndRadius, getPosition, maxRadius, onUpdateTask, onReorderTasks]);
  
  // Draw connection lines between tasks
  const renderConnections = () => {
    const sortedTasks = [...workflow.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const lines: React.ReactNode[] = [];
    
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      const from = sortedTasks[i];
      const to = sortedTasks[i + 1];
      
      const fromPos = getPosition(from.angle, from.radius * maxRadius);
      const toPos = getPosition(to.angle, to.radius * maxRadius);
      
      // Calculate control points for curved line
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      
      // Pull toward center for curve
      const pullFactor = 0.3;
      const ctrlX = midX + (center.x - midX) * pullFactor;
      const ctrlY = midY + (center.y - midY) * pullFactor;
      
      lines.push(
        <path
          key={`line-${from.id}-${to.id}`}
          d={`M ${fromPos.x} ${fromPos.y} Q ${ctrlX} ${ctrlY} ${toPos.x} ${toPos.y}`}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
          fill="none"
          className="transition-all duration-300"
        />
      );
      
      // Add arrow at the end
      const angle = Math.atan2(toPos.y - ctrlY, toPos.x - ctrlX);
      const arrowSize = 8;
      const arrowX = toPos.x - 20 * Math.cos(angle);
      const arrowY = toPos.y - 20 * Math.sin(angle);
      
      lines.push(
        <polygon
          key={`arrow-${from.id}-${to.id}`}
          points={`
            ${arrowX},${arrowY}
            ${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle - Math.PI / 6)}
            ${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle + Math.PI / 6)}
          `}
          fill="rgba(255,255,255,0.3)"
        />
      );
    }
    
    return lines;
  };
  
  // Draw concentric circles as guides
  const renderGuideCircles = () => {
    const circles = [0.33, 0.66, 1].map((ratio, i) => (
      <circle
        key={`guide-${i}`}
        cx={center.x}
        cy={center.y}
        r={maxRadius * ratio}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        strokeDasharray="4 4"
        fill="none"
      />
    ));
    
    // Add radial lines
    const lines = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
      const pos = getPosition(angle, maxRadius);
      return (
        <line
          key={`radial-${angle}`}
          x1={center.x}
          y1={center.y}
          x2={pos.x}
          y2={pos.y}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="1"
        />
      );
    });
    
    return [...circles, ...lines];
  };
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-square bg-gray-950 rounded-xl overflow-hidden',
        'border border-gray-800'
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelectTask(null)}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-gray-900 via-gray-950 to-black" />
      
      {/* SVG Layer for connections and guides */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {renderGuideCircles()}
        {renderConnections()}
      </svg>
      
      {/* Center Label */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          left: center.x,
          top: center.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
          <span className="text-3xl">🏠</span>
        </div>
        <p className="mt-2 text-sm font-medium text-white">
          {workflow.workflowType === 'BUYER_PIPELINE' ? 'Buyer' : 'Seller'}
        </p>
        <p className="text-xs text-gray-500">Pipeline</p>
      </div>
      
      {/* Task Nodes */}
      {workflow.tasks.map((task) => {
        const isDragging = dragState.isDragging && dragState.taskId === task.id;
        const position = isDragging && draggedPosition
          ? draggedPosition
          : getPosition(task.angle, task.radius * maxRadius);
        
        return (
          <TaskNode
            key={task.id}
            task={task}
            isSelected={selectedTaskId === task.id}
            isDragging={isDragging}
            position={position}
            onSelect={() => onSelectTask(task.id)}
            onDragStart={(e) => handleDragStart(task.id, e)}
          />
        );
      })}
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 max-w-[200px]">
        {Object.entries(AGENT_COLORS).slice(0, 6).map(([name, color]) => (
          <div key={name} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-gray-500">{name}</span>
          </div>
        ))}
      </div>
      
      {/* Instructions */}
      <div className="absolute top-4 right-4 text-xs text-gray-500 text-right">
        <p>Click task to edit</p>
        <p>Drag to reposition</p>
        <p>Drop on task to swap</p>
      </div>
    </div>
  );
}
