/**
 * Shared logic for running Industry AI Employee tasks
 * Used by: /api/industry-ai-employees/run and /api/ai-employees/functions
 */

import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService, dealService } from '@/lib/dal';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';
import { prisma } from '@/lib/db';

export interface ExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: Record<string, unknown>;
}

async function executeAppointmentScheduler(
  userId: string,
  _industry: Industry
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

  return {
    success: true,
    employeeType: 'APPOINTMENT_SCHEDULER',
    tasksCompleted: appointments.length,
    summary: `Identified ${appointments.length} appointments to confirm for tomorrow`,
    details: { appointmentIds: appointments.map((a) => a.id) },
  };
}

async function executePatientCoordinator(
  userId: string,
  _industry: Industry
): Promise<ExecutionResult> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const ctx = createDalContext(userId);
  const newPatients = await leadService.findMany(ctx, {
    where: { createdAt: { gte: sevenDaysAgo } },
    take: 15,
  });

  return {
    success: true,
    employeeType: 'PATIENT_COORDINATOR',
    tasksCompleted: newPatients.length,
    summary: `Identified ${newPatients.length} new patients for intake follow-up`,
    details: { leadIds: newPatients.map((c) => c.id) },
  };
}

async function executeTreatmentCoordinator(
  userId: string,
  _industry: Industry
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const deals = await dealService.findMany(ctx, {
    where: { createdAt: { gte: thirtyDaysAgo }, status: { not: 'WON' } },
    take: 10,
  } as any);

  return {
    success: true,
    employeeType: 'TREATMENT_COORDINATOR',
    tasksCompleted: deals.length,
    summary: `Identified ${deals.length} treatment plans for follow-up`,
    details: { dealIds: deals.map((d) => d.id) },
  };
}

async function executeBillingSpecialist(
  userId: string,
  _industry: Industry
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const invoices = await db.invoice
    .findMany({
      where: { userId, status: { in: ['SENT', 'OVERDUE'] } },
      take: 15,
    })
    .catch(() => []);

  return {
    success: true,
    employeeType: 'BILLING_SPECIALIST',
    tasksCompleted: invoices?.length ?? 0,
    summary: `Identified ${invoices?.length ?? 0} pending invoices for follow-up`,
    details: { invoiceIds: invoices?.map((i) => i.id) ?? [] },
  };
}

const EXECUTORS: Record<
  string,
  (userId: string, industry: Industry) => Promise<ExecutionResult>
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

  const executor = EXECUTORS[employeeType];
  const result = executor
    ? await executor(userId, industry)
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
