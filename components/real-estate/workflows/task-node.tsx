'use client';

import React from 'react';
import { WorkflowTask, TASK_TYPE_ICONS } from './types';
import { cn } from '@/lib/utils';
import { GripVertical, Shield, Clock } from 'lucide-react';

interface TaskNodeProps {
  task: WorkflowTask;
  isSelected: boolean;
  isDragging: boolean;
  position: { x: number; y: number };
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}

export function TaskNode({
  task,
  isSelected,
  isDragging,
  position,
  onSelect,
  onDragStart,
}: TaskNodeProps) {
  const icon = TASK_TYPE_ICONS[task.taskType] || '⚙️';
  
  return (
    <div
      className={cn(
        'absolute flex flex-col items-center cursor-pointer transition-all duration-200',
        'transform -translate-x-1/2 -translate-y-1/2',
        isDragging && 'z-50 scale-110',
        isSelected && 'z-40'
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Task Circle */}
      <div
        className={cn(
          'relative w-16 h-16 rounded-full flex items-center justify-center',
          'border-4 shadow-lg transition-all duration-200',
          'hover:scale-110 hover:shadow-xl',
          isSelected && 'ring-4 ring-white ring-offset-2 ring-offset-gray-900',
          isDragging && 'opacity-80'
        )}
        style={{
          backgroundColor: task.agentColor || '#6B7280',
          borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.3)',
        }}
        onMouseDown={onDragStart}
      >
        {/* Icon */}
        <span className="text-2xl">{icon}</span>
        
        {/* Drag Handle */}
        <div className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
        
        {/* HITL Badge */}
        {task.isHITL && (
          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1">
            <Shield className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Delay Badge */}
        {task.delayMinutes > 0 && (
          <div className="absolute -bottom-1 -left-1 bg-blue-500 rounded-full p-1">
            <Clock className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
      
      {/* Task Name */}
      <div
        className={cn(
          'mt-2 px-2 py-1 rounded-md text-xs font-medium text-center',
          'max-w-[100px] truncate',
          'bg-gray-800/80 text-white backdrop-blur-sm'
        )}
      >
        {task.name}
      </div>
      
      {/* Agent Name */}
      {task.assignedAgentName && (
        <div
          className="mt-1 px-2 py-0.5 rounded text-[10px] text-gray-400"
          style={{ color: task.agentColor }}
        >
          {task.assignedAgentName}
        </div>
      )}
      
      {/* Order Number */}
      <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-gray-900 border-2 border-gray-700 flex items-center justify-center text-xs font-bold text-white">
        {task.displayOrder}
      </div>
    </div>
  );
}
