/**
 * Campaign Builder Types
 * Canvas-based drip campaign builder (email, SMS, delay steps)
 * Mirrors workflow builder: branching, conditions, expandable steps
 */

export type CampaignStepType = 'EMAIL' | 'SMS' | 'VOICE' | 'DELAY';

export interface CampaignStep {
  id: string;
  type: CampaignStepType;
  displayOrder: number;
  name: string;
  // EMAIL
  subject?: string;
  previewText?: string;
  htmlContent?: string;
  textContent?: string;
  // SMS
  message?: string;
  // VOICE
  voiceAgentId?: string;
  callScript?: string;
  // DELAY
  delayDays?: number;
  delayHours?: number;
  sendTime?: string;
  // Skip conditions
  skipIfEngaged?: boolean; // email: skip if opened/clicked previous
  skipIfReplied?: boolean; // sms: skip if replied to previous
  // Conditional branching (like workflow builder)
  parentStepId?: string | null;
  branchCondition?: {
    field: string;
    operator: string;
    value: string;
  } | null;
  // Skip conditions (like workflow builder - skip if any met)
  skipConditions?: Array<{
    field: string;
    operator: string;
    value: string;
  }> | null;
  // Expandable state (for UI)
  isExpanded?: boolean;
}

export interface CampaignBuilderState {
  id?: string;
  name: string;
  description: string;
  campaignType: 'email-drip' | 'sms-drip' | 'voice';
  triggerType: string;
  steps: CampaignStep[];
  // Sender info
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  fromNumber?: string;
  tags?: string;
  // Voice campaign settings
  voiceAgentId?: string;
  minLeadScore?: number;
  maxCallsPerDay?: number;
  callWindowStart?: string;
  callWindowEnd?: string;
  maxRetries?: number;
  // Audience (bulk targeting)
  audience?: {
    type: 'SINGLE' | 'FILTERED' | 'MANUAL' | 'WEBSITE_LEADS';
    filters?: {
      minLeadScore?: number;
      statuses?: string[];
      tags?: string[];
      hasPhone?: boolean;
      hasEmail?: boolean;
    };
  };
  // Campaign settings (rate limits, scheduling)
  dailyLimit?: number;
  weeklyLimit?: number;
  scheduledFor?: string;
}

export interface DragState {
  isDragging: boolean;
  stepId: string | null;
  startPosition: { x: number; y: number } | null;
}
