'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WorkflowTask, WorkflowTemplate, DragState, AGENT_COLORS } from './types';
import { TaskNode } from './task-node';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Info } from 'lucide-react';

interface CircularWorkflowCanvasProps {
  workflow: WorkflowTemplate;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  onUpdateTask: (task: WorkflowTask) => void;
  onReorderTasks: (tasks: WorkflowTask[]) => void;
  onAddTask?: () => void;
}

export function CircularWorkflowCanvas({
  workflow,
  selectedTaskId,
  onSelectTask,
  onUpdateTask,
  onReorderTasks,
  onAddTask,
}: CircularWorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 900 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    taskId: null,
    startAngle: 0,
    startRadius: 0,
  });
  const [draggedPosition, setDraggedPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height, 900);
        setDimensions({ width: size, height: size });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);
  
  const center = { x: dimensions.width / 2, y: dimensions.height / 2 };
  const maxRadius = Math.min(dimensions.width, dimensions.height) / 2 - 100;
  
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
    e.stopPropagation();
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
        if (distance < 60) {
          const updatedTasks = workflow.tasks.map(t => {
            if (t.id === task.id) {
              return { ...t, displayOrder: other.displayOrder, angle: other.angle, radius: other.radius };
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
  
  // Draw connection lines between tasks (including branches)
  const renderConnections = () => {
    const sortedTasks = [...workflow.tasks].sort((a, b) => a.displayOrder - b.displayOrder);
    const lines: React.ReactNode[] = [];
    
    // Draw sequential connections
    for (let i = 0; i < sortedTasks.length - 1; i++) {
      const from = sortedTasks[i];
      const to = sortedTasks[i + 1];
      
      // Skip if to has a parent task (it's a branch, handled separately)
      if (to.parentTaskId && to.parentTaskId !== from.id) continue;
      
      const fromPos = getPosition(from.angle, from.radius * maxRadius);
      const toPos = getPosition(to.angle, to.radius * maxRadius);
      
      // Calculate control points for curved line
      const midX = (fromPos.x + toPos.x) / 2;
      const midY = (fromPos.y + toPos.y) / 2;
      
      // Pull toward center for curve
      const pullFactor = 0.2;
      const ctrlX = midX + (center.x - midX) * pullFactor;
      const ctrlY = midY + (center.y - midY) * pullFactor;
      
      const isHovered = hoveredTaskId === from.id || hoveredTaskId === to.id;
      
      lines.push(
        <motion.path
          key={`line-${from.id}-${to.id}`}
          d={`M ${fromPos.x} ${fromPos.y} Q ${ctrlX} ${ctrlY} ${toPos.x} ${toPos.y}`}
          stroke={isHovered ? 'rgba(139, 92, 246, 0.6)' : 'rgba(139, 92, 246, 0.3)'}
          strokeWidth={isHovered ? '3' : '2'}
          fill="none"
          className="transition-all duration-300"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: i * 0.05 }}
        />
      );
      
      // Add arrow at the end
      const angle = Math.atan2(toPos.y - ctrlY, toPos.x - ctrlX);
      const arrowSize = 6;
      const arrowX = toPos.x - 25 * Math.cos(angle);
      const arrowY = toPos.y - 25 * Math.sin(angle);
      
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
    }
    
    // Draw branch connections (from parent to child tasks)
    sortedTasks.forEach((task) => {
      if (task.parentTaskId) {
        const parentTask = workflow.tasks.find(t => t.id === task.parentTaskId);
        if (!parentTask) return;
        
        const parentPos = getPosition(parentTask.angle, parentTask.radius * maxRadius);
        const childPos = getPosition(task.angle, task.radius * maxRadius);
        
        // Branch lines are more curved and use green color
        const midX = (parentPos.x + childPos.x) / 2;
        const midY = (parentPos.y + childPos.y) / 2;
        const pullFactor = 0.4; // More curve for branches
        const ctrlX = midX + (center.x - midX) * pullFactor;
        const ctrlY = midY + (center.y - midY) * pullFactor;
        
        const isHovered = hoveredTaskId === parentTask.id || hoveredTaskId === task.id;
        
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
        
        // Branch arrow
        const angle = Math.atan2(childPos.y - ctrlY, childPos.x - ctrlX);
        const arrowSize = 5;
        const arrowX = childPos.x - 25 * Math.cos(angle);
        const arrowY = childPos.y - 25 * Math.sin(angle);
        
        lines.push(
          <motion.polygon
            key={`branch-arrow-${parentTask.id}-${task.id}`}
            points={`
              ${arrowX},${arrowY}
              ${arrowX - arrowSize * Math.cos(angle - Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle - Math.PI / 6)}
              ${arrowX - arrowSize * Math.cos(angle + Math.PI / 6)},${arrowY - arrowSize * Math.sin(angle + Math.PI / 6)}
            `}
            fill={isHovered ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.6)'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          />
        );
      }
    });
    
    return lines;
  };
  
  // Draw concentric circles as guides
  const renderGuideCircles = () => {
    const circles = [0.4, 0.7, 1].map((ratio, i) => (
      <motion.circle
        key={`guide-${i}`}
        cx={center.x}
        cy={center.y}
        r={maxRadius * ratio}
        stroke="rgba(139, 92, 246, 0.1)"
        strokeWidth="1"
        strokeDasharray="4 4"
        fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: i * 0.1 }}
      />
    ));
    
    // Add radial lines (every 30 degrees)
    const lines = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
      const pos = getPosition(angle, maxRadius);
      return (
        <motion.line
          key={`radial-${angle}`}
          x1={center.x}
          y1={center.y}
          x2={pos.x}
          y2={pos.y}
          stroke="rgba(139, 92, 246, 0.05)"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        />
      );
    });
    
    return [...circles, ...lines];
  };
  
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full aspect-square bg-white rounded-xl overflow-hidden',
        'border-2 border-purple-200 shadow-lg'
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={() => onSelectTask(null)}
    >
      {/* Animated background gradient */}
      <motion.div 
        className="absolute inset-0 bg-gradient-radial from-purple-50 via-white to-white"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(167, 139, 250, 0.12) 0%, rgba(255, 255, 255, 0) 70%)',
            'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      
      {/* SVG Layer for connections and guides */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      >
        {renderGuideCircles()}
        {renderConnections()}
      </svg>
      
      {/* Center Label */}
      <motion.div
        className="absolute flex flex-col items-center justify-center"
        style={{
          left: center.x,
          top: center.y,
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-600 via-purple-500 to-white border-4 border-purple-200 shadow-lg flex items-center justify-center">
          <span className="text-3xl">🏠</span>
        </div>
        <p className="mt-2 text-sm font-bold text-gray-900">
          {workflow.workflowType === 'BUYER_PIPELINE' ? 'Buyer' : workflow.workflowType === 'SELLER_PIPELINE' ? 'Seller' : 'Custom'}
        </p>
        <p className="text-xs text-purple-600 font-medium">Pipeline</p>
        <p className="text-xs text-gray-500 mt-1">{workflow.tasks.length} tasks</p>
      </motion.div>
      
      {/* Task Nodes */}
      <AnimatePresence>
        {workflow.tasks.map((task, index) => {
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
              onHover={() => setHoveredTaskId(task.id)}
              onHoverEnd={() => setHoveredTaskId(null)}
            />
          );
        })}
      </AnimatePresence>
      
      {/* Add Task Button - appears between tasks */}
      {onAddTask && workflow.tasks.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onAddTask();
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-4 h-4" />
            Add Task
          </motion.button>
        </div>
      )}
      
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
      <div className="absolute bottom-4 right-4 flex gap-3 text-xs">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">Tasks</div>
          <div className="text-gray-900 font-bold">{workflow.tasks.length}</div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">HITL Gates</div>
          <div className="text-purple-600 font-bold">
            {workflow.tasks.filter(t => t.isHITL).length}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-purple-200 shadow-sm">
          <div className="text-gray-500">Agents</div>
          <div className="text-gray-900 font-bold">
            {new Set(workflow.tasks.map(t => t.assignedAgentId).filter(Boolean)).size}
          </div>
        </div>
      </div>
    </div>
  );
}
