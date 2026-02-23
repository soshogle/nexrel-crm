/**
 * Shared logic for running Industry AI Employee tasks
 * Used by: /api/industry-ai-employees/run and /api/ai-employees/functions
 * Phase 2: Uses custom templates when provided
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService, dealService } from '@/lib/dal';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';
import { prisma } from '@/lib/db';
import {
  sendSMSToLead,
  sendSMSToPhone,
  sendEmailToLead,
  sendEmailToAddress,
} from '@/lib/ai-employees/outreach-helper';
import { getTaskTemplate } from '@/lib/ai-employees/template-helper';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: Record<string, unknown>;
}

const DEFAULT_APPOINTMENT_MSG =
  'Hi {firstName}! This is a reminder about your appointment tomorrow. Please reply to confirm or reschedule.';
const DEFAULT_PATIENT_MSG =
  'Hi {firstName}! Thank you for choosing us. We wanted to check in — how was your experience? Reply anytime if you have questions.';
const DEFAULT_TREATMENT_MSG =
  'Hi {firstName}! We wanted to follow up on your treatment plan. Do you have any questions or would you like to schedule? Reply anytime.';
const DEFAULT_BILLING_SUBJECT = 'Friendly reminder: Invoice pending';
const DEFAULT_BILLING_BODY =
  'Hi {firstName},\n\nThis is a friendly reminder that you have an outstanding invoice. Please let us know if you have any questions or need to arrange payment.\n\nThank you!';

async function executeAppointmentScheduler(
  userId: string,
  industry: Industry,
  template?: { smsTemplate?: string | null } | null
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);
  const appointments = await db.bookingAppointment.findMany({
    where: {
      userId,
      appointmentDate: { gte: tomorrow, lt: dayAfter },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    take: 20,
  } as any);

  let sent = 0;
  const msg = template?.smsTemplate || DEFAULT_APPOINTMENT_MSG;
  for (const apt of appointments) {
    if (apt.customerPhone) {
      const name = apt.customerName?.split(' ')[0] || 'there';
      const res = await sendSMSToPhone(
        apt.customerPhone,
        msg.replace(/\{firstName\}/g, name)
      );
      if (res.success) sent++;
      await delay(200);
    } else if (apt.leadId) {
      const res = await sendSMSToLead(userId, apt.leadId, msg);
      if (res.success) sent++;
      await delay(200);
    }
  }

  return {
    success: true,
    employeeType: 'APPOINTMENT_SCHEDULER',
    tasksCompleted: sent,
    summary: `Sent ${sent} appointment reminders (${appointments.length} total)`,
    details: { appointmentIds: appointments.map((a) => a.id), sent },
  };
}

async function executePatientCoordinator(
  userId: string,
  _industry: Industry,
  template?: { smsTemplate?: string | null } | null
): Promise<ExecutionResult> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const ctx = createDalContext(userId);
  const newPatients = await leadService.findMany(ctx, {
    where: { createdAt: { gte: sevenDaysAgo } },
    take: 15,
  });

  let sent = 0;
  const msg = template?.smsTemplate || DEFAULT_PATIENT_MSG;
  for (const lead of newPatients) {
    if (lead.phone) {
      const res = await sendSMSToLead(userId, lead.id, msg);
      if (res.success) sent++;
      await delay(200);
    }
  }

  return {
    success: true,
    employeeType: 'PATIENT_COORDINATOR',
    tasksCompleted: sent,
    summary: `Sent ${sent} new patient follow-ups (${newPatients.length} total)`,
    details: { leadIds: newPatients.map((c) => c.id), sent },
  };
}

async function executeTreatmentCoordinator(
  userId: string,
  _industry: Industry,
  template?: { smsTemplate?: string | null } | null
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const deals = await dealService.findMany(ctx, {
    where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'WON' } },
    take: 10,
  } as any);

  let sent = 0;
  const msg = template?.smsTemplate || DEFAULT_TREATMENT_MSG;
  for (const deal of deals) {
    const leadId = (deal as any).leadId;
    if (leadId) {
      const res = await sendSMSToLead(userId, leadId, msg);
      if (res.success) sent++;
      await delay(200);
    }
  }

  return {
    success: true,
    employeeType: 'TREATMENT_COORDINATOR',
    tasksCompleted: sent,
    summary: `Sent ${sent} treatment plan follow-ups (${deals.length} total)`,
    details: { dealIds: deals.map((d) => d.id), sent },
  };
}

async function executeBillingSpecialist(
  userId: string,
  _industry: Industry,
  template?: { emailSubject?: string | null; emailBody?: string | null } | null
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const invoices = await db.invoice
    .findMany({
      where: { userId, status: { in: ['SENT', 'OVERDUE'] } },
      take: 15,
    })
    .catch(() => []);

  let sent = 0;
  const subject = template?.emailSubject || DEFAULT_BILLING_SUBJECT;
  const body = template?.emailBody || DEFAULT_BILLING_BODY;
  for (const inv of invoices ?? []) {
    const leadId = (inv as any).leadId;
    const customerEmail = (inv as any).customerEmail;
    if (leadId) {
      const res = await sendEmailToLead(userId, leadId, subject, body);
      if (res.success) sent++;
    } else if (customerEmail) {
      const res = await sendEmailToAddress(
        userId,
        customerEmail,
        subject,
        body.replace(/\{firstName\}/g, (inv as any).customerName?.split(' ')[0] || 'there')
      );
      if (res.success) sent++;
    }
    await delay(300);
  }

  return {
    success: true,
    employeeType: 'BILLING_SPECIALIST',
    tasksCompleted: sent,
    summary: `Sent ${sent} invoice reminders (${invoices?.length ?? 0} total)`,
    details: { invoiceIds: invoices?.map((i) => i.id) ?? [], sent },
  };
}

const EXECUTORS: Record<
  string,
  (userId: string, industry: Industry, template?: any) => Promise<ExecutionResult>
> = {
  APPOINTMENT_SCHEDULER: executeAppointmentScheduler,
  PATIENT_COORDINATOR: executePatientCoordinator,
  TREATMENT_COORDINATOR: executeTreatmentCoordinator,
  BILLING_SPECIALIST: executeBillingSpecialist,
};

export async function executeIndustryEmployee(
  userId: string,
  industry: Industry,
  employeeType: string,
  options?: { storeHistory?: boolean }
): Promise<ExecutionResult> {
  const module = getIndustryAIEmployeeModule(industry);
  if (!module) {
    return {
      success: false,
      employeeType,
      tasksCompleted: 0,
      summary: `Industry ${industry} does not have AI employees`,
    };
  }

  if (!module.employeeTypes.includes(employeeType)) {
    return {
      success: false,
      employeeType,
      tasksCompleted: 0,
      summary: `Unknown employee type: ${employeeType}`,
    };
  }

  const template = await getTaskTemplate(userId, 'industry', industry, employeeType, employeeType);
  const executor = EXECUTORS[employeeType];
  const result = executor
    ? await executor(userId, industry, template)
    : {
        success: true,
        employeeType,
        tasksCompleted: 0,
        summary: `${employeeType} execution queued. Full implementation coming soon.`,
        details: { status: 'queued' },
      };

  if (options?.storeHistory !== false && result.success) {
    await (prisma as any).industryAIEmployeeExecution.create({
      data: {
        userId,
        industry,
        employeeType,
        status: 'completed',
        result: result as any,
      },
    });
  }

  return result;
}
