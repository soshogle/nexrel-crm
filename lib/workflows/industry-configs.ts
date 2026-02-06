/**
 * Industry Configuration System
 * Defines task types, AI agents, templates, and integrations for each industry
 */

import { Industry } from '@prisma/client';

export interface IndustryTaskType {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export interface IndustryAIAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  description: string;
}

export interface IndustryWorkflowTemplate {
  id: string;
  name: string;
  description: string;
  workflowType: string;
  tasks: Array<{
    name: string;
    description: string;
    taskType: string;
    agentName?: string;
    delayValue: number;
    delayUnit: 'MINUTES' | 'HOURS' | 'DAYS';
    isHITL: boolean;
    displayOrder: number;
  }>;
}

export interface IndustryConfig {
  industry: Industry;
  taskTypes: IndustryTaskType[];
  aiAgents: IndustryAIAgent[];
  templates: IndustryWorkflowTemplate[];
  fieldLabels: {
    contact: string; // "Patient", "Customer", "Lead", etc.
    deal: string; // "Deal", "Project", "Order", etc.
  };
  integrations: string[]; // ["Docpen", "Calendar", "POS", etc.]
}

// ==========================================
// MEDICAL INDUSTRY CONFIG
// ==========================================

export const MEDICAL_CONFIG: IndustryConfig = {
  industry: 'MEDICAL',
  taskTypes: [
    { value: 'LEAD_RESEARCH', label: 'Lead Research', icon: '🔍', color: '#3B82F6', description: 'Research lead information' },
    { value: 'PATIENT_RESEARCH', label: 'Patient Research', icon: '👤', color: '#10B981', description: 'Research patient history and preferences' },
    { value: 'APPOINTMENT_BOOKING', label: 'Appointment Booking', icon: '📅', color: '#8B5CF6', description: 'Schedule patient appointment' },
    { value: 'APPOINTMENT_REMINDER', label: 'Appointment Reminder', icon: '⏰', color: '#F59E0B', description: 'Send appointment reminder' },
    { value: 'PRESCRIPTION_REMINDER', label: 'Prescription Reminder', icon: '💊', color: '#EF4444', description: 'Remind patient about prescriptions' },
    { value: 'TEST_RESULTS_NOTIFICATION', label: 'Test Results', icon: '📋', color: '#06B6D4', description: 'Notify patient of test results' },
    { value: 'REFERRAL_COORDINATION', label: 'Referral Coordination', icon: '🔄', color: '#EC4899', description: 'Coordinate specialist referral' },
    { value: 'FOLLOW_UP_CALL', label: 'Follow-up Call', icon: '📞', color: '#14B8A6', description: 'Follow-up with patient' },
    { value: 'PATIENT_ONBOARDING', label: 'Patient Onboarding', icon: '🎯', color: '#6366F1', description: 'Onboard new patient' },
    { value: 'POST_VISIT_FOLLOWUP', label: 'Post-Visit Follow-up', icon: '✅', color: '#84CC16', description: 'Follow up after visit' },
    { value: 'INSURANCE_VERIFICATION', label: 'Insurance Verification', icon: '🛡️', color: '#F97316', description: 'Verify insurance coverage' },
    { value: 'CUSTOM', label: 'Custom Task', icon: '⚙️', color: '#6B7280', description: 'Custom workflow task' },
  ],
  aiAgents: [
    { id: 'appointment_scheduler', name: 'Sarah', role: 'Appointment Scheduler', color: '#FF6B6B', description: 'Handles appointment booking and scheduling' },
    { id: 'patient_coordinator', name: 'Michael', role: 'Patient Coordinator', color: '#4ECDC4', description: 'Manages patient communication and coordination' },
    { id: 'referral_specialist', name: 'Jessica', role: 'Referral Specialist', color: '#45B7D1', description: 'Coordinates specialist referrals' },
    { id: 'prescription_manager', name: 'Alex', role: 'Prescription Manager', color: '#96CEB4', description: 'Manages prescription reminders and refills' },
    { id: 'insurance_verifier', name: 'Emma', role: 'Insurance Verifier', color: '#FFEAA7', description: 'Verifies insurance coverage' },
    { id: 'follow_up_coordinator', name: 'David', role: 'Follow-up Coordinator', color: '#DDA0DD', description: 'Coordinates post-visit follow-ups' },
  ],
  templates: [
    {
      id: 'patient-onboarding',
      name: 'Patient Onboarding',
      description: 'Complete patient onboarding workflow',
      workflowType: 'PATIENT_ONBOARDING',
      tasks: [
        { name: 'Research Patient', taskType: 'PATIENT_RESEARCH', description: 'Research patient history', delayValue: 0, delayUnit: 'MINUTES', isHITL: false, displayOrder: 1 },
        { name: 'Verify Insurance', taskType: 'INSURANCE_VERIFICATION', description: 'Verify insurance coverage', delayValue: 30, delayUnit: 'MINUTES', isHITL: true, displayOrder: 2 },
        { name: 'Schedule Initial Appointment', taskType: 'APPOINTMENT_BOOKING', description: 'Book first appointment', delayValue: 1, delayUnit: 'HOURS', isHITL: false, displayOrder: 3 },
        { name: 'Send Welcome Email', taskType: 'CUSTOM', description: 'Send welcome information', delayValue: 2, delayUnit: 'HOURS', isHITL: false, displayOrder: 4 },
      ],
    },
    {
      id: 'appointment-reminder',
      name: 'Appointment Reminder Sequence',
      description: 'Automated appointment reminders',
      workflowType: 'APPOINTMENT_REMINDER_SEQUENCE',
      tasks: [
        { name: 'Send Reminder (3 days)', taskType: 'APPOINTMENT_REMINDER', description: 'First reminder', delayValue: 3, delayUnit: 'DAYS', isHITL: false, displayOrder: 1 },
        { name: 'Send Reminder (1 day)', taskType: 'APPOINTMENT_REMINDER', description: 'Second reminder', delayValue: 1, delayUnit: 'DAYS', isHITL: false, displayOrder: 2 },
        { name: 'Confirm Appointment', taskType: 'FOLLOW_UP_CALL', description: 'Final confirmation call', delayValue: 2, delayUnit: 'HOURS', isHITL: false, displayOrder: 3 },
      ],
    },
  ],
  fieldLabels: {
    contact: 'Patient',
    deal: 'Appointment',
  },
  integrations: ['Docpen', 'Calendar', 'Pharmacy Systems', 'Insurance APIs'],
};

