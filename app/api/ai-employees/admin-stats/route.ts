/**
 * AI Employee Admin Stats - Phase 5
 * Platform-wide stats (ADMIN/SUPER_ADMIN only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    const role = (user?.role || (session.user as any).role) as string;
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return apiErrors.forbidden();
    }

    const since = new Date();
    since.setDate(since.getDate() - 1); // Last 24h

    const [scheduleCount, industryExecs, reExecs] = await Promise.all([
      (prisma as any).aIEmployeeDailySchedule.count({ where: { enabled: true } }),
      (prisma as any).industryAIEmployeeExecution.count({ where: { createdAt: { gte: since } } }),
      prisma.rEAIEmployeeExecution.count({ where: { createdAt: { gte: since } } }),
    ]);

    const uniqueUsersWithSchedules = await (prisma as any).aIEmployeeDailySchedule.groupBy({
      by: ['userId'],
      where: { enabled: true },
      _count: { userId: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        activeSchedules: scheduleCount,
        uniqueUsersWithSchedules: uniqueUsersWithSchedules.length,
        industryExecutions24h: industryExecs,
        reExecutions24h: reExecs,
        totalExecutions24h: industryExecs + reExecs,
      },
    });
  } catch (e: any) {
    console.error('[admin-stats]', e);
    return apiErrors.internal(e?.message || 'Failed to fetch stats');
  }
}
