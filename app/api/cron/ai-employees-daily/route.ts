/**
 * Cron: Run AI Employee daily schedules
 * Runs every 15 minutes. For each enabled schedule, checks if current time
 * in user's timezone matches runAtTime (within 15-min window), then executes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { executeIndustryEmployee } from '@/lib/ai-employees/run-industry-employee';
import { Industry } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function isDueNow(schedule: {
  runAtTime: string;
  runAtTimezone: string;
  lastRunAt: Date | null;
}): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: schedule.runAtTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '0';
  const currentHour = parseInt(get('hour'), 10);
  const currentMin = parseInt(get('minute'), 10);
  const currentDay = `${get('year')}-${get('month')}-${get('day')}`;

  const [runHour, runMin] = schedule.runAtTime.split(':').map((s) => parseInt(s, 10) || 0);
  const runMinutes = runHour * 60 + runMin;
  const currentMinutes = currentHour * 60 + currentMin;

  // Within 15-min window of runAtTime
  const inWindow = currentMinutes >= runMinutes && currentMinutes < runMinutes + 15;
  if (!inWindow) return false;

  // Avoid duplicate runs: if we already ran today (in user TZ), skip
  if (schedule.lastRunAt) {
    const lastParts = formatter.formatToParts(schedule.lastRunAt);
    const lastDay = `${lastParts.find((p) => p.type === 'year')?.value}-${lastParts.find((p) => p.type === 'month')?.value}-${lastParts.find((p) => p.type === 'day')?.value}`;
    if (lastDay === currentDay) return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return apiErrors.unauthorized();
  }

  const schedules = await (prisma as any).aIEmployeeDailySchedule.findMany({
    where: { enabled: true },
    orderBy: { userId: 'asc' },
  });

  const results: Array<{
    scheduleId: string;
    userId: string;
    employeeType: string;
    source: string;
    industry: string | null;
    success: boolean;
    summary?: string;
    error?: string;
  }> = [];

  for (const schedule of schedules) {
    if (!isDueNow(schedule)) continue;

    try {
      if (schedule.source === 'industry' && schedule.industry) {
        const result = await executeIndustryEmployee(
          schedule.userId,
          schedule.industry as Industry,
          schedule.employeeType,
          { storeHistory: true }
        );
        results.push({
          scheduleId: schedule.id,
          userId: schedule.userId,
          employeeType: schedule.employeeType,
          source: schedule.source,
          industry: schedule.industry,
          success: result.success,
          summary: result.summary,
        });
      } else if (schedule.source === 're') {
        const { executeREEmployee } = await import('@/lib/ai-employees/run-re-employee');
        const result = await executeREEmployee(schedule.userId, schedule.employeeType as any, {
          storeHistory: true,
        });
        results.push({
          scheduleId: schedule.id,
          userId: schedule.userId,
          employeeType: schedule.employeeType,
          source: schedule.source,
          industry: null,
          success: result.success,
          summary: result.summary,
        });
      } else {
        results.push({
          scheduleId: schedule.id,
          userId: schedule.userId,
          employeeType: schedule.employeeType,
          source: schedule.source,
          industry: schedule.industry,
          success: false,
          error: `Source ${schedule.source} not yet supported for daily run`,
        });
      }

      await (prisma as any).aIEmployeeDailySchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: new Date() },
      });
    } catch (err: any) {
      results.push({
        scheduleId: schedule.id,
        userId: schedule.userId,
        employeeType: schedule.employeeType,
        source: schedule.source,
        industry: schedule.industry,
        success: false,
        error: err?.message || 'Execution failed',
      });
    }
  }

  return NextResponse.json({
    success: true,
    processed: results.length,
    results,
  });
}
