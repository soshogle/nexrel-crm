/**
 * Remaining Industries Workflow Task Executors
 * Handles Optometrist, Health Clinic, Hospital, Technology, Sports Club actions
 */

import { WorkflowTask, WorkflowInstance } from '@prisma/client';
import { executeMedicalAction } from './medical-executor';
import { prisma } from '@/lib/db';
import { sendSMS } from '@/lib/twilio';
import { EmailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';

interface TaskResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Execute Optometrist-specific action
 */
export async function executeOptometristAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  // Optometrist actions are similar to Medical
  const actionMap: Record<string, string> = {
    'eye_exam_booking': 'appointment_booking',
    'prescription_reminder': 'prescription_reminder',
    'glasses_ready_notification': 'test_results_notification',
  };

  const mappedAction = actionMap[action] || action;
  return executeMedicalAction(mappedAction, task, instance);
}

/**
 * Execute Health Clinic-specific action
 */
export async function executeHealthClinicAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  // Health Clinic actions are similar to Medical
  return executeMedicalAction(action, task, instance);
}

/**
 * Execute Hospital-specific action
 */
export async function executeHospitalAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  // Hospital actions are similar to Medical but may have additional complexity
  switch (action) {
    case 'admission_coordination':
      return await coordinateAdmission(task, instance);
    case 'discharge_planning':
      return await planDischarge(task, instance);
    default:
      return executeMedicalAction(action, task, instance);
  }
}

/**
 * Execute Technology-specific action
 */
export async function executeTechnologyAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'demo_scheduling':
      return await scheduleDemo(task, instance);
    case 'trial_activation':
      return await activateTrial(task, instance);
    case 'onboarding_sequence':
      return await startOnboarding(task, instance);
    case 'feature_announcement':
      return await announceFeature(task, instance);
    default:
      return { success: false, error: `Unknown Technology action: ${action}` };
  }
}

/**
 * Execute Sports Club-specific action
 */
export async function executeSportsClubAction(
  action: string,
  task: WorkflowTask,
  instance: WorkflowInstance
): Promise<TaskResult> {
  switch (action) {
    case 'membership_enrollment':
      return await enrollMember(task, instance);
    case 'class_booking':
      return await bookClass(task, instance);
    case 'equipment_reservation':
      return await reserveEquipment(task, instance);
    case 'membership_renewal':
      return await renewMembership(task, instance);
    default:
      return { success: false, error: `Unknown Sports Club action: ${action}` };
  }
}

