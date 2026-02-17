/**
 * Medical Industry AI Employee Configurations
 * Specialized for medical practices: appointments, patient coordination, treatment follow-up, billing
 */

import type { IndustryEmployeeConfig } from '../types';

export const MEDICAL_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  APPOINTMENT_SCHEDULER: {
    type: 'APPOINTMENT_SCHEDULER',
    name: 'Sarah',
    title: 'Appointment Coordinator',
    description: 'Schedules and confirms medical appointments',
    fullDescription: 'Handles new patient scheduling, appointment confirmations, and rescheduling. Sends reminders and manages the practice calendar.',
    capabilities: ['Appointment booking', 'Confirmations', 'Rescheduling', 'Reminders', 'No-show follow-up'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'scheduling',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: 'Calendar',
  },
  PATIENT_COORDINATOR: {
    type: 'PATIENT_COORDINATOR',
    name: 'Michael',
    title: 'Patient Coordinator',
    description: 'New patient intake and coordination',
    fullDescription: 'Guides new patients through intake, collects health history, explains first-visit process, and coordinates with clinical staff.',
    capabilities: ['Intake coordination', 'Health history', 'First-visit prep', 'Insurance pre-verification', 'Patient orientation'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'intake',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'Users',
  },
  TREATMENT_FOLLOWUP: {
    type: 'TREATMENT_FOLLOWUP',
    name: 'Jennifer',
    title: 'Treatment Follow-up Coordinator',
    description: 'Follow-up on treatment plans and care coordination',
    fullDescription: 'Follows up on treatment plans, answers general questions about care, schedules follow-up appointments, and helps patients stay on track.',
    capabilities: ['Treatment follow-up', 'Care coordination', 'Follow-up scheduling', 'Medication reminders', 'Referral coordination'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'treatment',
    color: 'from-purple-500 to-violet-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: 'FileText',
  },
  BILLING_SPECIALIST: {
    type: 'BILLING_SPECIALIST',
    name: 'Emily',
    title: 'Billing Specialist',
    description: 'Insurance and payment coordination',
    fullDescription: 'Handles insurance verification, payment arrangements, and billing questions. Coordinates with insurance companies and explains coverage to patients.',
    capabilities: ['Insurance verification', 'Payment plans', 'Billing questions', 'Claims assistance', 'Financial arrangements'],
    voiceEnabled: true,
    defaultPriority: 'MEDIUM',
    category: 'billing',
    color: 'from-amber-500 to-yellow-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: 'CreditCard',
  },
};
