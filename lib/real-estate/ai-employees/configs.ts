/**
 * Real Estate AI Employee Configurations
 * Defines all RE AI employees and their capabilities
 */

import { REAIEmployeeType } from '@prisma/client';

export interface REEmployeeConfig {
  type: REAIEmployeeType;
  name: string;
  description: string;
  capabilities: string[];
  voiceEnabled: boolean;
  defaultPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedDuration: number;
  triggers: string[];
  requiredData: string[];
}

export const RE_EMPLOYEE_CONFIGS: Record<REAIEmployeeType, REEmployeeConfig> = {
  RE_SPEED_TO_LEAD: {
    type: 'RE_SPEED_TO_LEAD',
    name: 'Alex - Speed to Lead Specialist',
    description: 'Instantly responds to new inquiries within seconds. Makes immediate calls and sends personalized texts.',
    capabilities: [
      'Instant lead response (< 60 seconds)',
      'DNC verification before calling',
      'Personalized voice calls with AI',
      'SMS/Email follow-up sequences',
      'Lead qualification',
      'Appointment booking'
    ],
    voiceEnabled: true,
    defaultPriority: 'URGENT',
    estimatedDuration: 5,
    triggers: ['new_lead', 'web_inquiry'],
    requiredData: ['phone', 'name']
  },

  RE_FSBO_OUTREACH: {
    type: 'RE_FSBO_OUTREACH',
    name: 'Maya - FSBO Specialist',
    description: 'Reaches out to For Sale By Owner listings with consultative approach.',
    capabilities: [
      'FSBO monitoring',
      'DNC compliance',
      'Consultative scripts',
      'Free CMA offers',
      'Objection handling',
      'Follow-up scheduling'
    ],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 10,
    triggers: ['new_fsbo_listing', 'fsbo_price_drop'],
    requiredData: ['address', 'sellerPhone']
  },

  RE_EXPIRED_OUTREACH: {
    type: 'RE_EXPIRED_OUTREACH',
    name: 'Jordan - Expired Listing Hunter',
    description: 'Contacts owners of expired listings with empathy and fresh marketing strategy.',
    capabilities: [
      'Expired listing import',
      'Previous agent detection',
      'DNC verification',
      'Empathetic scripts',
      'Market analysis',
      'Pricing strategy'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 15,
    triggers: ['listing_expired', 'listing_withdrawn'],
    requiredData: ['ownerPhone', 'address']
  },

  RE_COLD_REACTIVATION: {
    type: 'RE_COLD_REACTIVATION',
    name: 'Sam - Lead Reactivation Expert',
    description: 'Re-engages cold leads who haven\'t responded in 30+ days.',
    capabilities: [
      'Cold lead identification',
      'Market update personalization',
      'New listing alerts',
      'Multi-channel outreach',
      'Re-qualification'
    ],
    voiceEnabled: true,
    defaultPriority: 'LOW',
    estimatedDuration: 8,
    triggers: ['lead_cold_30_days', 'lead_cold_90_days'],
    requiredData: ['leadId', 'lastContactDate']
  },

  RE_DOCUMENT_CHASER: {
    type: 'RE_DOCUMENT_CHASER',
    name: 'Taylor - Transaction Coordinator',
    description: 'Follows up on missing documents during transactions.',
    capabilities: [
      'Document tracking',
      'Deadline reminders',
      'E-signature requests',
      'Lender coordination',
      'Closing countdown'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 5,
    triggers: ['document_missing', 'deadline_approaching'],
    requiredData: ['transactionId', 'documentType']
  },

  RE_SHOWING_CONFIRM: {
    type: 'RE_SHOWING_CONFIRM',
    name: 'Casey - Showing Coordinator',
    description: 'Confirms property showings and handles rescheduling.',
    capabilities: [
      'Showing confirmations',
      'Reschedule handling',
      'Access instructions',
      'Feedback collection',
      'No-show follow-up'
    ],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    estimatedDuration: 3,
    triggers: ['showing_24h_before', 'showing_completed'],
    requiredData: ['showingId', 'buyerPhone']
  },

  RE_SPHERE_NURTURE: {
    type: 'RE_SPHERE_NURTURE',
    name: 'Morgan - Sphere Manager',
    description: 'Maintains relationships with past clients and sphere of influence.',
    capabilities: [
      'Home anniversary tracking',
      'Market updates',
      'Referral requests',
      'Holiday outreach',
      'Review requests'
    ],
    voiceEnabled: false,
    defaultPriority: 'LOW',
    estimatedDuration: 5,
    triggers: ['home_anniversary', 'quarterly_touch'],
    requiredData: ['contactId']
  },

  RE_BUYER_FOLLOWUP: {
    type: 'RE_BUYER_FOLLOWUP',
    name: 'Riley - Buyer Follow-up',
    description: 'Follows up with buyers after showings and keeps them engaged.',
    capabilities: [
      'Post-showing feedback',
      'New listing alerts',
      'Market updates',
      'Offer preparation',
      'Financing check-ins'
    ],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 5,
    triggers: ['showing_completed', 'new_match_listing'],
    requiredData: ['buyerId', 'criteria']
  },

  RE_MARKET_UPDATE: {
    type: 'RE_MARKET_UPDATE',
    name: 'Drew - Market Analyst',
    description: 'Generates market reports and updates for clients.',
    capabilities: [
      'Weekly snapshots',
      'Monthly reports',
      'Price trend analysis',
      'Inventory tracking',
      'Social media content'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 15,
    triggers: ['weekly_schedule', 'manual_request'],
    requiredData: ['region']
  },

  RE_STALE_DIAGNOSTIC: {
    type: 'RE_STALE_DIAGNOSTIC',
    name: 'Quinn - Listing Diagnostic',
    description: 'Analyzes listings that haven\'t sold and provides action plans.',
    capabilities: [
      'Pricing analysis',
      'Photo assessment',
      'Description review',
      'Showing analysis',
      'Action plan generation'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 20,
    triggers: ['listing_21_days', 'no_showings_7_days'],
    requiredData: ['propertyId', 'daysOnMarket']
  },

  RE_LISTING_BOOST: {
    type: 'RE_LISTING_BOOST',
    name: 'Blake - Listing Marketing',
    description: 'Boosts listing visibility through marketing campaigns.',
    capabilities: [
      'Social media posts',
      'Email blasts',
      'Open house promotion',
      'Price update alerts',
      'Just listed/sold campaigns'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 10,
    triggers: ['new_listing', 'price_reduction'],
    requiredData: ['propertyId']
  },

  RE_CMA_GENERATOR: {
    type: 'RE_CMA_GENERATOR',
    name: 'Avery - CMA Specialist',
    description: 'Creates comparative market analyses for listing presentations.',
    capabilities: [
      'CMA generation',
      'Comparable selection',
      'Price adjustments',
      'Market analysis',
      'PDF reports'
    ],
    voiceEnabled: false,
    defaultPriority: 'MEDIUM',
    estimatedDuration: 15,
    triggers: ['listing_appointment', 'manual_request'],
    requiredData: ['propertyAddress']
  }
};

/**
 * Get employee config by type
 */
export function getREEmployeeConfig(type: REAIEmployeeType): REEmployeeConfig | null {
  return RE_EMPLOYEE_CONFIGS[type] || null;
}

/**
 * Get all RE employee types
 */
export function getAllREEmployeeTypes(): REAIEmployeeType[] {
  return Object.keys(RE_EMPLOYEE_CONFIGS) as REAIEmployeeType[];
}

/**
 * Check if type is RE employee
 */
export function isREEmployeeType(type: string): type is REAIEmployeeType {
  return type in RE_EMPLOYEE_CONFIGS;
}
