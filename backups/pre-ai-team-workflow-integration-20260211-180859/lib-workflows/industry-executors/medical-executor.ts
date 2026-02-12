/**
 * Medical Industry Workflow Task Executor
 * Handles Medical-specific workflow actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { prisma } from '@/lib/db';
import { CalendarService } from '@/lib/calendar/calendar-service';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute Medical-specific action
 */
export async function executeMedicalAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'appointment_booking':
      return await bookAppointment(task, instance);
    case 'appointment_reminder':
      return await sendAppointmentReminder(task, instance);
    case 'patient_research':
      return await researchPatient(task, instance);
    case 'insurance_verification':
      return await verifyInsurance(task, instance);
    case 'prescription_reminder':
      return await sendPrescriptionReminder(task, instance);
    case 'test_results_notification':
      return await notifyTestResults(task, instance);
    case 'referral_coordination':
      return await coordinateReferral(task, instance);
    case 'patient_onboarding':
      return await onboardPatient(task, instance);
    case 'post_visit_followup':
      return await postVisitFollowup(task, instance);
    default:
      return { success: false, error: `Unknown Medical action: ${action}` };
  }
}

/**
 * Book appointment for patient
 */
async function bookAppointment(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const appointmentDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
  const duration = actionConfig?.duration || 30; // minutes
  const appointmentType = actionConfig?.type || 'CONSULTATION';
  const notes = actionConfig?.notes || task.description || '';

  try {
    // Create appointment
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead.contactPerson || lead.businessName || 'Patient',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '',
        appointmentDate,
        duration,
        status: 'SCHEDULED',
        meetingType: 'IN_PERSON',
        notes: `${appointmentType}: ${notes}`,
      },
    });

    // Calendar sync is handled via bookingAppointment above

    return {
      success: true,
      data: {
        appointmentId: appointment.id,
        appointmentDate: appointmentDate.toISOString(),
        duration,
        type: appointmentType,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to book appointment:', error);
    return {
      success: false,
      error: `Failed to book appointment: ${error.message}`,
    };
  }
}

/**
 * Send appointment reminder
 */
async function sendAppointmentReminder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const appointmentId = actionConfig?.appointmentId;

  // Get appointment if ID provided, otherwise use most recent
  let appointment = appointmentId
    ? await prisma.bookingAppointment.findUnique({ where: { id: appointmentId } })
    : await prisma.bookingAppointment.findFirst({
        where: { leadId: instance.leadId || undefined, userId: instance.userId },
        orderBy: { appointmentDate: 'desc' },
      });

  if (!appointment) {
    return { success: false, error: 'No appointment found to remind about' };
  }

  const reminderMessage = actionConfig?.message || 
    `Reminder: You have an appointment on ${appointment.appointmentDate.toLocaleDateString()} at ${appointment.appointmentDate.toLocaleTimeString()}`;

  const results: TaskResult[] = [];

  // Send SMS if phone available
  if (lead.phone) {
    try {
      await sendSMS(lead.phone, reminderMessage);
      results.push({ success: true, data: { channel: 'SMS', phone: lead.phone } });
    } catch (error: any) {
      results.push({ success: false, error: `SMS failed: ${error.message}` });
    }
  }

  // Send Email if email available
  if (lead.email) {
    try {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Appointment Reminder',
        html: `<p>${reminderMessage}</p>`,
        text: reminderMessage,
        userId: instance.userId,
      });
      results.push({ success: true, data: { channel: 'Email', email: lead.email } });
    } catch (error: any) {
      results.push({ success: false, error: `Email failed: ${error.message}` });
    }
  }

  const allSuccess = results.every(r => r.success);
  return {
    success: allSuccess,
    data: {
      appointmentId: appointment.id,
      channels: results,
      timestamp: new Date().toISOString(),
    },
    error: allSuccess ? undefined : results.find(r => !r.success)?.error,
  };
}

/**
 * Research patient information
 */
