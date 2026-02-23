/**
 * GET /api/ai-employees/task-config?agentId=xxx
 * PATCH /api/ai-employees/task-config - body: { agentId, taskKey, enabled }
 * Task dashboard: fetch config and update toggles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';

type AgentContext = {
  userId: string;
  source: 'industry' | 're' | 'professional';
  industry?: Industry | null;
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

function getTaskDescription(ctx: AgentContext, taskKey: string): string {
  if (taskKey === 'run') {
    if (ctx.source === 'industry' && ctx.industry) {
      const module = getIndustryAIEmployeeModule(ctx.industry);
      const config = module?.configs?.[ctx.employeeType];
      return config?.description || 'Run this employee\'s main task';
    }
    if (ctx.source === 're') return 'Run this employee\'s main task';
    return 'Run tasks';
  }
  return taskKey;
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

    const configs = await (prisma as any).aIEmployeeTaskConfig.findMany({
      where: {
        userId: ctx.userId,
        source: ctx.source,
        industry: ctx.source === 'industry' ? ctx.industry : null,
        employeeType: ctx.employeeType,
      },
    });

    const tasks =
      configs.length > 0
        ? configs.map((c: any) => ({
            taskKey: c.taskKey,
            enabled: c.enabled,
            description: getTaskDescription(ctx, c.taskKey),
          }))
        : [{ taskKey: 'run', enabled: true, description: getTaskDescription(ctx, 'run') }];

    return NextResponse.json({ success: true, tasks });
  } catch (e: any) {
    console.error('[task-config GET]', e);
    return apiErrors.internal(e.message || 'Failed to fetch task config');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const { agentId, taskKey, enabled } = body;
    if (!agentId || !taskKey) return apiErrors.badRequest('agentId and taskKey required');

    const ctx = await resolveAgent(agentId);
    if (!ctx || ctx.userId !== session.user.id) return apiErrors.forbidden();

    const industryVal = ctx.source === 'industry' ? ctx.industry : null;
    await (prisma as any).aIEmployeeTaskConfig.upsert({
      where: {
        userId_source_industry_employeeType_taskKey: {
          userId: ctx.userId,
          source: ctx.source,
          industry: industryVal,
          employeeType: ctx.employeeType,
          taskKey,
        },
      },
      create: {
        userId: ctx.userId,
        source: ctx.source,
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
        enabled: enabled ?? true,
      },
      update: { enabled: enabled ?? true },
    });

    return NextResponse.json({
      success: true,
      message: `Task "${taskKey}" is now ${enabled ? 'enabled' : 'disabled'}.`,
    });
  } catch (e: any) {
    console.error('[task-config PATCH]', e);
    return apiErrors.internal(e.message || 'Failed to update task config');
  }
}
