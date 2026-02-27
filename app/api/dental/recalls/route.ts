/**
 * Dental Recall System API
 * CRUD for recurring appointment schedules (ortho checks, cleanings, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + weeks * 7);
  return result;
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
    const overdueOnly = searchParams.get('overdueOnly') === 'true';

    const where: Record<string, unknown> = { userId: session.user.id };
    if (leadId) where.leadId = leadId;
    if (clinicId) where.clinicId = clinicId;
    if (status) where.status = status;
    if (overdueOnly) {
      where.nextDueDate = { lt: new Date() };
      where.status = { in: ['ACTIVE', 'OVERDUE'] };
    }

    const recalls = await db.dentalRecall.findMany({
      where,
      orderBy: { nextDueDate: 'asc' },
      include: {
        lead: { select: { contactPerson: true, phone: true, email: true } },
      },
    });

    // Update daysOverdue for each recall
    const now = new Date();
    const enriched = recalls.map((r: any) => ({
      ...r,
      daysOverdue: r.nextDueDate < now
        ? Math.floor((now.getTime() - new Date(r.nextDueDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      daysUntilDue: r.nextDueDate >= now
        ? Math.floor((new Date(r.nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    return NextResponse.json({ success: true, recalls: enriched });
  } catch (error) {
    console.error('Error fetching recalls:', error);
    return apiErrors.internal('Failed to fetch recalls');
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
      recallType,
      intervalWeeks,
      lastVisitDate,
      autoSchedule = false,
      preferredDay,
      preferredTime,
      notes,
      status,
    } = body;

    if (id) {
      const existing = await db.dentalRecall.findFirst({
        where: { id, userId: session.user.id },
      });
      if (!existing) return apiErrors.notFound(await t('api.notFound'));

      const updateData: Record<string, unknown> = {};
      if (recallType) updateData.recallType = recallType;
      if (intervalWeeks) updateData.intervalWeeks = intervalWeeks;
      if (status) updateData.status = status;
      if (autoSchedule !== undefined) updateData.autoSchedule = autoSchedule;
      if (preferredDay !== undefined) updateData.preferredDay = preferredDay;
      if (preferredTime !== undefined) updateData.preferredTime = preferredTime;
      if (notes !== undefined) updateData.notes = notes;

      if (lastVisitDate) {
        const visitDate = new Date(lastVisitDate);
        updateData.lastVisitDate = visitDate;
        updateData.nextDueDate = addWeeks(visitDate, intervalWeeks || existing.intervalWeeks);
        updateData.status = 'ACTIVE';
        updateData.remindersSent = 0;
      }

      const updated = await db.dentalRecall.update({
        where: { id },
        data: updateData,
      });

      return NextResponse.json({ success: true, recall: updated });
    }

    if (!leadId || !clinicId || !recallType || !intervalWeeks) {
      return apiErrors.badRequest('leadId, clinicId, recallType, and intervalWeeks are required');
    }

    const nextDueDate = lastVisitDate
      ? addWeeks(new Date(lastVisitDate), intervalWeeks)
      : addWeeks(new Date(), intervalWeeks);

    const recall = await db.dentalRecall.create({
      data: {
        leadId,
        userId: session.user.id,
        clinicId,
        recallType,
        intervalWeeks,
        status: 'ACTIVE',
        lastVisitDate: lastVisitDate ? new Date(lastVisitDate) : null,
        nextDueDate,
        autoSchedule,
        preferredDay: preferredDay || null,
        preferredTime: preferredTime || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, recall });
  } catch (error: unknown) {
    console.error('Error saving recall:', error);
    return apiErrors.internal('Failed to save recall', (error as Error).message);
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

    const existing = await db.dentalRecall.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) return apiErrors.notFound(await t('api.notFound'));

    await db.dentalRecall.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting recall:', error);
    return apiErrors.internal('Failed to delete recall', (error as Error).message);
  }
}