// ==========================================
// RESTAURANT INDUSTRY CONFIG
// ==========================================

export const RESTAURANT_CONFIG: IndustryConfig = {
  industry: 'RESTAURANT',
  taskTypes: [
    { value: 'LEAD_RESEARCH', label: 'Lead Research', icon: '🔍', color: '#3B82F6', description: 'Research lead information' },
    { value: 'CUSTOMER_RESEARCH', label: 'Customer Research', icon: '👤', color: '#10B981', description: 'Research customer preferences' },
    { value: 'RESERVATION_CONFIRMATION', label: 'Reservation Confirmation', icon: '📅', color: '#8B5CF6', description: 'Confirm reservation' },
    { value: 'RESERVATION_REMINDER', label: 'Reservation Reminder', icon: '⏰', color: '#F59E0B', description: 'Remind about reservation' },
    { value: 'ORDER_TRACKING', label: 'Order Tracking', icon: '📦', color: '#EF4444', description: 'Track order status' },
    { value: 'MENU_RECOMMENDATION', label: 'Menu Recommendation', icon: '🍽️', color: '#06B6D4', description: 'Recommend menu items' },
    { value: 'LOYALTY_POINTS_UPDATE', label: 'Loyalty Points', icon: '⭐', color: '#EC4899', description: 'Update loyalty points' },
    { value: 'FEEDBACK_REQUEST', label: 'Feedback Request', icon: '💬', color: '#14B8A6', description: 'Request customer feedback' },
    { value: 'SPECIAL_OFFER_NOTIFICATION', label: 'Special Offer', icon: '🎁', color: '#6366F1', description: 'Send special offers' },
    { value: 'BIRTHDAY_GREETING', label: 'Birthday Greeting', icon: '🎂', color: '#84CC16', description: 'Send birthday greeting' },
    { value: 'CUSTOM', label: 'Custom Task', icon: '⚙️', color: '#6B7280', description: 'Custom workflow task' },
  ],
  aiAgents: [
    { id: 'reservation_coordinator', name: 'Sarah', role: 'Reservation Coordinator', color: '#FF6B6B', description: 'Manages reservations' },
    { id: 'order_tracker', name: 'Michael', role: 'Order Tracker', color: '#4ECDC4', description: 'Tracks and updates orders' },
    { id: 'loyalty_manager', name: 'Jessica', role: 'Loyalty Manager', color: '#45B7D1', description: 'Manages loyalty program' },
    { id: 'menu_advisor', name: 'Alex', role: 'Menu Advisor', color: '#96CEB4', description: 'Provides menu recommendations' },
    { id: 'customer_service', name: 'Emma', role: 'Customer Service Specialist', color: '#FFEAA7', description: 'Handles customer service' },
    { id: 'marketing_coordinator', name: 'David', role: 'Marketing Coordinator', color: '#DDA0DD', description: 'Manages marketing campaigns' },
  ],
  templates: [
    {
      id: 'new-customer-welcome',
      name: 'New Customer Welcome',
      description: 'Welcome new customers',
      workflowType: 'NEW_CUSTOMER_WELCOME',
      tasks: [
        { name: 'Research Customer', taskType: 'CUSTOMER_RESEARCH', description: 'Research preferences', delayValue: 0, delayUnit: 'MINUTES', isHITL: false, displayOrder: 1 },
        { name: 'Send Welcome Email', taskType: 'CUSTOM', description: 'Welcome message', delayValue: 1, delayUnit: 'HOURS', isHITL: false, displayOrder: 2 },
        { name: 'Enroll in Loyalty', taskType: 'LOYALTY_POINTS_UPDATE', description: 'Enroll in program', delayValue: 2, delayUnit: 'HOURS', isHITL: false, displayOrder: 3 },
      ],
    },
  ],
  fieldLabels: {
    contact: 'Customer',
    deal: 'Order',
  },
  integrations: ['POS Systems', 'Reservation Systems', 'Delivery Platforms', 'Loyalty APIs'],
};

