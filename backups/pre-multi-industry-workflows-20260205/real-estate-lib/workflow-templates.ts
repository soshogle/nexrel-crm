/**
 * Real Estate Workflow Templates
 * Default Buyer and Seller pipeline templates with task configurations
 */

import { REAIEmployeeType, RETaskType, REWorkflowType } from '@prisma/client';

// Agent name mapping for display
export const RE_AGENT_NAMES: Record<REAIEmployeeType, string> = {
  RE_SPEED_TO_LEAD: 'Sarah',
  RE_FSBO_OUTREACH: 'Michael',
  RE_EXPIRED_OUTREACH: 'Jessica',
  RE_COLD_REACTIVATION: 'Alex',
  RE_DOCUMENT_CHASER: 'Emma',
  RE_SHOWING_CONFIRM: 'David',
  RE_SPHERE_NURTURE: 'Rachel',
  RE_BUYER_FOLLOWUP: 'Chris',
  RE_MARKET_UPDATE: 'Jennifer',
  RE_STALE_DIAGNOSTIC: 'Mark',
  RE_LISTING_BOOST: 'Sophie',
  RE_CMA_GENERATOR: 'Daniel'
};

// Agent colors for UI
export const RE_AGENT_COLORS: Record<REAIEmployeeType, { bg: string; border: string; text: string }> = {
  RE_SPEED_TO_LEAD: { bg: 'bg-yellow-500/20', border: 'border-yellow-500', text: 'text-yellow-600' },
  RE_FSBO_OUTREACH: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-600' },
  RE_EXPIRED_OUTREACH: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-600' },
  RE_COLD_REACTIVATION: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-600' },
  RE_DOCUMENT_CHASER: { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-600' },
  RE_SHOWING_CONFIRM: { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-600' },
  RE_SPHERE_NURTURE: { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-600' },
  RE_BUYER_FOLLOWUP: { bg: 'bg-teal-500/20', border: 'border-teal-500', text: 'text-teal-600' },
  RE_MARKET_UPDATE: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-600' },
  RE_STALE_DIAGNOSTIC: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-600' },
  RE_LISTING_BOOST: { bg: 'bg-violet-500/20', border: 'border-violet-500', text: 'text-violet-600' },
  RE_CMA_GENERATOR: { bg: 'bg-slate-500/20', border: 'border-slate-500', text: 'text-slate-600' }
};

// Task type labels for display
export const TASK_TYPE_LABELS: Record<RETaskType, string> = {
  QUALIFICATION: 'Lead Qualification',
  MLS_SEARCH: 'MLS Search Setup',
  SHOWING_SCHEDULE: 'Schedule Showings',
  SHOWING_FEEDBACK: 'Collect Feedback',
  OFFER_PREP: 'Prepare Offer',
  OFFER_SUBMIT: 'Submit Offer',
  CONDITION_TRACKING: 'Track Conditions',
  CLOSING_COORDINATION: 'Closing Coordination',
  POST_CLOSE_FOLLOWUP: 'Post-Close Follow-up',
  CMA_GENERATION: 'Generate CMA',
  LISTING_PREP: 'Prepare Listing',
  PHOTO_SCHEDULING: 'Schedule Photography',
  MARKETING_DRAFT: 'Draft Marketing',
  LISTING_PUBLISH: 'Publish Listing',
  CUSTOM: 'Custom Task'
};

export interface WorkflowTaskTemplate {
  name: string;
  description: string;
  taskType: RETaskType;
  assignedAgentType: REAIEmployeeType | null;
  delayValue: number;
  delayUnit: 'MINUTES' | 'HOURS' | 'DAYS';
  isHITL: boolean;
  isOptional: boolean;
  position: { angle: number; radius: number }; // For circular UI layout
  displayOrder: number;
  parentTaskIndex?: number; // Index of parent task for branching
  branchCondition?: { field: string; operator: string; value: string };
  actionConfig: {
    actions: ('voice_call' | 'sms' | 'email' | 'task' | 'calendar' | 'cma_generation' | 'presentation_generation' | 'market_research' | 'document')[];
    script?: string;
    template?: string;
    fields?: string[];
    // CMA-specific config
    address?: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    yearBuilt?: number;
    // Presentation-specific config
    presentationType?: string;
    propertyData?: any;
    // Market research config
    reportType?: 'buyer' | 'seller';
    region?: string;
    priceRange?: string;
    propertyType?: string;
  };
}

export interface WorkflowTemplate {
  name: string;
  type: REWorkflowType;
  description: string;
  tasks: WorkflowTaskTemplate[];
}

// Helper to calculate circular positions for tasks
function calculateCircularPositions(taskCount: number): { angle: number; radius: number }[] {
  const positions: { angle: number; radius: number }[] = [];
  const startAngle = -90; // Start from top (12 o'clock)
  const angleStep = 360 / taskCount;
  
  for (let i = 0; i < taskCount; i++) {
    positions.push({
      angle: startAngle + (i * angleStep),
      radius: 1 // Normalized radius, UI will scale
    });
  }
  
  return positions;
}

// ==========================================
// BUYER PIPELINE TEMPLATE
// ==========================================
const buyerPositions = calculateCircularPositions(12);

export const BUYER_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  name: 'Buyer Pipeline',
  type: 'BUYER' as REWorkflowType,
  description: 'Complete buyer journey from lead qualification to closing and post-close follow-up',
  tasks: [
    {
      name: 'Lead Qualification',
      description: 'Initial qualification call to understand buyer needs, budget, timeline, and preapproval status',
      taskType: 'QUALIFICATION' as RETaskType,
      assignedAgentType: 'RE_SPEED_TO_LEAD' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[0],
      displayOrder: 1,
      actionConfig: {
        actions: ['voice_call', 'sms'],
        script: 'qualification_buyer',
        fields: ['budget', 'areas', 'beds', 'baths', 'timeline', 'preapproved', 'needs_to_sell', 'must_haves', 'nice_to_haves']
      }
    },
    {
      name: 'Store Data & Send Recap',
      description: 'Store qualification data in CRM and send buyer a recap of their requirements',
      taskType: 'CUSTOM' as RETaskType,
      assignedAgentType: null,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[1],
      displayOrder: 2,
      actionConfig: {
        actions: ['sms', 'email'],
        template: 'buyer_recap'
      }
    },
    {
      name: 'Create MLS Search Criteria',
      description: 'Set up MLS/portal search based on buyer requirements and start shortlist updates',
      taskType: 'MLS_SEARCH' as RETaskType,
      assignedAgentType: 'RE_CMA_GENERATOR' as REAIEmployeeType,
      delayValue: 5,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[2],
      displayOrder: 3,
      actionConfig: {
        actions: ['task'],
        fields: ['search_criteria', 'saved_search_id']
      }
    },
    {
      name: 'Compile Property Shortlist',
      description: 'Compile shortlist of matching properties with comparables summary packet',
      taskType: 'CUSTOM' as RETaskType,
      assignedAgentType: 'RE_MARKET_UPDATE' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[3],
      displayOrder: 4,
      actionConfig: {
        actions: ['document', 'email'],
        template: 'property_shortlist'
      }
    },
    {
      name: 'Schedule Showings',
      description: 'Schedule property showings based on buyer availability',
      taskType: 'SHOWING_SCHEDULE' as RETaskType,
      assignedAgentType: 'RE_SHOWING_CONFIRM' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[4],
      displayOrder: 5,
      actionConfig: {
        actions: ['voice_call', 'calendar'],
        script: 'schedule_showing'
      }
    },
    {
      name: 'Collect Showing Feedback',
      description: 'Wait 12 hours after showing, then request feedback on properties viewed',
      taskType: 'SHOWING_FEEDBACK' as RETaskType,
      assignedAgentType: 'RE_SHOWING_CONFIRM' as REAIEmployeeType,
      delayValue: 12,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[5],
      displayOrder: 6,
      actionConfig: {
        actions: ['voice_call', 'sms'],
        script: 'showing_feedback',
        fields: ['liked_properties', 'feedback_notes', 'wants_to_offer']
      }
    },
    {
      name: 'Adjust Criteria / More Options',
      description: 'Based on feedback, adjust search criteria and send more property options',
      taskType: 'CUSTOM' as RETaskType,
      assignedAgentType: 'RE_BUYER_FOLLOWUP' as REAIEmployeeType,
      delayValue: 1,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: true,
      position: buyerPositions[6],
      displayOrder: 7,
      branchCondition: { field: 'feedback', operator: 'not_equals', value: 'wants_to_offer' },
      actionConfig: {
        actions: ['voice_call', 'email'],
        script: 'adjust_criteria'
      }
    },
    {
      name: 'Collect Offer Inputs',
      description: 'Gather offer details: price, deposit, conditions, dates, inclusions',
      taskType: 'OFFER_PREP' as RETaskType,
      assignedAgentType: 'RE_BUYER_FOLLOWUP' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[7],
      displayOrder: 8,
      actionConfig: {
        actions: ['voice_call'],
        script: 'collect_offer_inputs',
        fields: ['offer_price', 'deposit', 'conditions', 'closing_date', 'inclusions']
      }
    },
    {
      name: 'Prepare Offer Brief',
      description: 'Prepare offer brief and draft email - REQUIRES HUMAN APPROVAL before sending',
      taskType: 'OFFER_SUBMIT' as RETaskType,
      assignedAgentType: 'RE_DOCUMENT_CHASER' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: true, // Human approval required
      isOptional: false,
      position: buyerPositions[8],
      displayOrder: 9,
      actionConfig: {
        actions: ['document', 'task'],
        template: 'offer_brief'
      }
    },
    {
      name: 'Track Conditions & Deadlines',
      description: 'Track financing, inspection deadlines and send reminders. Recommend inspectors and notaries.',
      taskType: 'CONDITION_TRACKING' as RETaskType,
      assignedAgentType: 'RE_DOCUMENT_CHASER' as REAIEmployeeType,
      delayValue: 1,
      delayUnit: 'DAYS',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[9],
      displayOrder: 10,
      actionConfig: {
        actions: ['sms', 'email', 'calendar'],
        template: 'condition_tracking'
      }
    },
    {
      name: 'Closing Coordination',
      description: 'Create calendar events, send notary reminder 24h before, coordinate closing',
      taskType: 'CLOSING_COORDINATION' as RETaskType,
      assignedAgentType: 'RE_DOCUMENT_CHASER' as REAIEmployeeType,
      delayValue: 24,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[10],
      displayOrder: 11,
      actionConfig: {
        actions: ['sms', 'calendar'],
        template: 'closing_reminder'
      }
    },
    {
      name: 'Post-Close Review Request',
      description: '7 days after closing, request review and referrals. Start optional similar property drip.',
      taskType: 'POST_CLOSE_FOLLOWUP' as RETaskType,
      assignedAgentType: 'RE_SPHERE_NURTURE' as REAIEmployeeType,
      delayValue: 7,
      delayUnit: 'DAYS',
      isHITL: false,
      isOptional: false,
      position: buyerPositions[11],
      displayOrder: 12,
      actionConfig: {
        actions: ['voice_call', 'email'],
        script: 'post_close_review',
        template: 'review_request'
      }
    }
  ]
};

// ==========================================
// SELLER PIPELINE TEMPLATE
// ==========================================
const sellerPositions = calculateCircularPositions(10);

export const SELLER_WORKFLOW_TEMPLATE: WorkflowTemplate = {
  name: 'Seller Pipeline',
  type: 'SELLER' as REWorkflowType,
  description: 'Complete seller journey from lead to listing, negotiation, and post-close follow-up',
  tasks: [
    {
      name: 'Seller Lead Qualification',
      description: 'Initial qualification to understand seller timeline, property condition, and price expectations',
      taskType: 'QUALIFICATION' as RETaskType,
      assignedAgentType: 'RE_SPEED_TO_LEAD' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[0],
      displayOrder: 1,
      actionConfig: {
        actions: ['voice_call', 'sms'],
        script: 'qualification_seller',
        fields: ['address', 'timeline', 'condition_notes', 'price_expectation']
      }
    },
    {
      name: 'Book Evaluation Appointment',
      description: 'Schedule property evaluation appointment with the seller',
      taskType: 'CUSTOM' as RETaskType,
      assignedAgentType: 'RE_SHOWING_CONFIRM' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[1],
      displayOrder: 2,
      actionConfig: {
        actions: ['voice_call', 'calendar'],
        script: 'book_evaluation'
      }
    },
    {
      name: 'Prepare CMA & Presentation',
      description: 'Generate CMA, recently sold report, and listing presentation',
      taskType: 'CMA_GENERATION' as RETaskType,
      assignedAgentType: 'RE_CMA_GENERATOR' as REAIEmployeeType,
      delayValue: 24,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[2],
      displayOrder: 3,
      actionConfig: {
        actions: ['document'],
        template: 'cma_presentation'
      }
    },
    {
      name: 'Schedule Photography',
      description: 'Coordinate with photo team and seller for property photography',
      taskType: 'PHOTO_SCHEDULING' as RETaskType,
      assignedAgentType: 'RE_SHOWING_CONFIRM' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[3],
      displayOrder: 4,
      actionConfig: {
        actions: ['voice_call', 'calendar'],
        script: 'schedule_photography'
      }
    },
    {
      name: 'Send Photo Day Checklist',
      description: 'Send seller checklist to prepare property for photography',
      taskType: 'CUSTOM' as RETaskType,
      assignedAgentType: 'RE_DOCUMENT_CHASER' as REAIEmployeeType,
      delayValue: 48,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[4],
      displayOrder: 5,
      actionConfig: {
        actions: ['sms', 'email'],
        template: 'photo_day_checklist'
      }
    },
    {
      name: 'Draft MLS Remarks & Marketing',
      description: 'Draft MLS description and create marketing posts for social media',
      taskType: 'MARKETING_DRAFT' as RETaskType,
      assignedAgentType: 'RE_LISTING_BOOST' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[5],
      displayOrder: 6,
      actionConfig: {
        actions: ['document'],
        template: 'mls_marketing_draft'
      }
    },
    {
      name: 'Publish Listing',
      description: 'Approve price and remarks, then publish to MLS/Centris - REQUIRES HUMAN APPROVAL',
      taskType: 'LISTING_PUBLISH' as RETaskType,
      assignedAgentType: null,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: true, // Human approval required
      isOptional: false,
      position: sellerPositions[6],
      displayOrder: 7,
      actionConfig: {
        actions: ['task'],
        template: 'listing_publish'
      }
    },
    {
      name: 'Collect Showing Feedback',
      description: 'After each showing, collect buyer agent feedback and summarize for seller',
      taskType: 'SHOWING_FEEDBACK' as RETaskType,
      assignedAgentType: 'RE_SHOWING_CONFIRM' as REAIEmployeeType,
      delayValue: 4,
      delayUnit: 'HOURS',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[7],
      displayOrder: 8,
      actionConfig: {
        actions: ['voice_call', 'sms'],
        script: 'seller_showing_feedback',
        template: 'feedback_summary'
      }
    },
    {
      name: 'Handle Offers & Negotiation',
      description: 'Log offer terms, draft response/counter - REQUIRES HUMAN APPROVAL for negotiations',
      taskType: 'OFFER_PREP' as RETaskType,
      assignedAgentType: 'RE_DOCUMENT_CHASER' as REAIEmployeeType,
      delayValue: 0,
      delayUnit: 'MINUTES',
      isHITL: true, // Human approval required
      isOptional: false,
      position: sellerPositions[8],
      displayOrder: 9,
      actionConfig: {
        actions: ['document', 'task'],
        template: 'offer_response'
      }
    },
    {
      name: 'Post-Close Review Request',
      description: '7 days after closing, request review and referrals from seller',
      taskType: 'POST_CLOSE_FOLLOWUP' as RETaskType,
      assignedAgentType: 'RE_SPHERE_NURTURE' as REAIEmployeeType,
      delayValue: 7,
      delayUnit: 'DAYS',
      isHITL: false,
      isOptional: false,
      position: sellerPositions[9],
      displayOrder: 10,
      actionConfig: {
        actions: ['voice_call', 'email'],
        script: 'post_close_review',
        template: 'review_request'
      }
    }
  ]
};

// Export all templates
export const DEFAULT_WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  BUYER_WORKFLOW_TEMPLATE,
  SELLER_WORKFLOW_TEMPLATE
];

// Get template by type
export function getWorkflowTemplateByType(type: REWorkflowType): WorkflowTemplate | undefined {
  return DEFAULT_WORKFLOW_TEMPLATES.find(t => t.type === type);
}
