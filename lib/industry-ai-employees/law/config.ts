/**
 * Law Industry AI Employee Configurations
 */

import type { IndustryEmployeeConfig } from '../types';

export const LAW_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  INTAKE_COORDINATOR: {
    type: 'INTAKE_COORDINATOR',
    name: 'Sarah',
    title: 'Intake Coordinator',
    description: 'Handles new client intake and case screening',
    fullDescription: 'Conducts initial intake, collects case details, and schedules consultations with attorneys.',
    capabilities: ['Intake screening', 'Case details', 'Consultation scheduling', 'Conflict check'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'intake',
    color: 'from-slate-600 to-slate-800',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
    icon: 'FileText',
  },
  APPOINTMENT_SCHEDULER: {
    type: 'APPOINTMENT_SCHEDULER',
    name: 'Michael',
    title: 'Appointment Coordinator',
    description: 'Schedules consultations and meetings',
    fullDescription: 'Schedules attorney consultations, client meetings, and court-related appointments.',
    capabilities: ['Consultation scheduling', 'Meeting coordination', 'Confirmations', 'Reminders'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'scheduling',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'Calendar',
  },
  CASE_FOLLOWUP: {
    type: 'CASE_FOLLOWUP',
    name: 'Jennifer',
    title: 'Case Follow-up Coordinator',
    description: 'Follow-up on case status and document requests',
    fullDescription: 'Follows up on case progress, collects documents, and coordinates with clients.',
    capabilities: ['Case status updates', 'Document collection', 'Client coordination', 'Scheduling'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'case-management',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: 'Users',
  },
};
