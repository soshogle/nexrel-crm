/**
 * Dental Workflow Extensions
 * Adds dental-specific triggers and actions to the workflow system
 */

export const DENTAL_CLINICAL_TRIGGERS = [
  'TREATMENT_PLAN_CREATED',
  'TREATMENT_PLAN_APPROVED',
  'PROCEDURE_COMPLETED',
  'XRAY_UPLOADED',
  'ODONTOGRAM_UPDATED',
  'PERIODONTAL_CHART_COMPLETED',
  'PATIENT_CHECKED_IN',
  'TREATMENT_MILESTONE_REACHED',
  'CLINICAL_NOTE_CREATED',
] as const;

export const DENTAL_ADMIN_TRIGGERS = [
  'APPOINTMENT_SCHEDULED',
  'APPOINTMENT_COMPLETED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_NO_SHOW',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',
  'INSURANCE_CLAIM_SUBMITTED',
  'INSURANCE_CLAIM_APPROVED',
  'INSURANCE_CLAIM_REJECTED',
  'FORM_SUBMITTED',
  'LAB_ORDER_CREATED',
  'LAB_ORDER_RECEIVED',
  'DAILY_PRODUCTION_TARGET_MET',
  'DAILY_PRODUCTION_TARGET_MISSED',
  'PATIENT_REGISTERED',
  'INCOMING_CALL',
  'CALL_COMPLETED',
  'MISSED_CALL',
] as const;

export const DENTAL_CLINICAL_ACTIONS = [
  'CREATE_TREATMENT_PLAN',
  'UPDATE_ODONTOGRAM',
  'SCHEDULE_FOLLOWUP_APPOINTMENT',
  'SEND_TREATMENT_UPDATE_TO_PATIENT',
  'CREATE_CLINICAL_NOTE',
  'REQUEST_XRAY_REVIEW',
  'GENERATE_TREATMENT_REPORT',
  'UPDATE_TREATMENT_PLAN',
  'LOG_PROCEDURE',
] as const;

export const DENTAL_ADMIN_ACTIONS = [
  'SEND_APPOINTMENT_REMINDER',
  'PROCESS_PAYMENT',
  'SUBMIT_INSURANCE_CLAIM',
  'GENERATE_INVOICE',
  'UPDATE_PATIENT_INFO',
  'CREATE_LAB_ORDER',
  'GENERATE_PRODUCTION_REPORT',
  'NOTIFY_TEAM_MEMBER',
  'RESCHEDULE_APPOINTMENT',
  'SEND_BILLING_REMINDER',
  'UPDATE_APPOINTMENT_STATUS',
  'MAKE_PHONE_CALL',
  'SEND_SMS',
  'CREATE_CALL_NOTE',
  'SCHEDULE_CALLBACK',
] as const;

export type DentalClinicalTrigger = typeof DENTAL_CLINICAL_TRIGGERS[number];
export type DentalAdminTrigger = typeof DENTAL_ADMIN_TRIGGERS[number];
export type DentalClinicalAction = typeof DENTAL_CLINICAL_ACTIONS[number];
export type DentalAdminAction = typeof DENTAL_ADMIN_ACTIONS[number];

export interface DentalWorkflowContext {
  role?: 'practitioner' | 'admin_assistant' | 'practice_owner' | 'hybrid';
  targetRole?: 'practitioner' | 'admin_assistant' | 'both';
  visibleToRoles?: ('practitioner' | 'admin_assistant')[];
}

