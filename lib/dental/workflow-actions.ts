/**
 * Dental Workflow Actions
 * Phase 3: Execute dental-specific workflow actions
 * Handles all dental actions from workflow-extensions.ts
 */

import { WorkflowAction, WorkflowEnrollment } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { sendSMS } from '@/lib/sms';
import {
  DENTAL_CLINICAL_ACTIONS,
  DENTAL_ADMIN_ACTIONS,
} from './workflow-extensions';

interface ExecutionContext {
  userId: string;
  leadId: string | null;
  dealId: string | null;
  variables: Record<string, any>;
}

/**
 * Execute dental-specific workflow action
 */
export async function executeDentalAction(
  action: WorkflowAction,
  enrollment: WorkflowEnrollment,
  context: ExecutionContext
): Promise<any> {
  const config = action.actionConfig as any;

  // Clinical Actions
  switch (action.type) {
    case 'CREATE_TREATMENT_PLAN':
      return await createTreatmentPlan(config, context);

    case 'UPDATE_ODONTOGRAM':
      return await updateOdontogram(config, context);

    case 'SCHEDULE_FOLLOWUP_APPOINTMENT':
      return await scheduleFollowupAppointment(config, context);

    case 'SEND_TREATMENT_UPDATE_TO_PATIENT':
      return await sendTreatmentUpdateToPatient(config, context);

    case 'CREATE_CLINICAL_NOTE':
      return await createClinicalNote(config, context);

    case 'REQUEST_XRAY_REVIEW':
      return await requestXrayReview(config, context);

    case 'GENERATE_TREATMENT_REPORT':
      return await generateTreatmentReport(config, context);

    case 'UPDATE_TREATMENT_PLAN':
      return await updateTreatmentPlan(config, context);

    case 'LOG_PROCEDURE':
      return await logProcedure(config, context);

    // Admin Actions
    case 'SEND_APPOINTMENT_REMINDER':
      return await sendAppointmentReminder(config, context);

    case 'PROCESS_PAYMENT':
      return await processPayment(config, context);

    case 'SUBMIT_INSURANCE_CLAIM':
      return await submitInsuranceClaim(config, context);

    case 'GENERATE_INVOICE':
      return await generateInvoice(config, context);

    case 'UPDATE_PATIENT_INFO':
      return await updatePatientInfo(config, context);

    case 'CREATE_LAB_ORDER':
      return await createLabOrder(config, context);

    case 'GENERATE_PRODUCTION_REPORT':
      return await generateProductionReport(config, context);

    case 'NOTIFY_TEAM_MEMBER':
      return await notifyTeamMember(config, context);

    case 'RESCHEDULE_APPOINTMENT':
      return await rescheduleAppointment(config, context);

    case 'SEND_BILLING_REMINDER':
      return await sendBillingReminder(config, context);

    case 'UPDATE_APPOINTMENT_STATUS':
      return await updateAppointmentStatus(config, context);

    // Legacy action types (for backward compatibility)
    case 'DENTAL_SEND_APPOINTMENT_REMINDER':
      return await sendAppointmentReminder(config, context);

    case 'DENTAL_SEND_TREATMENT_PLAN_NOTIFICATION':
      return await sendTreatmentPlanNotification(config, context);

    case 'DENTAL_SEND_XRAY_NOTIFICATION':
      return await sendXrayNotification(config, context);

    case 'DENTAL_CREATE_FOLLOWUP_APPOINTMENT':
      return await scheduleFollowupAppointment(config, context);

    case 'DENTAL_SEND_INSURANCE_VERIFICATION_REQUEST':
      return await submitInsuranceClaim(config, context);

    case 'DENTAL_SEND_PAYMENT_REMINDER':
      return await sendBillingReminder(config, context);

    case 'DENTAL_CREATE_TREATMENT_TASK':
      return await createTreatmentTask(config, context);

    case 'DENTAL_SEND_POST_VISIT_FOLLOWUP':
      return await sendPostVisitFollowup(config, context);

    case 'DENTAL_UPDATE_PATIENT_STATUS':
      return await updatePatientStatus(config, context);

    default:
      throw new Error(`Unknown dental action type: ${action.type}`);
  }
}

/**
 * Send appointment reminder
 */
