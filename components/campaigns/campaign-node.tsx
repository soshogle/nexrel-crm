'use client';

import React from 'react';
import { CampaignStep } from './campaign-builder-types';
import { cn } from '@/lib/utils';
import { GripVertical, Mail, MessageSquare, Clock, GitBranch } from 'lucide-react';
import { motion } from 'framer-motion';

const STEP_CONFIG: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  EMAIL: { icon: Mail, color: '#8b5cf6', label: 'Email' },
  SMS: { icon: MessageSquare, color: '#06b6d4', label: 'SMS' },
  DELAY: { icon: Clock, color: '#f59e0b', label: 'Delay' },
};

interface CampaignNodeProps {
  step: CampaignStep;
  isSelected: boolean;
  isDragging: boolean;
  position: { x: number; y: number };
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
}

export function CampaignNode({
  step,
  isSelected,
  isDragging,
  position,
  onSelect,
  onDragStart,
  onHover,
  onHoverEnd,
}: CampaignNodeProps) {
  const config = STEP_CONFIG[step.type] || STEP_CONFIG.EMAIL;
  const Icon = config.icon;
  const hasBranching = step.parentStepId != null;

  return (
    <motion.div
      className={cn(
        'absolute flex flex-col items-center cursor-pointer',
        'transform -translate-x-1/2 -translate-y-1/2',
        isDragging && 'z-50',
        isSelected && 'z-40'
      )}
      style={{ left: position.x, top: position.y }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: isDragging ? 1.15 : isSelected ? 1.1 : 1,
        opacity: 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      whileHover={{ scale: 1.1 }}
    >
      <motion.div
        className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center',
          'border-4 shadow-xl transition-all duration-200',
          isSelected && 'ring-4 ring-purple-500 ring-offset-2 ring-offset-white',
          isDragging && 'opacity-90'
        )}
        style={{
          background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%)`,
          borderColor: isSelected ? '#8b5cf6' : 'rgba(139, 92, 246, 0.3)',
          boxShadow: isSelected
            ? '0 10px 25px rgba(139, 92, 246, 0.4)'
            : '0 4px 12px rgba(0, 0, 0, 0.15)',
        }}
        onMouseDown={onDragStart}
        whileHover={{
          boxShadow: '0 10px 25px rgba(139, 92, 246, 0.4)',
          borderColor: '#8b5cf6',
        }}
      >
        <Icon className="w-8 h-8 text-white" />
        <motion.div
          className="absolute -top-1 -right-1 bg-white rounded-full p-1 shadow-md border border-purple-200"
          whileHover={{ scale: 1.1 }}
        >
          <GripVertical className="w-3 h-3 text-purple-600" />
        </motion.div>
        {hasBranching && (
          <motion.div
            className="absolute -bottom-1 -left-1 bg-green-500 rounded-full p-1.5 shadow-lg border-2 border-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            title="Conditional branch"
          >
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </motion.div>
        )}
      </motion.div>
      <motion.div
        className={cn(
          'mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold text-center max-w-[120px]',
          'bg-white border-2 shadow-md',
          isSelected ? 'border-purple-500 text-purple-700' : 'border-purple-200 text-gray-800'
        )}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="line-clamp-2">{step.name || config.label}</div>
        {step.isExpanded && (
          <div className="mt-1 text-[10px] text-gray-500 line-clamp-2 font-normal">
            {step.type === 'EMAIL' && (step.subject || '(no subject)')}
            {step.type === 'SMS' && (step.message || '(no message)')}
            {step.type === 'DELAY' && `Wait ${step.delayDays ?? 0}d ${step.delayHours ?? 0}h`}
          </div>
        )}
      </motion.div>
      <motion.div
        className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-purple-500 border-2 border-white shadow-md flex items-center justify-center text-xs font-bold text-white"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        {step.displayOrder}
      </motion.div>
    </motion.div>
  );
}