async function researchPatient(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  try {
    // Use lead enrichment service to gather patient information
    const { DataEnrichmentService } = await import('@/lib/data-enrichment-service');
    const enrichmentService = new DataEnrichmentService();
    
    let domain: string | undefined;
    if (lead.website) {
      try {
        domain = new URL(lead.website).hostname;
      } catch (e) {
        // Invalid URL
      }
    }
    
    const enrichmentResult = await enrichmentService.enrichLead(lead.id, {
      email: lead.email || undefined,
      domain,
      firstName: lead.contactPerson?.split(' ')[0],
      lastName: lead.contactPerson?.split(' ').slice(1).join(' '),
    });

    // Get patient's appointment history
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        leadId: instance.leadId || undefined,
        userId: instance.userId,
      },
      orderBy: { appointmentDate: 'desc' },
      take: 10,
    });

    return {
      success: enrichmentResult.success || true,
      data: {
        leadId: lead.id,
        enrichedData: enrichmentResult.data,
        appointmentHistory: appointments.map(a => ({
          id: a.id,
          date: a.appointmentDate.toISOString(),
          status: a.status,
        })),
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to research patient:', error);
    return {
      success: false,
      error: `Failed to research patient: ${error.message}`,
    };
  }
}

/**
 * Verify insurance coverage
 */
async function verifyInsurance(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const leadCustomFields = (lead as any).customFields as any;
  const insuranceProvider = actionConfig?.insuranceProvider || leadCustomFields?.insuranceProvider;
  const policyNumber = actionConfig?.policyNumber || leadCustomFields?.policyNumber;

  // In a real implementation, this would call an insurance verification API
  // For now, we'll create a task for manual verification
  try {
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Verify Insurance: ${lead.contactPerson || lead.businessName}`,
        description: `Insurance Provider: ${insuranceProvider || 'Unknown'}\nPolicy Number: ${policyNumber || 'Not provided'}\nPatient: ${lead.contactPerson || lead.businessName}`,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        leadId: instance.leadId || undefined,
      },
    });

    return {
      success: true,
      data: {
        patientName: lead.contactPerson || lead.businessName,
        insuranceProvider,
        policyNumber,
        verificationTaskCreated: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to verify insurance:', error);
    return {
      success: false,
      error: `Failed to verify insurance: ${error.message}`,
    };
  }
}

/**
 * Send prescription reminder
 */
async function sendPrescriptionReminder(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const prescriptionName = actionConfig?.prescriptionName || 'your prescription';
  const reminderMessage = actionConfig?.message || 
    `Reminder: Don't forget to take ${prescriptionName}. If you need a refill, please contact us.`;

  try {
    const results: TaskResult[] = [];

    // Send SMS
    if (lead.phone) {
      try {
        await sendSMS(lead.phone, reminderMessage);
        results.push({ success: true, data: { channel: 'SMS' } });
      } catch (error: any) {
        results.push({ success: false, error: `SMS failed: ${error.message}` });
      }
    }

    // Send Email
    if (lead.email) {
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          to: lead.email,
          subject: 'Prescription Reminder',
          html: `<p>${reminderMessage}</p>`,
          text: reminderMessage,
          userId: instance.userId,
        });
        results.push({ success: true, data: { channel: 'Email' } });
      } catch (error: any) {
        results.push({ success: false, error: `Email failed: ${error.message}` });
      }
    }

    const allSuccess = results.every(r => r.success);
    return {
      success: allSuccess,
      data: {
        prescriptionName,
        channels: results,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to send prescription reminder:', error);
    return {
      success: false,
      error: `Failed to send reminder: ${error.message}`,
    };
  }
}

/**
 * Notify patient of test results
 */
