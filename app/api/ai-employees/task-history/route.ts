/**
 * GET /api/ai-employees/task-history?agentId=xxx&limit=10
 * Task dashboard: fetch execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

type AgentContext = {
  userId: string;
  source: 'industry' | 're' | 'professional';
  industry?: string | null;
  employeeType: string;
};

async function resolveAgent(agentId: string): Promise<AgentContext | null> {
  const industryAgent = await (prisma as any).industryAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (industryAgent) {
    return {
      userId: industryAgent.userId,
      source: 'industry',
      industry: industryAgent.industry,
      employeeType: industryAgent.employeeType,
    };
  }
  const reAgent = await (prisma as any).rEAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (reAgent) {
    return {
      userId: reAgent.userId,
      source: 're',
      industry: null,
      employeeType: reAgent.employeeType,
    };
  }
  const profAgent = await (prisma as any).professionalAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (profAgent) {
    return {
      userId: profAgent.userId,
      source: 'professional',
      industry: null,
      employeeType: profAgent.employeeType,
    };
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return apiErrors.badRequest('agentId required');

    const ctx = await resolveAgent(agentId);
    if (!ctx || ctx.userId !== session.user.id) return apiErrors.forbidden();

    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 20);

    if (ctx.source === 'industry' && ctx.industry) {
      const executions = await (prisma as any).industryAIEmployeeExecution.findMany({
        where: {
          userId: ctx.userId,
          industry: ctx.industry,
          employeeType: ctx.employeeType,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return NextResponse.json({
        success: true,
        history: executions.map((e: any) => ({
          id: e.id,
          date: e.createdAt,
          status: e.status,
          summary: (e.result as any)?.summary,
          tasksCompleted: (e.result as any)?.tasksCompleted,
          details: (e.result as any)?.details,
        })),
      });
    }

    if (ctx.source === 're') {
      const executions = await (prisma as any).rEAIEmployeeExecution.findMany({
        where: {
          userId: ctx.userId,
          employeeType: ctx.employeeType,
        },
        orderBy: { completedAt: 'desc' },
        take: limit,
      });
      return NextResponse.json({
        success: true,
        history: executions.map((e: any) => ({
          id: e.id,
          date: e.completedAt,
          status: e.status,
          summary: (e.result as any)?.summary,
          tasksCompleted: (e.result as any)?.tasksCompleted,
          details: (e.result as any)?.details,
        })),
      });
    }

    return NextResponse.json({ success: true, history: [] });
  } catch (e: any) {
    console.error('[task-history GET]', e);
    return apiErrors.internal(e.message || 'Failed to fetch task history');
  }
}