async function sendAppointmentReminder(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const appointmentId = config.appointmentId || context.variables.appointmentId;
  const appointment = await prisma.bookingAppointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const message = config.message || `Reminder: You have an appointment on ${new Date(appointment.startTime).toLocaleDateString()} at ${new Date(appointment.startTime).toLocaleTimeString()}`;

  // Send email
  if (lead.email && config.sendEmail !== false) {
    await sendEmail({
      to: lead.email,
      subject: 'Appointment Reminder',
      html: `<p>${message}</p>`,
    });
  }

  // Send SMS
  if (lead.phone && config.sendSMS !== false) {
    await sendSMS({
      to: lead.phone,
      message,
    });
  }

  return { success: true, sent: { email: !!lead.email, sms: !!lead.phone } };
}

/**
 * Send treatment plan notification
 */
async function sendTreatmentPlanNotification(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const treatmentPlanId = config.treatmentPlanId || context.variables.treatmentPlanId;
  const treatmentPlan = await (prisma as any).dentalTreatmentPlan.findUnique({
    where: { id: treatmentPlanId },
  });

  if (!treatmentPlan) {
    throw new Error('Treatment plan not found');
  }

  const message = config.message || `Your treatment plan has been created. Please review and approve it.`;

  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: 'Treatment Plan Ready for Review',
      html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dental/treatment-plans/${treatmentPlanId}">View Treatment Plan</a></p>`,
    });
  }

  return { success: true };
}

/**
 * Send X-ray notification
 */
async function sendXrayNotification(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const xrayId = config.xrayId || context.variables.xrayId;
  const xrayType = config.xrayType || context.variables.xrayType || 'X-ray';

  const message = config.message || `Your ${xrayType} results are ready for review.`;

  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: `${xrayType} Results Ready`,
      html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dental/xrays/${xrayId}">View Results</a></p>`,
    });
  }

  return { success: true };
}

/**
 * Create follow-up appointment
 */
async function createFollowupAppointment(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const daysFromNow = config.daysFromNow || 30;
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + daysFromNow);

  const appointment = await prisma.bookingAppointment.create({
    data: {
      userId: context.userId,
      leadId: context.leadId!,
      startTime: appointmentDate,
      endTime: new Date(appointmentDate.getTime() + 30 * 60 * 1000), // 30 minutes
      status: 'SCHEDULED',
      type: 'FOLLOWUP',
      notes: config.notes || 'Follow-up appointment created automatically',
    },
  });

  return { success: true, appointmentId: appointment.id };
}

/**
 * Send insurance verification request
 */
async function sendInsuranceVerificationRequest(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Create a task or notification for admin to verify insurance
  // This could integrate with insurance APIs in Phase 6
  const message = config.message || `Insurance verification needed for ${lead.businessName || lead.contactPerson}`;

  // For now, log it - in Phase 6, this would integrate with insurance APIs
  console.log('Insurance verification requested:', {
    leadId: context.leadId,
    message,
  });

  return { success: true, message: 'Insurance verification request logged' };
}

/**
 * Send payment reminder
 */
async function sendPaymentReminder(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const amount = config.amount || context.variables.amount || 'outstanding balance';
  const message = config.message || `Reminder: You have an ${amount} due. Please make a payment.`;

  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: 'Payment Reminder',
      html: `<p>${message}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dental/billing">Make Payment</a></p>`,
    });
  }

  if (lead.phone) {
    await sendSMS({
      to: lead.phone,
      message,
    });
  }

  return { success: true };
}

/**
 * Create treatment task
 */
async function createTreatmentTask(config: any, context: ExecutionContext) {
  // Create a task in the system for the team
  const task = await prisma.task.create({
    data: {
      userId: context.userId,
      title: config.title || 'Treatment Task',
      description: config.description || '',
      status: 'PENDING',
      priority: config.priority || 'MEDIUM',
      dueDate: config.dueDate ? new Date(config.dueDate) : null,
      leadId: context.leadId,
    },
  });

  return { success: true, taskId: task.id };
}

/**
 * Send post-visit follow-up
 */
async function sendPostVisitFollowup(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const message = config.message || `Thank you for your visit! We hope everything went well. Please let us know if you have any questions.`;

  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: 'Thank You for Your Visit',
      html: `<p>${message}</p>`,
    });
  }

  return { success: true };
}

/**
 * Update patient status
 */
async function updatePatientStatus(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const newStatus = config.status;
  if (!newStatus) {
    throw new Error('Status is required');
  }

  await prisma.lead.update({
    where: { id: context.leadId! },
    data: {
      status: newStatus,
    },
  });

  return { success: true, newStatus };
}

// ========== NEW CLINICAL ACTIONS ==========