// ==========================================
// CONSTRUCTION INDUSTRY CONFIG
// ==========================================

export const CONSTRUCTION_CONFIG: IndustryConfig = {
  industry: 'CONSTRUCTION',
  taskTypes: [
    { value: 'LEAD_RESEARCH', label: 'Lead Research', icon: '🔍', color: '#3B82F6', description: 'Research lead information' },
    { value: 'PROJECT_RESEARCH', label: 'Project Research', icon: '🏗️', color: '#10B981', description: 'Research project requirements' },
    { value: 'QUOTE_GENERATION', label: 'Quote Generation', icon: '💰', color: '#8B5CF6', description: 'Generate project quote' },
    { value: 'QUOTE_FOLLOWUP', label: 'Quote Follow-up', icon: '📞', color: '#F59E0B', description: 'Follow up on quote' },
    { value: 'PERMIT_TRACKING', label: 'Permit Tracking', icon: '📋', color: '#EF4444', description: 'Track permit status' },
    { value: 'INSPECTION_SCHEDULING', label: 'Inspection Scheduling', icon: '🔍', color: '#06B6D4', description: 'Schedule inspections' },
    { value: 'MATERIAL_ORDERING', label: 'Material Ordering', icon: '📦', color: '#EC4899', description: 'Order materials' },
    { value: 'PROGRESS_UPDATE', label: 'Progress Update', icon: '📊', color: '#14B8A6', description: 'Update project progress' },
    { value: 'PAYMENT_REMINDER', label: 'Payment Reminder', icon: '💳', color: '#6366F1', description: 'Remind about payments' },
    { value: 'PROJECT_COMPLETION', label: 'Project Completion', icon: '✅', color: '#84CC16', description: 'Complete project' },
    { value: 'CUSTOM', label: 'Custom Task', icon: '⚙️', color: '#6B7280', description: 'Custom workflow task' },
  ],
  aiAgents: [
    { id: 'quote_specialist', name: 'Sarah', role: 'Quote Specialist', color: '#FF6B6B', description: 'Generates project quotes' },
    { id: 'permit_coordinator', name: 'Michael', role: 'Permit Coordinator', color: '#4ECDC4', description: 'Tracks permits' },
    { id: 'inspection_scheduler', name: 'Jessica', role: 'Inspection Scheduler', color: '#45B7D1', description: 'Schedules inspections' },
    { id: 'material_manager', name: 'Alex', role: 'Material Manager', color: '#96CEB4', description: 'Orders materials' },
    { id: 'project_coordinator', name: 'Emma', role: 'Project Coordinator', color: '#FFEAA7', description: 'Coordinates projects' },
    { id: 'client_communicator', name: 'David', role: 'Client Communicator', color: '#DDA0DD', description: 'Communicates with clients' },
  ],
  templates: [
    {
      id: 'lead-qualification',
      name: 'Lead Qualification',
      description: 'Qualify construction leads',
      workflowType: 'LEAD_QUALIFICATION',
      tasks: [
        { name: 'Research Lead', taskType: 'LEAD_RESEARCH', description: 'Research lead', delayValue: 0, delayUnit: 'MINUTES', isHITL: false, displayOrder: 1 },
        { name: 'Generate Quote', taskType: 'QUOTE_GENERATION', description: 'Create quote', delayValue: 1, delayUnit: 'HOURS', isHITL: true, displayOrder: 2 },
        { name: 'Follow-up Call', taskType: 'QUOTE_FOLLOWUP', description: 'Follow up', delayValue: 2, delayUnit: 'DAYS', isHITL: false, displayOrder: 3 },
      ],
    },
  ],
  fieldLabels: {
    contact: 'Client',
    deal: 'Project',
  },
  integrations: ['Permit Databases', 'Material Supplier APIs', 'Inspection Systems', 'Project Management Tools'],
};

