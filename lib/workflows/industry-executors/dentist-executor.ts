/**
 * Dentist Industry Workflow Task Executor
 * Handles Dentist-specific workflow actions (similar to Medical)
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { executeMedicalAction } from './medical-executor';

/**
 * Execute Dentist-specific action
 * Most actions are similar to Medical, so we delegate to Medical executor
 */
export async function executeDentistAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
) {
  // Map dentist-specific actions to medical equivalents
  const actionMap: Record<string, string> = {
    'dental_appointment_booking': 'appointment_booking',
    'dental_appointment_reminder': 'appointment_reminder',
    'patient_research': 'patient_research',
    'insurance_verification': 'insurance_verification',
    'treatment_reminder': 'prescription_reminder',
    'xray_notification': 'test_results_notification',
    'referral_coordination': 'referral_coordination',
    'patient_onboarding': 'patient_onboarding',
    'post_visit_followup': 'post_visit_followup',
  };

  const mappedAction = actionMap[action] || action;
  return executeMedicalAction(mappedAction, task, instance);
}
