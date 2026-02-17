/**
 * Construction Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const CONSTRUCTION_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  LEAD_QUALIFIER: {
    type: 'LEAD_QUALIFIER',
    name: 'Sarah',
    title: 'Lead Qualifier',
    description: 'Qualifies inbound leads and schedules estimates',
    fullDescription: 'Engages inbound leads, qualifies projects, and schedules estimate appointments.',
    capabilities: ['Lead qualification', 'Estimate scheduling', 'Project assessment', 'Sales handoff'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'sales',
    color: 'from-amber-600 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: 'Target',
  },
  ESTIMATE_FOLLOWUP: {
    type: 'ESTIMATE_FOLLOWUP',
    name: 'Michael',
    title: 'Estimate Follow-up Coordinator',
    description: 'Follows up on estimates and proposals',
    fullDescription: 'Follows up on sent estimates, answers questions, and schedules project kickoffs.',
    capabilities: ['Estimate follow-up', 'Proposal questions', 'Project scheduling', 'Contract coordination'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'sales',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'FileText',
  },
  PROJECT_COORDINATOR: {
    type: 'PROJECT_COORDINATOR',
    name: 'Jennifer',
    title: 'Project Coordinator',
    description: 'Schedules and coordinates active projects',
    fullDescription: 'Coordinates project schedules, handles change requests, and communicates with clients during projects.',
    capabilities: ['Schedule coordination', 'Change requests', 'Client communication', 'Progress updates'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'operations',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'Calendar',
  },
};
