/**
 * Per-task schedules API
 * GET: List schedules for an employee (or specific task)
 * POST: Upsert schedule for a task
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { Industry } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') as 'industry' | 're' | 'professional';
    const employeeType = searchParams.get('employeeType');
    const industry = searchParams.get('industry') as Industry | null;
    const taskKey = searchParams.get('taskKey');

    if (!source || !employeeType) return apiErrors.badRequest('source and employeeType required');

    const industryVal = source === 'industry' ? industry : null;

    const where: any = {
      userId: session.user.id,
      source,
      employeeType,
      industry: industryVal,
    };
    if (taskKey) where.taskKey = taskKey;

    const schedules = await (prisma as any).aIEmployeeTaskSchedule.findMany({
      where,
    });

    return NextResponse.json({ success: true, schedules });
  } catch (e: any) {
    console.error('[task-schedules GET]', e);
    return apiErrors.internal(e?.message || 'Failed to fetch schedules');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const {
      source,
      employeeType,
      industry,
      taskKey,
      runAtTime = '09:00',
      runAtTimezone = 'America/New_York',
      enabled = true,
    } = body;

    if (!source || !employeeType || !taskKey) {
      return apiErrors.badRequest('source, employeeType, and taskKey required');
    }

    const industryVal = source === 'industry' ? industry : null;

    const existing = await (prisma as any).aIEmployeeTaskSchedule.findFirst({
      where: {
        userId: session.user.id,
        source,
        industry: industryVal,
        employeeType,
        taskKey,
      },
    });

    const data = {
      runAtTime: String(runAtTime).replace(/^(\d):/, '0$1:').slice(0, 5),
      runAtTimezone: runAtTimezone || 'America/New_York',
      enabled: !!enabled,
    };

    const schedule = existing
      ? await (prisma as any).aIEmployeeTaskSchedule.update({
          where: { id: existing.id },
          data,
        })
      : await (prisma as any).aIEmployeeTaskSchedule.create({
          data: {
            userId: session.user.id,
            source,
            industry: industryVal,
            employeeType,
            taskKey,
            ...data,
          },
        });

    return NextResponse.json({ success: true, schedule });
  } catch (e: any) {
    console.error('[task-schedules POST]', e);
    return apiErrors.internal(e?.message || 'Failed to save schedule');
  }
}
