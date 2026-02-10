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
  // Phase 2: Enhanced timing options for drip campaigns
  delayDays?: number; // Days delay (for granular control)
  delayHours?: number; // Hours delay (for granular control)
  preferredSendTime?: string | null; // Preferred time of day to send (HH:MM format)
  skipConditions?: Array<{
    field: string;
    operator: string;
    value: string;
  }> | null; // Conditions to skip this task
  // Phase 3: A/B Testing fields
  isAbTestVariant?: boolean; // True if this task is an A/B test variant
  abTestGroup?: string | null; // 'A' or 'B' - which test group this variant belongs to
  variantOf?: string | null; // ID of the original task this variant is based on
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
