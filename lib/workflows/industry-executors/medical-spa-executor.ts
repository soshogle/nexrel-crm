/**
 * Medical Spa Industry Workflow Task Executor
 * Handles Medical Spa-specific workflow actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { executeMedicalAction } from './medical-executor';
import { createDalContext } from '@/lib/context/industry-context';
import { leadService, getCrmDb } from '@/lib/dal';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute Medical Spa-specific action
 */
export async function executeMedicalSpaAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'treatment_booking':
      return await bookTreatment(task, instance);
    case 'treatment_reminder':
      return await sendTreatmentReminder(task, instance);
    case 'package_promotion':
      return await sendPackagePromotion(task, instance);
    case 'appointment_booking':
      return executeMedicalAction('appointment_booking', task, instance);
    case 'appointment_reminder':
      return executeMedicalAction('appointment_reminder', task, instance);
    default:
      return executeMedicalAction(action, task, instance);
  }
}

/**
 * Book spa treatment
 */
async function bookTreatment(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No client found' };
  }

  const actionConfig = task.actionConfig as any;
  const treatmentDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const treatmentType = actionConfig?.treatmentType || 'Spa Treatment';
  const duration = actionConfig?.duration || 60;

  try {
    const appointment = await getCrmDb(ctx).bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead.contactPerson || lead.businessName || 'Client',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '',
        appointmentDate: treatmentDate,
        duration,
        status: 'SCHEDULED',
        meetingType: 'IN_PERSON',
        notes: `Treatment: ${treatmentType}`,
      },
    });

    // Send confirmation
    const message = `Your ${treatmentType} is scheduled for ${treatmentDate.toLocaleDateString()} at ${treatmentDate.toLocaleTimeString()}. We look forward to pampering you!`;

    if (lead.phone) {
      await sendSMS(lead.phone, message);
    }

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        treatmentType,
        treatmentDate: treatmentDate.toISOString(),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to book treatment: ${error.message}`,
    };
  }
}

/**
 * Send treatment reminder
 */
async function sendTreatmentReminder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  return executeMedicalAction('appointment_reminder', task, instance);
}

/**
 * Send package promotion
 */
async function sendPackagePromotion(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const ctx = createDalContext(instance.userId, instance.industry);
  const lead = instance.leadId 
    ? await leadService.findUnique(ctx, instance.leadId)
    : null;

  if (!lead) {
    return { success: false, error: 'No client found' };
  }

  const actionConfig = task.actionConfig as any;
  const packageName = actionConfig?.packageName || 'Spa Package';
  const discount = actionConfig?.discount || 20;
  const promoCode = actionConfig?.promoCode || `SPA${Math.floor(Math.random() * 100)}`;

  try {
    const emailService = new EmailService();
    
    if (lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: `Special ${packageName} Offer`,
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Valued Client'},</p>
          <p>Enjoy ${discount}% off our ${packageName}!</p>
          <p><strong>Promo Code: ${promoCode}</strong></p>
        </div>`,
        text: `${discount}% off ${packageName}. Code: ${promoCode}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        packageName,
        discount,
        promoCode,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: `Failed to send promotion: ${error.message}`,
    };
  }
}
