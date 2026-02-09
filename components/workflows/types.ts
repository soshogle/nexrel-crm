/**
 * Generic Multi-Industry Workflow Types
 * Works with any industry using industry configurations
 */

import { Industry } from '@prisma/client';

export interface WorkflowTask {
  id: string;
  name: string;
  description: string;
  taskType: string; // Industry-specific task type
  actionType?: string; // WorkflowActionType (SEND_EMAIL, CREATE_TASK, etc.)
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  agentColor: string;
  displayOrder: number;
  isHITL: boolean;
  delayMinutes: number;
  delayUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  parentTaskId?: string | null; // For branching
  branchCondition?: {
    field: string;
    operator: string;
    value: string;
  } | null;
  // Position for serpentine layout
  position?: {
    row: number;
    col: number;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowType: string; // Industry-specific workflow type
  industry: Industry;
  tasks: WorkflowTask[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  startPosition: { x: number; y: number } | null;
}

export interface IndustryAIAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
}

export interface IndustryTaskType {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}
