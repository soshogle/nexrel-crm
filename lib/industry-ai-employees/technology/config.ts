/**
 * Technology Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const TECHNOLOGY_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  LEAD_QUALIFIER: {
    type: 'LEAD_QUALIFIER',
    name: 'Sarah',
    title: 'Lead Qualifier',
    description: 'Qualifies inbound leads and schedules demos',
    fullDescription: 'Engages inbound leads, qualifies fit, and schedules product demos or sales calls.',
    capabilities: ['Lead qualification', 'Demo scheduling', 'Needs assessment', 'Sales handoff'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'sales',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'Target',
  },
  APPOINTMENT_SCHEDULER: {
    type: 'APPOINTMENT_SCHEDULER',
    name: 'Michael',
    title: 'Appointment Coordinator',
    description: 'Schedules demos and meetings',
    fullDescription: 'Schedules product demos, discovery calls, and follow-up meetings.',
    capabilities: ['Demo scheduling', 'Meeting coordination', 'Calendar management', 'Reminders'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'scheduling',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'Calendar',
  },
  SUPPORT_FOLLOWUP: {
    type: 'SUPPORT_FOLLOWUP',
    name: 'Jennifer',
    title: 'Support Follow-up Coordinator',
    description: 'Follows up on support tickets and customer success',
    fullDescription: 'Follows up on support inquiries, checks satisfaction, and schedules success calls.',
    capabilities: ['Support follow-up', 'Satisfaction check', 'Success call scheduling', 'Escalation'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'support',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: 'Headphones',
  },
};