// ==========================================
// INDUSTRY CONFIG MAP
// ==========================================

export const INDUSTRY_CONFIGS: Record<Industry, IndustryConfig> = {
  MEDICAL: MEDICAL_CONFIG,
  RESTAURANT: RESTAURANT_CONFIG,
  CONSTRUCTION: CONSTRUCTION_CONFIG,
  DENTIST: MEDICAL_CONFIG, // Similar to Medical
  MEDICAL_SPA: MEDICAL_CONFIG, // Similar to Medical
  OPTOMETRIST: MEDICAL_CONFIG, // Similar to Medical
  HEALTH_CLINIC: MEDICAL_CONFIG, // Similar to Medical
  HOSPITAL: MEDICAL_CONFIG, // Similar to Medical
  TECHNOLOGY: RESTAURANT_CONFIG, // Similar structure, will customize later
  SPORTS_CLUB: RESTAURANT_CONFIG, // Similar structure, will customize later
  REAL_ESTATE: MEDICAL_CONFIG, // Placeholder - Real Estate has its own system
};

/**
 * Get industry configuration
 */
export function getIndustryConfig(industry: Industry | null | undefined): IndustryConfig | null {
  if (!industry || industry === 'REAL_ESTATE') {
    return null; // Real Estate uses its own system
  }
  return INDUSTRY_CONFIGS[industry] || null;
}

/**
 * Get task type icon
 */
export function getTaskTypeIcon(industry: Industry | null | undefined, taskType: string): string {
  const config = getIndustryConfig(industry);
  if (!config) return '⚙️';
  const taskTypeConfig = config.taskTypes.find(t => t.value === taskType);
  return taskTypeConfig?.icon || '⚙️';
}

/**
 * Get task type color
 */
export function getTaskTypeColor(industry: Industry | null | undefined, taskType: string): string {
  const config = getIndustryConfig(industry);
  if (!config) return '#6B7280';
  const taskTypeConfig = config.taskTypes.find(t => t.value === taskType);
  return taskTypeConfig?.color || '#6B7280';
}

/**
 * Get AI agent by ID
 */
export function getAIAgent(industry: Industry | null | undefined, agentId: string): IndustryAIAgent | null {
  const config = getIndustryConfig(industry);
  if (!config) return null;
  return config.aiAgents.find(a => a.id === agentId) || null;
}
