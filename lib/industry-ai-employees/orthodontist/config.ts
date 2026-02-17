/**
 * Orthodontist Industry AI Employee Configurations
 * Specialized for orthodontic practices: appointments, patient coordination, treatment, billing
 */

import type { IndustryEmployeeConfig } from '../types';

export const ORTHODONTIST_EMPLOYEE_CONFIGS: Record<string, IndustryEmployeeConfig> = {
  APPOINTMENT_SCHEDULER: {
    type: 'APPOINTMENT_SCHEDULER',
    name: 'Sarah',
    title: 'Appointment Coordinator',
    description: 'Schedules and confirms orthodontic appointments',
    fullDescription: 'Handles new patient scheduling, adjustment appointments, and rescheduling. Sends reminders and manages the practice calendar.',
    capabilities: ['Appointment booking', 'Confirmations', 'Rescheduling', 'Reminders', 'Adjustment scheduling'],
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
    description: 'New patient intake and consultation coordination',
    fullDescription: 'Guides new patients through intake, collects health history, explains consultation process, and coordinates with clinical staff.',
    capabilities: ['Intake coordination', 'Health history', 'Consultation prep', 'Insurance pre-verification', 'Patient orientation'],
    voiceEnabled: true,
    defaultPriority: 'HIGH',
    category: 'intake',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    icon: 'Users',
  },
  TREATMENT_COORDINATOR: {
    type: 'TREATMENT_COORDINATOR',
    name: 'Jennifer',
    title: 'Treatment Coordinator',
    description: 'Treatment plan follow-up and brace/aligner care',
    fullDescription: 'Follows up on treatment plans, answers questions about braces/aligners, schedules adjustment appointments, and helps patients with care instructions.',
    capabilities: ['Treatment plan follow-up', 'Care instructions', 'Adjustment scheduling', 'Retainer follow-up', 'Emergency coordination'],
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
    fullDescription: 'Handles insurance verification for orthodontics, payment plans, and billing questions. Coordinates with insurance companies and explains coverage.',
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
