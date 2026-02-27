/**
 * Dental Payment Plans API
 * CRUD for installment-based payment plans (ortho, implants, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function parseDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function generateInstallments(
  totalAmount: number,
  downPayment: number,
  numberOfPayments: number,
  startDate: Date,
  frequency: string
) {
  const remaining = totalAmount - downPayment;
  const perPayment = Math.round((remaining / numberOfPayments) * 100) / 100;
  const installments = [];

  for (let i = 0; i < numberOfPayments; i++) {
    const dueDate = new Date(startDate);
    switch (frequency) {
      case 'WEEKLY':
        dueDate.setDate(dueDate.getDate() + (i + 1) * 7);
        break;
      case 'BIWEEKLY':
        dueDate.setDate(dueDate.getDate() + (i + 1) * 14);
        break;
      case 'QUARTERLY':
        dueDate.setMonth(dueDate.getMonth() + (i + 1) * 3);
        break;
      default: // MONTHLY
        dueDate.setMonth(dueDate.getMonth() + (i + 1));
    }

    const isLast = i === numberOfPayments - 1;
    const amount = isLast
      ? Math.round((remaining - perPayment * (numberOfPayments - 1)) * 100) / 100
      : perPayment;

    installments.push({
      number: i + 1,
      dueDate: dueDate.toISOString(),
      amount,
      status: 'pending',
      paidAt: null,
      stripePaymentIntentId: null,
    });
  }

  return installments;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized(await t('api.unauthorized'));
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const clinicId = searchParams.get('clinicId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (clinicId) where.clinicId = clinicId;
    if (status) where.status = status;

    const plans = await db.dentalPaymentPlan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, plans });
  } catch (error) {
    console.error('Error fetching payment plans:', error);
    return apiErrors.internal(await t('api.fetchTreatmentPlansFailed'));
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized(await t('api.unauthorized'));
    const db = getRouteDb(session);

    const body = await request.json();
    const {
      id,
      leadId,
      clinicId,
      planName,
      totalAmount,
      downPayment = 0,
      numberOfPayments,
      paymentFrequency = 'MONTHLY',
      interestRate = 0,
      currency = 'CAD',
      startDate,
      treatmentPlanId,
      orthoTreatmentId,
      notes,
      status,
      installments: providedInstallments,
    } = body;

    if (!id && (!leadId || !clinicId || !planName || !totalAmount || !numberOfPayments || !startDate)) {
      return apiErrors.badRequest('leadId, clinicId, planName, totalAmount, numberOfPayments, and startDate are required');
    }

    const parsedStart = parseDate(startDate);

    if (id) {
      const existing = await db.dentalPaymentPlan.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!existing) return apiErrors.notFound(await t('api.notFound'));

      const updated = await db.dentalPaymentPlan.update({
        where: { id },
        data: {
          ...(planName && { planName }),
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(providedInstallments && { installments: providedInstallments }),
          ...(parsedStart && { startDate: parsedStart }),
        },
      });
      return NextResponse.json({ success: true, plan: updated });
    }

    const paymentAmount = Math.round(((totalAmount - downPayment) / numberOfPayments) * 100) / 100;
    const installments = generateInstallments(totalAmount, downPayment, numberOfPayments, parsedStart!, paymentFrequency);
    const nextPaymentDate = parseDate(installments[0]?.dueDate);

    const plan = await db.dentalPaymentPlan.create({
      data: {
        leadId,
        userId: session.user.id,
        clinicId,
        planName,
        totalAmount,
        downPayment,
        numberOfPayments,
        paymentAmount,
        paymentFrequency,
        interestRate,
        currency,
        status: 'ACTIVE',
        startDate: parsedStart!,
        nextPaymentDate,
        treatmentPlanId: treatmentPlanId || null,
        orthoTreatmentId: orthoTreatmentId || null,
        installments,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, plan });
  } catch (error: unknown) {
    console.error('Error saving payment plan:', error);
    return apiErrors.internal(await t('api.saveTreatmentPlanFailed'), (error as Error).message);
  }
}

// Record a payment against an installment
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized(await t('api.unauthorized'));
    const db = getRouteDb(session);

    const body = await request.json();
    const { planId, installmentNumber } = body;

    if (!planId || !installmentNumber) {
      return apiErrors.badRequest('planId and installmentNumber are required');
    }

    const plan = await db.dentalPaymentPlan.findFirst({
      where: { id: planId, userId: session.user.id },
    });
    if (!plan) return apiErrors.notFound(await t('api.notFound'));

    const installments = (plan.installments as any[]) || [];
    const idx = installments.findIndex((i: any) => i.number === installmentNumber);
    if (idx === -1) return apiErrors.badRequest('Installment not found');

    installments[idx].status = 'paid';
    installments[idx].paidAt = new Date().toISOString();

    const allPaid = installments.every((i: any) => i.status === 'paid');
    const nextUnpaid = installments.find((i: any) => i.status === 'pending');

    const updated = await db.dentalPaymentPlan.update({
      where: { id: planId },
      data: {
        installments,
        status: allPaid ? 'COMPLETED' : plan.status,
        nextPaymentDate: nextUnpaid ? parseDate(nextUnpaid.dueDate) : null,
      },
    });

    return NextResponse.json({ success: true, plan: updated });
  } catch (error: unknown) {
    console.error('Error recording payment:', error);
    return apiErrors.internal('Failed to record payment', (error as Error).message);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized(await t('api.unauthorized'));
    const db = getRouteDb(session);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return apiErrors.badRequest('id is required');

    const existing = await db.dentalPaymentPlan.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) return apiErrors.notFound(await t('api.notFound'));

    await db.dentalPaymentPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting payment plan:', error);
    return apiErrors.internal('Failed to delete payment plan', (error as Error).message);
  }
}
