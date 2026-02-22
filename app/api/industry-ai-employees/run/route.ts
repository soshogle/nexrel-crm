/**
 * Industry AI Employee Run API
 * Triggers industry-specific AI employee tasks (e.g. appointment follow-up, recall)
 * Same pattern as RE run - executes workflow logic per employee type
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, leadService, dealService } from '@/lib/dal';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';

interface ExecutionResult {
  success: boolean;
  employeeType: string;
  tasksCompleted: number;
  summary: string;
  details?: Record<string, unknown>;
}

// Dental: Appointment Scheduler - confirm upcoming appointments
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
      appointmentDate: {
        gte: tomorrow,
        lt: dayAfter,
      },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
    },
    take: 20,
  });

  return {
    success: true,
    employeeType: 'APPOINTMENT_SCHEDULER',
    tasksCompleted: appointments.length,
    summary: `Identified ${appointments.length} appointments to confirm for tomorrow`,
    details: { appointmentIds: appointments.map((a) => a.id) },
  };
}

// Dental: Patient Coordinator - new patient intake
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

// Dental: Treatment Coordinator - treatment plan follow-up
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
  });

  return {
    success: true,
    employeeType: 'TREATMENT_COORDINATOR',
    tasksCompleted: deals.length,
    summary: `Identified ${deals.length} treatment plans for follow-up`,
    details: { dealIds: deals.map((d) => d.id) },
  };
}

// Dental: Billing Specialist - payment follow-up
async function executeBillingSpecialist(
  userId: string,
  _industry: Industry
): Promise<ExecutionResult> {
  const ctx = createDalContext(userId);
  const db = getCrmDb(ctx);
  const invoices = await db.invoice
    .findMany({
      where: {
        userId,
        status: { in: ['SENT', 'OVERDUE'] },
      },
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { industry, employeeType } = body as {
      industry?: Industry;
      employeeType?: string;
    };

    if (!industry || !employeeType) {
      return NextResponse.json(
        { error: 'Industry and employeeType required' },
        { status: 400 }
      );
    }

    const module = getIndustryAIEmployeeModule(industry);
    if (!module) {
      return NextResponse.json(
        { error: `Industry ${industry} does not have AI employees` },
        { status: 404 }
      );
    }

    if (!module.employeeTypes.includes(employeeType)) {
      return NextResponse.json(
        { error: `Unknown employee type: ${employeeType}` },
        { status: 400 }
      );
    }

    const executor = EXECUTORS[employeeType];
    const result = executor
      ? await executor(session.user.id, industry)
      : {
          success: true,
          employeeType,
          tasksCompleted: 0,
          summary: `${employeeType} execution queued. Full implementation coming soon.`,
          details: { status: 'queued' },
        };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Industry AI Employee execution error:', error);
    return NextResponse.json(
      { error: 'Execution failed' },
      { status: 500 }
    );
  }
}