// Hospital-specific functions
async function coordinateAdmission(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No patient found' };
  }

  try {
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Coordinate Admission: ${lead.contactPerson || lead.businessName}`,
        description: 'Coordinate patient admission process',
        status: 'TODO',
        priority: 'HIGH',
        leadId: instance.leadId || undefined,
      },
    });

    return { success: true, data: { admissionTaskCreated: true } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function planDischarge(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No patient found' };
  }

  try {
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Discharge Planning: ${lead.contactPerson || lead.businessName}`,
        description: 'Plan patient discharge',
        status: 'TODO',
        priority: 'HIGH',
        leadId: instance.leadId || undefined,
      },
    });

    return { success: true, data: { dischargeTaskCreated: true } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Technology-specific functions
async function scheduleDemo(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found' };
  }

  const actionConfig = task.actionConfig as any;
  const demoDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const productName = actionConfig?.productName || 'Product Demo';

  try {
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead.contactPerson || lead.businessName || 'Prospect',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '',
        appointmentDate: demoDate,
        duration: 60,
        status: 'SCHEDULED',
        meetingType: 'VIDEO_CALL',
        notes: `Demo: ${productName}`,
      },
    });

    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: `${productName} Demo Scheduled`,
        html: `<p>Your demo is scheduled for ${demoDate.toLocaleDateString()}.</p>`,
        text: `Demo scheduled for ${demoDate.toLocaleDateString()}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        demoId: appointment.id,
        demoDate: demoDate.toISOString(),
        productName,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function activateTrial(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found' };
  }

  const actionConfig = task.actionConfig as any;
  const trialDuration = actionConfig?.duration || 14; // days
  const trialCode = actionConfig?.trialCode || `TRIAL${Math.floor(Math.random() * 10000)}`;

  try {
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Your Trial Has Been Activated',
        html: `<p>Your ${trialDuration}-day trial is now active. Trial Code: ${trialCode}</p>`,
        text: `Trial activated. Code: ${trialCode}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        trialDuration,
        trialCode,
        activated: true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function startOnboarding(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found' };
  }

  try {
    const onboardingTasks = [
      { title: 'Send Welcome Email', priority: 'HIGH' },
      { title: 'Schedule Onboarding Call', priority: 'HIGH' },
      { title: 'Provide Access Credentials', priority: 'MEDIUM' },
      { title: 'Send Training Materials', priority: 'MEDIUM' },
    ];

    await Promise.all(
      onboardingTasks.map((t, index) =>
        prisma.task.create({
          data: {
            userId: instance.userId,
            title: t.title,
            description: `Customer: ${lead.contactPerson || lead.businessName}`,
            status: 'TODO',
            priority: t.priority as any,
            dueDate: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
            leadId: instance.leadId || undefined,
          },
        })
      )
    );

    return {
      success: true,
      data: {
        onboardingTasksCreated: onboardingTasks.length,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function announceFeature(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found' };
  }

  const actionConfig = task.actionConfig as any;
  const featureName = actionConfig?.featureName || 'New Feature';

  try {
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: `New Feature: ${featureName}`,
        html: `<p>We're excited to announce ${featureName}!</p>`,
        text: `New feature: ${featureName}`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        featureName,
        announcementSent: true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Sports Club-specific functions
async function enrollMember(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No lead found' };
  }

  const actionConfig = task.actionConfig as any;
  const membershipType = actionConfig?.membershipType || 'Standard';

  try {
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Enroll Member: ${lead.contactPerson || lead.businessName}`,
        description: `Membership Type: ${membershipType}`,
        status: 'TODO',
        priority: 'HIGH',
        leadId: instance.leadId || undefined,
      },
    });

    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Welcome to Our Sports Club!',
        html: `<p>Welcome! Your ${membershipType} membership enrollment is in process.</p>`,
        text: `Welcome! ${membershipType} membership enrollment in process.`,
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        membershipType,
        enrollmentTaskCreated: true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function bookClass(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No member found' };
  }

  const actionConfig = task.actionConfig as any;
  const classDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const className = actionConfig?.className || 'Fitness Class';

  try {
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: instance.userId,
        leadId: instance.leadId || undefined,
        customerName: lead.contactPerson || lead.businessName || 'Member',
        customerEmail: lead.email || undefined,
        customerPhone: lead.phone || '',
        appointmentDate: classDate,
        duration: 60,
        status: 'CONFIRMED',
        meetingType: 'IN_PERSON',
        notes: `Class: ${className}`,
      },
    });

    return {
      success: true,
      data: {
        classBookingId: appointment.id,
        className,
        classDate: classDate.toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function reserveEquipment(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const actionConfig = task.actionConfig as any;
  const equipmentType = actionConfig?.equipmentType || 'Equipment';
  const reservationDate = actionConfig?.date 
    ? new Date(actionConfig.date)
    : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

  try {
    await prisma.task.create({
      data: {
        userId: instance.userId,
        title: `Reserve Equipment: ${equipmentType}`,
        description: `Reservation Date: ${reservationDate.toLocaleDateString()}`,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: reservationDate,
        leadId: instance.leadId || undefined,
      },
    });

    return {
      success: true,
      data: {
        equipmentType,
        reservationDate: reservationDate.toISOString(),
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function renewMembership(task: WorkflowTask, instance: WorkflowInstance): Promise<TaskResult> {
  const lead = instance.leadId 
    ? await prisma.lead.findUnique({ where: { id: instance.leadId } })
    : null;

  if (!lead) {
    return { success: false, error: 'No member found' };
  }

  try {
    if (lead.email) {
      const emailService = new EmailService();
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Membership Renewal Reminder',
        html: `<p>Your membership is up for renewal. Please contact us to continue enjoying our facilities!</p>`,
        text: 'Membership renewal reminder',
        userId: instance.userId,
      });
    }

    return {
      success: true,
      data: {
        renewalReminderSent: true,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