async function notifyTestResults(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const testType = actionConfig?.testType || 'lab test';
  const resultsAvailable = actionConfig?.resultsAvailable !== false;
  const message = actionConfig?.message || 
    `Your ${testType} results are now available. Please log in to your patient portal or contact us to review them.`;

  try {
    const emailService = new EmailService();
    
    if (lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: `Test Results Available: ${testType}`,
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Patient'},</p>
          <p>${message}</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>`,
        text: message,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        testType,
        resultsAvailable,
        notificationSent: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to notify test results:', error);
    return {
      success: false,
      error: `Failed to notify: ${error.message}`,
    };
  }
}

/**
 * Coordinate specialist referral
 */
async function coordinateReferral(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const specialistType = actionConfig?.specialistType || 'specialist';
  const referralReason = actionConfig?.reason || task.description || '';

  try {
    // Create referral task
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Referral: ${lead.contactPerson || lead.businessName} to ${specialistType}`,
        description: `Patient: ${lead.contactPerson || lead.businessName}\nSpecialist Type: ${specialistType}\nReason: ${referralReason}`,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
        leadId: instance.leadId || undefined,
      },
    });

    return {
      success: true,
      data: {
        patientName: lead.contactPerson || lead.businessName,
        specialistType,
        referralTaskCreated: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to coordinate referral:', error);
    return {
      success: false,
      error: `Failed to coordinate referral: ${error.message}`,
    };
  }
}

/**
 * Onboard new patient
 */
async function onboardPatient(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  try {
    // Create onboarding tasks
    const onboardingTasks = [
      { title: 'Collect Patient Information', priority: 'HIGH' },
      { title: 'Verify Insurance', priority: 'HIGH' },
      { title: 'Schedule Initial Consultation', priority: 'MEDIUM' },
      { title: 'Send Welcome Packet', priority: 'LOW' },
    ];

    await Promise.all(
      onboardingTasks.map((t, index) =>
        prisma.task.create({
          data: {
            userId: instance.userId,
            title: t.title,
            description: `Patient: ${lead.contactPerson || lead.businessName}`,
            status: 'TODO',
            priority: t.priority as any,
            dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
            leadId: instance.leadId || undefined,
          },
        })
      )
    );

    // Send welcome email
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Welcome to Our Practice',
        html: `<div style="font-family: Arial, sans-serif;">
          <p>Dear ${lead.contactPerson || 'Patient'},</p>
          <p>Welcome! We're excited to have you as a patient. Our team will be in touch shortly to complete your onboarding.</p>
        </div>`,
        text: 'Welcome to our practice!',
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        patientName: lead.contactPerson || lead.businessName,
        onboardingTasksCreated: onboardingTasks.length,
        welcomeEmailSent: !!lead.email,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to onboard patient:', error);
    return {
      success: false,
      error: `Failed to onboard patient: ${error.message}`,
    };
  }
}

/**
 * Post-visit follow-up
 */
async function postVisitFollowup(
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead/patient found' };
  }

  const actionConfig = task.actionConfig as any;
  const followupMessage = actionConfig?.message || 
    `Thank you for your visit. We hope you're feeling better. If you have any questions or concerns, please don't hesitate to contact us.`;

  try {
    const results: TaskResult[] = [];

    // Send follow-up email
    if (lead.email) {
      try {
        const emailService = new EmailService();
        await emailService.sendEmail({
          to: lead.email,
          subject: 'Follow-up After Your Visit',
          html: `<div style="font-family: Arial, sans-serif;">
            <p>Dear ${lead.contactPerson || 'Patient'},</p>
            <p>${followupMessage}</p>
          </div>`,
          text: followupMessage,
          userId: instance.userId,
        });
        results.push({ success: true, data: { channel: 'Email' } });
      } catch (error: any) {
        results.push({ success: false, error: `Email failed: ${error.message}` });
      }
    }

    // Request feedback
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Request Feedback: ${lead.contactPerson || lead.businessName}`,
        description: 'Follow up with patient to request feedback on their visit',
        status: 'TODO',
        priority: 'LOW',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
        leadId: instance.leadId || undefined,
      },
    });

    return {
      success: results.every(r => r.success),
      data: {
        followupSent: true,
        feedbackTaskCreated: true,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('[Medical] Failed to send follow-up:', error);
    return {
      success: false,
      error: `Failed to send follow-up: ${error.message}`,
    };
  }
}
