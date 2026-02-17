/**
 * Accounting Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const ACCOUNTING_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  APPOINTMENT_SCHEDULER: {
    type: 'APPOINTMENT_SCHEDULER',
    name: 'Sarah',
    title: 'Appointment Coordinator',
    description: 'Schedules client meetings and consultations',
    fullDescription: 'Schedules tax consultations, bookkeeping meetings, and client check-ins.',
    capabilities: ['Meeting scheduling', 'Consultation booking', 'Confirmations', 'Reminders'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'scheduling',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'Calendar',
  },
  TAX_INQUIRY: {
    type: 'TAX_INQUIRY',
    name: 'Michael',
    title: 'Tax Inquiry Coordinator',
    description: 'Handles tax season inquiries and document requests',
    fullDescription: 'Responds to tax-related inquiries, collects document requests, and schedules tax prep appointments.',
    capabilities: ['Tax inquiries', 'Document requests', 'Tax prep scheduling', 'Deadline reminders'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'tax',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'FileText',
  },
  CLIENT_FOLLOWUP: {
    type: 'CLIENT_FOLLOWUP',
    name: 'Jennifer',
    title: 'Client Follow-up Coordinator',
    description: 'Follow-up on deliverables and client retention',
    fullDescription: 'Follows up on deliverables, checks in with clients, and schedules recurring engagements.',
    capabilities: ['Deliverable follow-up', 'Client check-ins', 'Recurring engagement', 'Retention'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'client-services',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: 'Users',
  },
};
