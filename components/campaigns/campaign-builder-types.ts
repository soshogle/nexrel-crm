/**
 * Campaign Builder Types
 * Canvas-based drip campaign builder (email, SMS, delay steps)
 */

export type CampaignStepType = 'EMAIL' | 'SMS' | 'DELAY';

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
  // DELAY
  delayDays?: number;
  delayHours?: number;
  sendTime?: string;
  // Skip conditions
  skipIfEngaged?: boolean; // email: skip if opened/clicked previous
  skipIfReplied?: boolean; // sms: skip if replied to previous
}

export interface CampaignBuilderState {
  id?: string;
  name: string;
  description: string;
  campaignType: 'email-drip' | 'sms-drip';
  triggerType: string;
  steps: CampaignStep[];
  // Sender info
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  fromNumber?: string;
  tags?: string;
}

export interface DragState {
  isDragging: boolean;
  stepId: string | null;
  startPosition: { x: number; y: number } | null;
}
