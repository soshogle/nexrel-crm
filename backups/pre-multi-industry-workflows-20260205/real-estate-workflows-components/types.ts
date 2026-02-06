// Real Estate Workflow Types for Circular UI Builder

export interface WorkflowTask {
  id: string;
  name: string;
  description: string;
  taskType: 'QUALIFICATION' | 'MLS_SEARCH' | 'SHOWING_SCHEDULE' | 'SHOWING_FEEDBACK' | 'OFFER_PREP' | 'OFFER_SUBMIT' | 'CONDITION_TRACKING' | 'CLOSING_COORDINATION' | 'POST_CLOSE_FOLLOWUP' | 'CMA_GENERATION' | 'LISTING_PREP' | 'PHOTO_SCHEDULING' | 'MARKETING_DRAFT' | 'LISTING_PUBLISH' | 'OUTREACH' | 'SHOWING' | 'OFFER' | 'NEGOTIATION' | 'INSPECTION' | 'APPRAISAL' | 'FINANCING' | 'CLOSING' | 'POST_CLOSE' | 'LISTING' | 'MARKETING' | 'STAGING' | 'OPEN_HOUSE' | 'CUSTOM';
  assignedAgentId: string | null;
  assignedAgentName: string | null;
  agentColor: string;
  displayOrder: number;
  isHITL: boolean;
  delayMinutes: number;
  delayUnit?: 'MINUTES' | 'HOURS' | 'DAYS';
  angle: number; // Position on the circle (0-360)
  radius: number; // Distance from center (0-1)
  parentTaskId?: string | null; // For branching - parent task this branches from
  branchCondition?: {
    field: string;
    operator: string;
    value: string;
  } | null;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowType: 'BUYER_PIPELINE' | 'SELLER_PIPELINE' | 'CUSTOM';
  tasks: WorkflowTask[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DragState {
  isDragging: boolean;
  taskId: string | null;
  startAngle: number;
  startRadius: number;
}

export const AGENT_COLORS: Record<string, string> = {
  'Sarah': '#FF6B6B',
  'Michael': '#4ECDC4',
  'Jessica': '#45B7D1',
  'Alex': '#96CEB4',
  'Emma': '#FFEAA7',
  'David': '#DDA0DD',
  'Rachel': '#98D8C8',
  'Chris': '#F7DC6F',
  'Jennifer': '#BB8FCE',
  'Mark': '#85C1E9',
  'Sophie': '#F8B500',
  'Daniel': '#00CED1',
  'Unassigned': '#6B7280',
};

export const TASK_TYPE_ICONS: Record<string, string> = {
  'QUALIFICATION': '🎯',
  'MLS_SEARCH': '🔍',
  'SHOWING_SCHEDULE': '📅',
  'SHOWING_FEEDBACK': '💬',
  'OFFER_PREP': '📝',
  'OFFER_SUBMIT': '📤',
  'CONDITION_TRACKING': '⏰',
  'CLOSING_COORDINATION': '✅',
  'POST_CLOSE_FOLLOWUP': '🎉',
  'CMA_GENERATION': '📊',
  'LISTING_PREP': '📋',
  'PHOTO_SCHEDULING': '📸',
  'MARKETING_DRAFT': '📣',
  'LISTING_PUBLISH': '🚀',
  'OUTREACH': '📞',
  'SHOWING': '🏠',
  'OFFER': '📝',
  'NEGOTIATION': '🤝',
  'INSPECTION': '🔍',
  'APPRAISAL': '💰',
  'FINANCING': '🏦',
  'CLOSING': '✅',
  'POST_CLOSE': '🎉',
  'LISTING': '📋',
  'MARKETING': '📣',
  'STAGING': '🪑',
  'OPEN_HOUSE': '🚪',
  'CUSTOM': '⚙️',
};

export const RE_AGENTS = [
  { id: 'sarah', name: 'Sarah', role: 'Lead Qualification Specialist', color: '#FF6B6B' },
  { id: 'michael', name: 'Michael', role: 'Market Analysis Expert', color: '#4ECDC4' },
  { id: 'jessica', name: 'Jessica', role: 'Buyer Communication Manager', color: '#45B7D1' },
  { id: 'alex', name: 'Alex', role: 'Showing Coordinator', color: '#96CEB4' },
  { id: 'emma', name: 'Emma', role: 'Offer Preparation Specialist', color: '#FFEAA7' },
  { id: 'david', name: 'David', role: 'Negotiation Strategist', color: '#DDA0DD' },
  { id: 'rachel', name: 'Rachel', role: 'Transaction Coordinator', color: '#98D8C8' },
  { id: 'chris', name: 'Chris', role: 'Listing Marketing Manager', color: '#F7DC6F' },
  { id: 'jennifer', name: 'Jennifer', role: 'Seller Communication Lead', color: '#BB8FCE' },
  { id: 'mark', name: 'Mark', role: 'Property Valuation Expert', color: '#85C1E9' },
  { id: 'sophie', name: 'Sophie', role: 'Open House Coordinator', color: '#F8B500' },
  { id: 'daniel', name: 'Daniel', role: 'Closing Specialist', color: '#00CED1' },
];
