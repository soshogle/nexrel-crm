/**
 * Yul Smile Orthodontist Workflow Templates
 * Based on "Workflows Yul Smile - drafting" document
 * 4 proprietary in-clinic workflows for orthodontic practices
 */

import type { IndustryWorkflowTemplate } from '@/lib/workflows/industry-configs';

export const ORTHODONTIST_WORKFLOW_TEMPLATES: IndustryWorkflowTemplate[] = [
  // 1. Patient Workflow: Admissions Specialist (Law 25 & Consents)
  {
    id: 'patient-admissions-law25-consents',
    name: 'Patient Admissions (Law 25 & Consents)',
    description:
      'Complete file and signed consents before the patient walks through the door. AI sends secure link D-2, patient fills Medical Questionnaire and signs Law 25 consent digitally. Staff alert if document missing day before.',
    workflowType: 'PATIENT_ADMISSIONS',
    tasks: [
      {
        name: 'Send secure link (D-2)',
        description: 'AI sends secure link via SMS/Email to patient when appointment is confirmed',
        taskType: 'SMS',
        agentName: 'Admissions Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 1,
      },
      {
        name: 'Patient completes forms',
        description: 'Patient fills Medical Questionnaire and signs Law 25 consent on mobile (external form)',
        taskType: 'CUSTOM',
        agentName: 'Admissions Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 2,
      },
      {
        name: 'Document sync check',
        description: 'Verify signed PDF is in patient file. If missing D-1, AI follows up automatically.',
        taskType: 'EMAIL',
        agentName: 'Admissions Specialist',
        delayValue: 1,
        delayUnit: 'DAYS',
        isHITL: false,
        displayOrder: 3,
      },
      {
        name: 'Staff alert if missing',
        description: 'If document still missing day before appointment, AI sends follow-up to patient',
        taskType: 'SMS',
        agentName: 'Admissions Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 4,
      },
    ],
  },

  // 2. Referrals Workflow: Referrals & Clinical Reports Specialist
  {
    id: 'referrals-clinical-reports',
    name: 'Referrals & Clinical Reports',
    description:
      'Process 15 referrals/day. AI reads referral PDF, extracts data, checks criteria (Age, Case Type). If incomplete, requests missing files. Books consultation, notifies referring dentist. Post-consultation: AI drafts formal Orthodontic Report Letter for doctor approval.',
    workflowType: 'REFERRALS_CLINICAL_REPORTS',
    tasks: [
      {
        name: 'Triage referral',
        description: 'AI reads referral PDF, extracts data, checks Age and Case Type criteria',
        taskType: 'CUSTOM',
        agentName: 'Referrals Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 1,
      },
      {
        name: 'Request missing files',
        description: 'If incomplete (e.g. missing Panorex), AI writes to dentist to request file',
        taskType: 'EMAIL',
        agentName: 'Referrals Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: true,
        displayOrder: 2,
      },
      {
        name: 'Book consultation',
        description: 'AI contacts patient via SMS to book consultation',
        taskType: 'SMS',
        agentName: 'Referrals Specialist',
        delayValue: 1,
        delayUnit: 'HOURS',
        isHITL: false,
        displayOrder: 3,
      },
      {
        name: 'Thank referring dentist',
        description: 'AI sends email: "Thank you Dr. X, we have taken charge of [Patient Name]"',
        taskType: 'EMAIL',
        agentName: 'Referrals Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 4,
      },
      {
        name: 'Draft orthodontic report',
        description: 'Post-consultation: AI drafts formal Orthodontic Report Letter from exam notes',
        taskType: 'CUSTOM',
        agentName: 'Referrals Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: true,
        displayOrder: 5,
      },
      {
        name: 'Send report to dentist',
        description: 'Doctor approves and letter is sent to referring dentist',
        taskType: 'EMAIL',
        agentName: 'Referrals Specialist',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 6,
      },
    ],
  },

  // 3. Financial Workflow: Treatment Coordinator Assistant
  {
    id: 'financial-treatment-coordinator',
    name: 'Financial Agreement (Treatment Coordinator)',
    description:
      'Sign the contract when emotion is high. Coordinator enters terms (Deposit, Monthly Payment), AI generates personalized Financial Agreement instantly. Patient signs on tablet or via mobile link. Copy to patient, copy archived.',
    workflowType: 'FINANCIAL_AGREEMENT',
    tasks: [
      {
        name: 'Generate financial agreement',
        description: 'AI generates personalized Financial Agreement from deposit and payment terms',
        taskType: 'CUSTOM',
        agentName: 'Treatment Coordinator',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 1,
      },
      {
        name: 'Send signing link',
        description: 'Patient signs on tablet or receives link on mobile to sign at home',
        taskType: 'SMS',
        agentName: 'Treatment Coordinator',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 2,
      },
      {
        name: 'Archive and send copy',
        description: 'Copy sent to patient, copy archived in file',
        taskType: 'EMAIL',
        agentName: 'Treatment Coordinator',
        delayValue: 0,
        delayUnit: 'MINUTES',
        isHITL: false,
        displayOrder: 3,
      },
    ],
  },

  // 4. Treatment Conversion Workflow: Treatment Conversion Specialist
  {
    id: 'treatment-conversion-specialist',
    name: 'Treatment Conversion (Undecided Patients)',
    description:
      'Convert "I\'ll think about it" / "I need to talk to my husband" patients. D+0: Digital Kit with treatment plan link. D+1: Spouse summary sheet. D+3: Finance options if deposit is hurdle. D+7: Soft close - "Active" or "Postpone" forces response.',
    workflowType: 'TREATMENT_CONVERSION',
    tasks: [
      {
        name: 'Digital Kit (1h later)',
        description:
          'Warm SMS: "Thank you for your visit! Here is the secure link to your Treatment Plan and Financial Agreement to review with a clear head."',
        taskType: 'SMS',
        agentName: 'Treatment Conversion Specialist',
        delayValue: 1,
        delayUnit: 'HOURS',
        isHITL: false,
        displayOrder: 1,
      },
      {
        name: 'Spouse summary (D+1)',
        description:
          'Email: "If discussing with your spouse, here is a short summary of clinical benefits and financing/insurance options."',
        taskType: 'EMAIL',
        agentName: 'Treatment Conversion Specialist',
        delayValue: 1,
        delayUnit: 'DAYS',
        isHITL: false,
        displayOrder: 2,
      },
      {
        name: 'Finance option (D+3)',
        description:
          'SMS: "If the initial deposit is a hurdle, did you know we can adjust the installments? Click here to see options."',
        taskType: 'SMS',
        agentName: 'Treatment Conversion Specialist',
        delayValue: 3,
        delayUnit: 'DAYS',
        isHITL: false,
        displayOrder: 3,
      },
      {
        name: 'Psychological close (D+7)',
        description:
          'Soft break-up SMS: "Dr. [Name] was asking if we should keep your file active or postpone? Just reply Active or Postpone."',
        taskType: 'SMS',
        agentName: 'Treatment Conversion Specialist',
        delayValue: 7,
        delayUnit: 'DAYS',
        isHITL: false,
        displayOrder: 4,
      },
    ],
  },
];

/** Enrollment trigger types for orthodontist workflows */
export type OrthodontistEnrollmentTrigger =
  | 'APPOINTMENT_CONFIRMED'
  | 'REFERRAL_CREATED'
  | 'REFERRAL_CONVERTED'
  | 'TREATMENT_ACCEPTED'
  | 'CONSULTATION_PENDING';

/** Map workflow template ID to its enrollment trigger(s) */
export const ORTHODONTIST_WORKFLOW_TRIGGERS: Record<
  string,
  OrthodontistEnrollmentTrigger[]
> = {
  'patient-admissions-law25-consents': ['APPOINTMENT_CONFIRMED'],
  'referrals-clinical-reports': ['REFERRAL_CONVERTED'],
  'financial-treatment-coordinator': ['TREATMENT_ACCEPTED'],
  'treatment-conversion-specialist': ['CONSULTATION_PENDING'],
};
