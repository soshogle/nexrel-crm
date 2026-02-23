/**
 * Unified Activity API - Phase 3
 * Returns combined feed of AI employee executions + human tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export interface UnifiedActivityItem {
  id: string;
  type: 'ai_industry' | 'ai_re' | 'human_task';
  date: string;
  title: string;
  summary?: string;
  status: string;
  source?: string;
  employeeType?: string;
  tasksCompleted?: number;
  leadId?: string;
  dealId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 30);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const items: UnifiedActivityItem[] = [];

    // Industry AI executions
    const industryExecs = await (prisma as any).industryAIEmployeeExecution.findMany({
      where: { userId: ctx.userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    for (const e of industryExecs) {
      const result = (e.result as any) || {};
      items.push({
        id: e.id,
        type: 'ai_industry',
        date: e.createdAt.toISOString(),
        title: `${e.employeeType} (${e.industry})`,
        summary: result.summary,
        status: e.status,
        source: 'industry',
        employeeType: e.employeeType,
        tasksCompleted: result.tasksCompleted,
      });
    }

    // RE AI executions
    const reExecs = await prisma.rEAIEmployeeExecution.findMany({
      where: { userId: ctx.userId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    for (const e of reExecs) {
      const result = (e.result as any) || {};
      items.push({
        id: e.id,
        type: 'ai_re',
        date: (e.completedAt || e.createdAt).toISOString(),
        title: String(e.employeeType),
        summary: result.summary,
        status: e.status,
        source: 're',
        employeeType: String(e.employeeType),
        tasksCompleted: result.tasksCompleted,
      });
    }

    // Human tasks (completed)
    const db = getCrmDb(ctx);
    const tasks = await db.task.findMany({
      where: {
        OR: [{ userId: ctx.userId }, { assignedToId: ctx.userId }],
        status: 'COMPLETED',
        completedAt: { gte: since, not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: limit,
      include: {
        lead: { select: { id: true, businessName: true, contactPerson: true } },
      },
    });
    for (const t of tasks) {
      items.push({
        id: t.id,
        type: 'human_task',
        date: (t.completedAt || t.updatedAt).toISOString(),
        title: t.title,
        summary: t.description || undefined,
        status: t.status,
        leadId: t.leadId || undefined,
        dealId: t.dealId || undefined,
      });
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Trim to limit
    const trimmed = items.slice(0, limit);

    return NextResponse.json({
      success: true,
      items: trimmed,
      total: items.length,
    });
  } catch (e: any) {
    console.error('[unified-activity GET]', e);
    return apiErrors.internal(e?.message || 'Failed to fetch activity');
  }
}
