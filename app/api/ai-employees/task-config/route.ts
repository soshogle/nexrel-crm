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
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from '@/lib/professional-ai-employees/config';
import { getREEmployeeConfig } from '@/lib/real-estate/ai-employees/configs';

type AgentContext = {
  userId: string;
  source: 'industry' | 're' | 'professional';
  industry?: Industry | null;
  employeeType: string;
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

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
    if (ctx.source === 're') {
      const reConfig = getREEmployeeConfig(ctx.employeeType as any);
      return reConfig?.description || 'Run this employee\'s main task';
    }
    return 'Run tasks';
  }
  return taskKey;
}

function getDefaultTasks(ctx: AgentContext): { taskKey: string; enabled: boolean; description: string }[] {
  if (ctx.source === 'professional') {
    const config = PROFESSIONAL_EMPLOYEE_CONFIGS[ctx.employeeType as keyof typeof PROFESSIONAL_EMPLOYEE_CONFIGS];
    if (config?.capabilities?.length) {
      return config.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: config?.fullDescription || 'Conversational assistant' }];
  }
  if (ctx.source === 'industry' && ctx.industry) {
    const module = getIndustryAIEmployeeModule(ctx.industry);
    const config = module?.configs?.[ctx.employeeType] as { capabilities?: string[]; description?: string } | undefined;
    if (config?.capabilities?.length) {
      return config.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: config?.description || 'Run this employee\'s main task' }];
  }
  if (ctx.source === 're') {
    const reConfig = getREEmployeeConfig(ctx.employeeType as any);
    if (reConfig?.capabilities?.length) {
      return reConfig.capabilities.map((cap) => ({
        taskKey: slugify(cap),
        enabled: true,
        description: cap,
      }));
    }
    return [{ taskKey: 'run', enabled: true, description: reConfig?.description || 'Run this employee\'s main task' }];
  }
  return [{ taskKey: 'run', enabled: true, description: 'Run tasks' }];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const source = searchParams.get('source') as 'industry' | 're' | 'professional' | null;
    const employeeType = searchParams.get('employeeType');
    const industry = searchParams.get('industry') as Industry | null;

    let ctx: AgentContext | null = null;

    if (agentId) {
      ctx = await resolveAgent(agentId);
    }

    // Fallback: when agentId fails or not provided, use source + employeeType (for RE/Industry)
    if (!ctx && source && employeeType && (source === 're' || source === 'industry' || source === 'professional')) {
      ctx = {
        userId: session.user.id,
        source,
        industry: source === 'industry' ? industry ?? null : null,
        employeeType,
      };
    }

    if (!ctx || ctx.userId !== session.user.id) return apiErrors.forbidden();

    const configs = await (prisma as any).aIEmployeeTaskConfig.findMany({
      where: {
        userId: ctx.userId,
        source: ctx.source,
        industry: ctx.source === 'industry' ? ctx.industry : null,
        employeeType: ctx.employeeType,
      },
    });

    const defaultTasks = getDefaultTasks(ctx);
    const configMap = new Map(configs.map((c: any) => [c.taskKey, c]));

    const tasks = defaultTasks.map((dt) => {
      const saved = configMap.get(dt.taskKey);
      return {
        taskKey: dt.taskKey,
        enabled: saved ? saved.enabled : dt.enabled,
        description: dt.description,
      };
    });

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
    const { agentId, taskKey, enabled, source: bodySource, employeeType: bodyEmployeeType, industry: bodyIndustry } = body;
    if (!taskKey) return apiErrors.badRequest('taskKey required');

    let ctx: AgentContext | null = null;
    if (agentId) ctx = await resolveAgent(agentId);
    if (!ctx && bodySource && bodyEmployeeType) {
      ctx = {
        userId: session.user.id,
        source: bodySource,
        industry: bodySource === 'industry' ? bodyIndustry ?? null : null,
        employeeType: bodyEmployeeType,
      };
    }
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