export const DENTAL_WORKFLOW_TEMPLATES = {
  clinical: [
    {
      name: 'New Patient Onboarding (Clinical)',
      description: 'Automate clinical tasks when a new patient registers',
      trigger: 'PATIENT_REGISTERED',
      actions: [
        { type: 'CREATE_TREATMENT_PLAN', delayMinutes: 0 },
        { type: 'SCHEDULE_FOLLOWUP_APPOINTMENT', delayMinutes: 1440 }, // 1 day
        { type: 'SEND_TREATMENT_UPDATE_TO_PATIENT', delayMinutes: 2880 }, // 2 days
      ],
    },
    {
      name: 'Treatment Progress Tracking',
      description: 'Track treatment milestones and send updates',
      trigger: 'PROCEDURE_COMPLETED',
      actions: [
        { type: 'UPDATE_TREATMENT_PLAN', delayMinutes: 0 },
        { type: 'SEND_TREATMENT_UPDATE_TO_PATIENT', delayMinutes: 60 },
        { type: 'SCHEDULE_FOLLOWUP_APPOINTMENT', delayMinutes: 10080 }, // 1 week
      ],
    },
    {
      name: 'Retainer Reminders',
      description: 'Send retainer care reminders after treatment completion',
      trigger: 'TREATMENT_MILESTONE_REACHED',
      actions: [
        { type: 'SEND_TREATMENT_UPDATE_TO_PATIENT', delayMinutes: 0 },
        { type: 'SCHEDULE_FOLLOWUP_APPOINTMENT', delayMinutes: 43200 }, // 30 days
      ],
    },
  ],
  admin: [
    {
      name: 'Appointment Management',
      description: 'Automate appointment confirmations and reminders',
      trigger: 'APPOINTMENT_SCHEDULED',
      actions: [
        { type: 'SEND_APPOINTMENT_REMINDER', delayMinutes: 10080 }, // 1 week before
        { type: 'SEND_APPOINTMENT_REMINDER', delayMinutes: 1440 }, // 1 day before
      ],
    },
    {
      name: 'Payment Processing',
      description: 'Automate payment processing and invoicing',
      trigger: 'TREATMENT_PLAN_APPROVED',
      actions: [
        { type: 'GENERATE_INVOICE', delayMinutes: 0 },
        { type: 'PROCESS_PAYMENT', delayMinutes: 1440 }, // 1 day
        { type: 'SEND_BILLING_REMINDER', delayMinutes: 10080 }, // 1 week if not paid
      ],
    },
    {
      name: 'Insurance Claim Workflow',
      description: 'Automate insurance claim submission and tracking',
      trigger: 'PROCEDURE_COMPLETED',
      actions: [
        { type: 'SUBMIT_INSURANCE_CLAIM', delayMinutes: 0 },
        { type: 'NOTIFY_TEAM_MEMBER', delayMinutes: 0 },
      ],
    },
    {
      name: 'Daily Production Report',
      description: 'Generate and send daily production reports',
      trigger: 'DAILY_PRODUCTION_TARGET_MET',
      actions: [
        { type: 'GENERATE_PRODUCTION_REPORT', delayMinutes: 0 },
        { type: 'NOTIFY_TEAM_MEMBER', delayMinutes: 0 },
      ],
    },
  ],
  calls: [
    {
      name: 'Incoming Call - Patient Follow-up',
      description: 'Automatically follow up after patient calls',
      trigger: 'INCOMING_CALL',
      actions: [
        { type: 'CREATE_CALL_NOTE', delayMinutes: 0 },
        { type: 'SEND_SMS', delayMinutes: 5 }, // Thank you message
        { type: 'SCHEDULE_CALLBACK', delayMinutes: 1440 }, // Schedule callback if needed (1 day)
      ],
    },
    {
      name: 'Appointment Reminder Call',
      description: 'Call patients to remind them of upcoming appointments',
      trigger: 'APPOINTMENT_SCHEDULED',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 10080 }, // 1 week before
        { type: 'SEND_SMS', delayMinutes: 10085 }, // SMS backup if call fails
        { type: 'MAKE_PHONE_CALL', delayMinutes: 1440 }, // 1 day before
      ],
    },
    {
      name: 'Post-Appointment Follow-up Call',
      description: 'Call patients after appointment to check on recovery',
      trigger: 'APPOINTMENT_COMPLETED',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 1440 }, // 1 day after
        { type: 'CREATE_CALL_NOTE', delayMinutes: 1445 },
        { type: 'SEND_SMS', delayMinutes: 1440 }, // Alternative if call not answered
      ],
    },
    {
      name: 'Missed Appointment Follow-up',
      description: 'Call patients who missed their appointment',
      trigger: 'APPOINTMENT_NO_SHOW',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 60 }, // 1 hour after missed appointment
        { type: 'SEND_SMS', delayMinutes: 65 }, // SMS follow-up
        { type: 'RESCHEDULE_APPOINTMENT', delayMinutes: 1440 }, // Try to reschedule next day
      ],
    },
    {
      name: 'Treatment Plan Discussion Call',
      description: 'Call patients to discuss treatment plans',
      trigger: 'TREATMENT_PLAN_CREATED',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 0 }, // Immediate call
        { type: 'SEND_SMS', delayMinutes: 5 }, // SMS with treatment plan link
        { type: 'SCHEDULE_CALLBACK', delayMinutes: 1440 }, // Follow-up if needed
      ],
    },
    {
      name: 'Emergency Call Handling',
      description: 'Handle emergency calls with immediate response',
      trigger: 'INCOMING_CALL',
      actions: [
        { type: 'CREATE_CALL_NOTE', delayMinutes: 0 },
        { type: 'NOTIFY_TEAM_MEMBER', delayMinutes: 0 }, // Alert staff
        { type: 'SCHEDULE_APPOINTMENT', delayMinutes: 0 }, // Schedule urgent appointment
      ],
    },
    {
      name: 'Post-Procedure Check-in Call',
      description: 'Call patients after procedures to check recovery',
      trigger: 'PROCEDURE_COMPLETED',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 1440 }, // 1 day after
        { type: 'CREATE_CALL_NOTE', delayMinutes: 1445 },
        { type: 'MAKE_PHONE_CALL', delayMinutes: 4320 }, // 3 days follow-up
      ],
    },
    {
      name: 'Payment Reminder Call',
      description: 'Call patients with outstanding balances',
      trigger: 'PAYMENT_FAILED',
      actions: [
        { type: 'MAKE_PHONE_CALL', delayMinutes: 0 },
        { type: 'SEND_SMS', delayMinutes: 5 }, // SMS with payment link
        { type: 'MAKE_PHONE_CALL', delayMinutes: 1440 }, // Follow-up call
      ],
    },
  ],
};