/**
 * Create treatment plan
 */
async function createTreatmentPlan(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const treatmentPlan = await (prisma as any).dentalTreatmentPlan.create({
    data: {
      userId: context.userId,
      leadId: context.leadId!,
      status: 'DRAFT',
      procedures: config.procedures || [],
      estimatedCost: config.estimatedCost || 0,
      estimatedDuration: config.estimatedDuration || 0,
      notes: config.notes || 'Treatment plan created automatically by workflow',
    },
  });

  return { success: true, treatmentPlanId: treatmentPlan.id };
}

/**
 * Update odontogram
 */
async function updateOdontogram(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Update odontogram data (stored in lead metadata or separate model)
  // For now, log it - actual implementation depends on odontogram storage structure
  console.log('Odontogram update requested:', {
    leadId: context.leadId,
    teeth: config.teeth,
    conditions: config.conditions,
  });

  return { success: true, message: 'Odontogram update logged' };
}

/**
 * Schedule follow-up appointment (alias for createFollowupAppointment)
 */
async function scheduleFollowupAppointment(config: any, context: ExecutionContext) {
  return createFollowupAppointment(config, context);
}

/**
 * Send treatment update to patient
 */
async function sendTreatmentUpdateToPatient(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const treatmentPlanId = config.treatmentPlanId || context.variables.treatmentPlanId;
  const message = config.message || `Your treatment progress has been updated. Please check your treatment plan for details.`;

  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: 'Treatment Update',
      html: `<p>${message}</p>${treatmentPlanId ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/dental/treatment-plans/${treatmentPlanId}">View Treatment Plan</a></p>` : ''}`,
    });
  }

  if (lead.phone) {
    await sendSMS({
      to: lead.phone,
      message,
    });
  }

  return { success: true };
}

/**
 * Create clinical note
 */
async function createClinicalNote(config: any, context: ExecutionContext) {
  const note = await prisma.note.create({
    data: {
      userId: context.userId,
      leadId: context.leadId,
      content: config.content || config.note || 'Clinical note created automatically',
      type: 'CLINICAL',
    },
  });

  return { success: true, noteId: note.id };
}

/**
 * Request X-ray review
 */
async function requestXrayReview(config: any, context: ExecutionContext) {
  const xrayId = config.xrayId || context.variables.xrayId;
  
  // Create a task for review
  const task = await prisma.task.create({
    data: {
      userId: context.userId,
      leadId: context.leadId,
      title: `Review X-ray: ${config.xrayType || 'X-ray'}`,
      description: `X-ray ID: ${xrayId}. Please review and provide analysis.`,
      status: 'PENDING',
      priority: config.priority || 'HIGH',
    },
  });

  return { success: true, taskId: task.id };
}

/**
 * Generate treatment report
 */
async function generateTreatmentReport(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
    include: {
      dentalXRays: true,
      dentalTreatmentPlans: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Generate report (simplified - in production, would create PDF)
  const report = {
    patientName: lead.businessName || lead.contactPerson,
    date: new Date().toISOString(),
    xraysCount: (lead as any).dentalXRays?.length || 0,
    treatmentPlansCount: (lead as any).dentalTreatmentPlans?.length || 0,
  };

  console.log('Treatment report generated:', report);

  return { success: true, report };
}

/**
 * Update treatment plan
 */
async function updateTreatmentPlan(config: any, context: ExecutionContext) {
  const treatmentPlanId = config.treatmentPlanId || context.variables.treatmentPlanId;
  
  if (!treatmentPlanId) {
    throw new Error('Treatment plan ID required');
  }

  const updateData: any = {};
  if (config.status) updateData.status = config.status;
  if (config.procedures) updateData.procedures = config.procedures;
  if (config.notes) updateData.notes = config.notes;

  await (prisma as any).dentalTreatmentPlan.update({
    where: { id: treatmentPlanId },
    data: updateData,
  });

  return { success: true, treatmentPlanId };
}

/**
 * Log procedure
 */
async function logProcedure(config: any, context: ExecutionContext) {
  const procedure = await (prisma as any).dentalProcedure.create({
    data: {
      userId: context.userId,
      leadId: context.leadId!,
      procedureType: config.procedureType || 'GENERAL',
      status: 'COMPLETED',
      datePerformed: config.datePerformed ? new Date(config.datePerformed) : new Date(),
      notes: config.notes || 'Procedure logged automatically by workflow',
      cost: config.cost || 0,
    },
  });

  return { success: true, procedureId: procedure.id };
}

// ========== NEW ADMIN ACTIONS ==========

/**
 * Process payment
 */
async function processPayment(config: any, context: ExecutionContext) {
  const amount = config.amount || context.variables.amount;
  const paymentMethod = config.paymentMethod || 'MANUAL';

  if (!amount) {
    throw new Error('Payment amount required');
  }

  // Log payment (Phase 6 will integrate with payment processors)
  console.log('Payment processed:', {
    leadId: context.leadId,
    amount,
    paymentMethod,
  });

  return { success: true, amount, paymentMethod };
}

/**
 * Submit insurance claim
 */
async function submitInsuranceClaim(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Log claim submission (Phase 6 will integrate with insurance APIs)
  console.log('Insurance claim submitted:', {
    leadId: context.leadId,
    procedureId: config.procedureId,
    amount: config.amount,
  });

  return { success: true, message: 'Insurance claim submitted (logged)' };
}

/**
 * Generate invoice
 */
async function generateInvoice(config: any, context: ExecutionContext) {
  const lead = await prisma.lead.findUnique({
    where: { id: context.leadId! },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Generate invoice (simplified - Phase 6 will create PDF invoices)
  const invoice = {
    invoiceNumber: `INV-${Date.now()}`,
    patientName: lead.businessName || lead.contactPerson,
    amount: config.amount || 0,
    items: config.items || [],
    date: new Date().toISOString(),
  };

  console.log('Invoice generated:', invoice);

  return { success: true, invoice };
}

/**
 * Update patient info
 */
async function updatePatientInfo(config: any, context: ExecutionContext) {
  const updateData: any = {};
  if (config.email) updateData.email = config.email;
  if (config.phone) updateData.phone = config.phone;
  if (config.address) updateData.address = config.address;
  if (config.contactPerson) updateData.contactPerson = config.contactPerson;

  await prisma.lead.update({
    where: { id: context.leadId! },
    data: updateData,
  });

  return { success: true };
}

/**
 * Create lab order
 */
async function createLabOrder(config: any, context: ExecutionContext) {
  // Create lab order (simplified - Phase 6 will integrate with lab systems)
  console.log('Lab order created:', {
    leadId: context.leadId,
    orderType: config.orderType,
    labName: config.labName,
  });

  return { success: true, message: 'Lab order created (logged)' };
}

/**
 * Generate production report
 */
async function generateProductionReport(config: any, context: ExecutionContext) {
  const dateRange = config.dateRange || { start: new Date(), end: new Date() };
  
  // Generate production report (simplified)
  const report = {
    dateRange,
    totalProduction: 0,
    proceduresCount: 0,
    appointmentsCount: 0,
  };

  console.log('Production report generated:', report);

  return { success: true, report };
}

/**
 * Notify team member
 */
async function notifyTeamMember(config: any, context: ExecutionContext) {
  const teamMemberId = config.teamMemberId || config.userId;
  const message = config.message || 'You have a new notification';

  // Create notification (simplified - would use notification system)
  console.log('Team member notified:', {
    teamMemberId,
    message,
  });

  return { success: true };
}

/**
 * Reschedule appointment
 */
async function rescheduleAppointment(config: any, context: ExecutionContext) {
  const appointmentId = config.appointmentId || context.variables.appointmentId;
  const newDate = config.newDate ? new Date(config.newDate) : null;

  if (!appointmentId) {
    throw new Error('Appointment ID required');
  }

  if (!newDate) {
    throw new Error('New date required');
  }

  const appointment = await prisma.bookingAppointment.update({
    where: { id: appointmentId },
    data: {
      startTime: newDate,
      endTime: new Date(newDate.getTime() + 30 * 60 * 1000), // 30 minutes
    },
  });

  return { success: true, appointmentId: appointment.id };
}

/**
 * Send billing reminder (alias for sendPaymentReminder)
 */
async function sendBillingReminder(config: any, context: ExecutionContext) {
  return sendPaymentReminder(config, context);
}

/**
 * Update appointment status
 */
async function updateAppointmentStatus(config: any, context: ExecutionContext) {
  const appointmentId = config.appointmentId || context.variables.appointmentId;
  const newStatus = config.status;

  if (!appointmentId || !newStatus) {
    throw new Error('Appointment ID and status required');
  }

  await prisma.bookingAppointment.update({
    where: { id: appointmentId },
    data: { status: newStatus as any },
  });

  return { success: true, appointmentId, newStatus };
}
