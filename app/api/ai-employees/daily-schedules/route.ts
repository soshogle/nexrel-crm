/**
 * AI Employee Daily Schedules API
 * GET: List schedules for current user
 * POST: Create schedule
 * PATCH: Update schedule (runAtTime, enabled, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;
    const employeeType = searchParams.get('employeeType');
    const source = searchParams.get('source');

    const where: any = { userId: session.user.id };
    if (industry) where.industry = industry;
    if (employeeType) where.employeeType = employeeType;
    if (source) where.source = source;

    const schedules = await (prisma as any).aIEmployeeDailySchedule.findMany({
      where,
      orderBy: [{ source: 'asc' }, { employeeType: 'asc' }],
    });

    return NextResponse.json({ success: true, schedules });
  } catch (e: any) {
    console.error('[daily-schedules GET]', e);
    return apiErrors.internal(e.message || 'Failed to fetch schedules');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const {
      employeeType,
      source,
      industry,
      runAtTime,
      runAtTimezone = 'America/New_York',
      enabled = true,
    } = body as {
      employeeType: string;
      source: 'industry' | 're' | 'professional';
      industry?: Industry | null;
      runAtTime: string;
      runAtTimezone?: string;
      enabled?: boolean;
    };

    if (!employeeType || !source || !runAtTime) {
      return apiErrors.badRequest('employeeType, source, and runAtTime required');
    }
    if (source === 'industry' && !industry) {
      return apiErrors.badRequest('industry required for industry employees');
    }

    const resolvedIndustry: Industry | null =
      source === 'industry' ? (industry as Industry) : source === 're' ? 'REAL_ESTATE' : null;

    const schedule = await (prisma as any).aIEmployeeDailySchedule.upsert({
      where: {
        userId_source_industry_employeeType: {
          userId: session.user.id,
          source,
          industry: resolvedIndustry,
          employeeType,
        },
      },
      create: {
        userId: session.user.id,
        employeeType,
        source,
        industry: resolvedIndustry,
        runAtTime: runAtTime.replace(/^(\d):/, '0$1:'), // normalize 9:00 -> 09:00
        runAtTimezone: runAtTimezone || 'America/New_York',
        enabled: enabled ?? true,
      },
      update: {
        runAtTime: runAtTime.replace(/^(\d):/, '0$1:'),
        runAtTimezone: runAtTimezone || 'America/New_York',
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json({ success: true, schedule });
  } catch (e: any) {
    console.error('[daily-schedules POST]', e);
    return apiErrors.internal(e.message || 'Failed to create schedule');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const { scheduleId, runAtTime, runAtTimezone, enabled } = body as {
      scheduleId: string;
      runAtTime?: string;
      runAtTimezone?: string;
      enabled?: boolean;
    };

    if (!scheduleId) return apiErrors.badRequest('scheduleId required');

    const existing = await (prisma as any).aIEmployeeDailySchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    const updateData: Record<string, unknown> = {};
    if (runAtTime !== undefined) updateData.runAtTime = runAtTime.replace(/^(\d):/, '0$1:');
    if (runAtTimezone !== undefined) updateData.runAtTimezone = runAtTimezone;
    if (enabled !== undefined) updateData.enabled = enabled;

    const schedule = await (prisma as any).aIEmployeeDailySchedule.update({
      where: { id: scheduleId },
      data: updateData,
    });

    return NextResponse.json({ success: true, schedule });
  } catch (e: any) {
    console.error('[daily-schedules PATCH]', e);
    return apiErrors.internal(e.message || 'Failed to update schedule');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get('scheduleId');
    if (!scheduleId) return apiErrors.badRequest('scheduleId required');

    const existing = await (prisma as any).aIEmployeeDailySchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!existing || existing.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    await (prisma as any).aIEmployeeDailySchedule.delete({
      where: { id: scheduleId },
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[daily-schedules DELETE]', e);
    return apiErrors.internal(e.message || 'Failed to delete schedule');
  }
}
