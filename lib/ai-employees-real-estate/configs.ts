/**
 * Real Estate AI Employee Configurations
 * Defines all RE AI employees and their capabilities
 */

import { AIEmployeeType } from '@prisma/client';

export interface REEmployeeConfig {
  type: AIEmployeeType;
  name: string;
  description: string;
  capabilities: string[];
  voiceEnabled: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDuration: number; // minutes
  triggers: string[];
  requiredData: string[];
}

export const RE_EMPLOYEE_CONFIGS: Record<string, REEmployeeConfig> = {
  RE_SPEED_TO_LEAD: {
    type: 'RE_SPEED_TO_LEAD' as AIEmployeeType,
    name: 'Alex - Speed to Lead Specialist',
    description: 'Instantly responds to new real estate inquiries within seconds. Makes immediate calls and sends personalized texts to capture leads before competitors.',
    capabilities: [
      'Instant lead response (< 60 seconds)',
      'DNC verification before calling',
      'Personalized voice calls with AI',
      'SMS/Email follow-up sequences',
      'Lead qualification questions',
      'Appointment booking',
      'CRM auto-update'
    ],
    voiceEnabled: true,
    defaultPriority: 'URGENT',
    estimatedDuration: 5,
    triggers: ['new_lead', 'web_inquiry', 'zillow_lead', 'realtor_lead'],
    requiredData: ['phone', 'name']
  },

  RE_FSBO_OUTREACH: {
    type: 'RE_FSBO_OUTREACH' as AIEmployeeType,
    name: 'Maya - FSBO Specialist',
    description: 'Proactively reaches out to For Sale By Owner listings from DuProprio, FSBO.com, and other sources. Uses consultative approach to convert FSBOs to listings.',
    capabilities: [
      'DuProprio scraping & monitoring',
      'US FSBO site monitoring',
      'DNC compliance verification',
      'Consultative call scripts',
      'Free CMA offer delivery',
      'Objection handling',
      'Follow-up scheduling',
      'Cross-sell to buyer services'
    ],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 10,
    triggers: ['new_fsbo_listing', 'fsbo_price_drop', 'fsbo_days_on_market'],
    requiredData: ['address', 'sellerPhone']
  },

  RE_EXPIRED_OUTREACH: {
    type: 'RE_EXPIRED_OUTREACH' as AIEmployeeType,
    name: 'Jordan - Expired Listing Hunter',
    description: 'Contacts owners of expired listings with empathy and a fresh marketing strategy. Identifies why the listing failed and presents solutions.',
    capabilities: [
      'Expired listing data import',
      'Previous agent detection (to avoid)',
      'DNC verification',
      'Empathetic conversation scripts',
      'Market analysis presentation',
      'Pricing strategy discussion',
      'Photography/staging recommendations'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 15,
    triggers: ['listing_expired', 'listing_withdrawn'],
    requiredData: ['ownerPhone', 'address', 'originalPrice']
  },

  RE_COLD_REACTIVATION: {
    type: 'RE_COLD_REACTIVATION' as AIEmployeeType,
    name: 'Sam - Lead Reactivation Expert',
    description: 'Re-engages cold leads who haven\'t responded in 30+ days. Uses market updates and new listings as conversation starters.',
    capabilities: [
      'Cold lead identification',
      'Market update personalization',
      'New listing alerts',
      'Life event triggers',
      'Multi-channel outreach',
      'Re-qualification questions',
      'Drip campaign enrollment'
    ],
    voiceEnabled: true,
    defaultPriority: 'LOW',
    estimatedDuration: 8,
    triggers: ['lead_cold_30_days', 'lead_cold_90_days', 'market_shift'],
    requiredData: ['leadId', 'lastContactDate']
  },

  RE_DOCUMENT_CHASER: {
    type: 'RE_DOCUMENT_CHASER' as AIEmployeeType,
    name: 'Taylor - Transaction Coordinator',
    description: 'Follows up on missing documents during transactions. Sends reminders for signatures, inspections, and deadlines.',
    capabilities: [
      'Document checklist tracking',
      'Deadline reminders',
      'E-signature requests',
      'Lender document coordination',
      'Title company liaison',
      'Inspection scheduling',
      'Closing countdown alerts'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 5,
    triggers: ['document_missing', 'deadline_approaching', 'signature_pending'],
    requiredData: ['transactionId', 'documentType']
  },

  RE_SHOWING_CONFIRM: {
    type: 'RE_SHOWING_CONFIRM' as AIEmployeeType,
    name: 'Casey - Showing Coordinator',
    description: 'Confirms property showings 24 hours and 2 hours before. Handles rescheduling and provides property access instructions.',
    capabilities: [
      'Showing confirmation calls/texts',
      'Reschedule handling',
      'Access instructions delivery',
      'Feedback collection post-showing',
      'No-show follow-up',
      'Hot buyer escalation'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 3,
    triggers: ['showing_24h_before', 'showing_2h_before', 'showing_completed'],
    requiredData: ['showingId', 'buyerPhone', 'propertyAddress']
  },

  RE_SPHERE_NURTURE: {
    type: 'RE_SPHERE_NURTURE' as AIEmployeeType,
    name: 'Morgan - Sphere of Influence Manager',
    description: 'Maintains relationships with past clients and sphere of influence. Sends market updates, home anniversary cards, and referral requests.',
    capabilities: [
      'Home anniversary tracking',
      'Market update personalization',
      'Referral request campaigns',
      'Holiday/birthday outreach',
      'Home value updates',
      'Neighborhood sold alerts',
      'Review request automation'
    ],
    voiceEnabled: false,
    defaultPriority: 'LOW',
    estimatedDuration: 5,
    triggers: ['home_anniversary', 'birthday', 'neighborhood_sale', 'quarterly_touch'],
    requiredData: ['contactId', 'relationshipType']
  },

  RE_WEEKLY_SNAPSHOT: {
    type: 'RE_WEEKLY_SNAPSHOT' as AIEmployeeType,
    name: 'Riley - Weekly Report Generator',
    description: 'Creates weekly market snapshot reports with AI-generated insights. Perfect for social media and email newsletters.',
    capabilities: [
      'MLS data aggregation',
      'Price trend analysis',
      'Inventory level tracking',
      'Days on market metrics',
      'AI insight generation',
      'Social media caption creation',
      'Email newsletter formatting',
      'Gamma slide generation'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 15,
    triggers: ['weekly_schedule', 'manual_request'],
    requiredData: ['region', 'dateRange']
  },

  RE_MONTHLY_REPORT: {
    type: 'RE_MONTHLY_REPORT' as AIEmployeeType,
    name: 'Drew - Monthly Analyst',
    description: 'Generates comprehensive monthly market reports with buyer/seller insights, predictions, and actionable recommendations.',
    capabilities: [
      'Month-over-month comparisons',
      'Year-over-year analysis',
      'Buyer market insights',
      'Seller market insights',
      'Price predictions (with confidence)',
      'Neighborhood breakdowns',
      'Professional PDF generation',
      'Client distribution automation'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 30,
    triggers: ['monthly_schedule', 'manual_request'],
    requiredData: ['region', 'month']
  },

  RE_ANNUAL_REVIEW: {
    type: 'RE_ANNUAL_REVIEW' as AIEmployeeType,
    name: 'Avery - Annual Review Specialist',
    description: 'Creates year-in-review market reports perfect for Q1 marketing. Includes predictions and strategic recommendations.',
    capabilities: [
      'Full year data analysis',
      'Seasonal trend identification',
      'Market cycle positioning',
      'Next year predictions',
      'Investment opportunity highlights',
      'Comprehensive PDF reports',
      'Presentation deck creation'
    ],
    voiceEnabled: false,
    defaultPriority: 'LOW',
    estimatedDuration: 60,
    triggers: ['annual_schedule', 'manual_request'],
    requiredData: ['region', 'year']
  },

  RE_STALE_DIAGNOSTIC: {
    type: 'RE_STALE_DIAGNOSTIC' as AIEmployeeType,
    name: 'Quinn - Listing Diagnostic Expert',
    description: 'Analyzes listings that haven\'t sold after 21+ days. Identifies issues and generates action plans with scripts for seller conversations.',
    capabilities: [
      'Pricing analysis vs. comps',
      'Photo quality assessment',
      'Description optimization',
      'Showing activity analysis',
      'Feedback pattern detection',
      'Action plan generation',
      'Seller conversation scripts',
      'Price reduction recommendations'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 20,
    triggers: ['listing_21_days', 'listing_45_days', 'no_showings_7_days'],
    requiredData: ['propertyId', 'daysOnMarket']
  },

  RE_LISTING_PRESENTATION: {
    type: 'RE_LISTING_PRESENTATION' as AIEmployeeType,
    name: 'Blake - Presentation Builder',
    description: 'Creates stunning listing presentations with CMAs, marketing plans, and personalized value propositions.',
    capabilities: [
      'CMA generation',
      'Marketing plan creation',
      'Pricing strategy options',
      'Timeline visualization',
      'Competitor analysis',
      'Objection handling FAQ',
      'Gamma slide deck creation',
      'PDF export'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 25,
    triggers: ['listing_appointment_scheduled', 'manual_request'],
    requiredData: ['propertyAddress', 'sellerName']
  }
};

/**
 * Get employee config by type
 */
export function getREEmployeeConfig(type: AIEmployeeType): REEmployeeConfig | null {
  const key = type as string;
  return RE_EMPLOYEE_CONFIGS[key] || null;
}

/**
 * Get all RE employee types
 */
export function getAllREEmployeeTypes(): AIEmployeeType[] {
  return Object.keys(RE_EMPLOYEE_CONFIGS) as AIEmployeeType[];
}

/**
 * Check if an employee type is a Real Estate type
 */
export function isREEmployeeType(type: AIEmployeeType): boolean {
  return type.toString().startsWith('RE_');
}
