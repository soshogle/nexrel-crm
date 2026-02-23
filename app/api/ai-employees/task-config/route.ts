/**
 * GET /api/ai-employees/task-config?agentId=xxx
 * PATCH /api/ai-employees/task-config - body: { agentId, taskKey, enabled }
 * POST /api/ai-employees/task-config - body: { description, agentId?, source, employeeType, industry } - add custom task
 * DELETE /api/ai-employees/task-config - body: { taskKey, agentId?, source, employeeType, industry } - remove custom task
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

    // Merge custom tasks (industry only)
    let customTasks: { taskKey: string; enabled: boolean; description: string; isCustom: true }[] = [];
    if (ctx.source === 'industry' && ctx.industry) {
      const custom = await (prisma as any).aIEmployeeCustomTask.findMany({
        where: {
          userId: ctx.userId,
          source: 'industry',
          industry: ctx.industry,
          employeeType: ctx.employeeType,
        },
      });
      customTasks = custom.map((c: any) => ({
        taskKey: c.taskKey,
        enabled: configMap.get(c.taskKey)?.enabled ?? true,
        description: c.description,
        isCustom: true as const,
      }));
    }

    const defaultTaskKeys = new Set(defaultTasks.map((dt) => dt.taskKey));
    const tasks = [
      ...defaultTasks.map((dt) => ({
        taskKey: dt.taskKey,
        enabled: configMap.get(dt.taskKey)?.enabled ?? dt.enabled,
        description: dt.description,
        isCustom: false as const,
      })),
      ...customTasks.filter((ct) => !defaultTaskKeys.has(ct.taskKey)),
    ];

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

    // Prisma compound unique with nullable industry rejects null in upsert where.
    // Use findFirst + update/create instead.
    const existing = await (prisma as any).aIEmployeeTaskConfig.findFirst({
      where: {
        userId: ctx.userId,
        source: ctx.source,
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });

    if (existing) {
      await (prisma as any).aIEmployeeTaskConfig.update({
        where: { id: existing.id },
        data: { enabled: enabled ?? true },
      });
    } else {
      await (prisma as any).aIEmployeeTaskConfig.create({
        data: {
          userId: ctx.userId,
          source: ctx.source,
          industry: industryVal,
          employeeType: ctx.employeeType,
          taskKey,
          enabled: enabled ?? true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Task "${taskKey}" is now ${enabled ? 'enabled' : 'disabled'}.`,
    });
  } catch (e: any) {
    console.error('[task-config PATCH]', e);
    return apiErrors.internal(e.message || 'Failed to update task config');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const {
      agentId,
      description,
      source: bodySource,
      employeeType: bodyEmployeeType,
      industry: bodyIndustry,
    } = body;

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return apiErrors.badRequest('description required');
    }

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
    if (ctx.source !== 'industry' || !ctx.industry) {
      return apiErrors.badRequest('Custom tasks are only available for industry AI employees');
    }

    const taskKey = slugify(description.trim());
    if (taskKey.length === 0) return apiErrors.badRequest('Description must contain at least one letter or number');

    const industryVal = ctx.industry;

    const existing = await (prisma as any).aIEmployeeCustomTask.findFirst({
      where: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });
    if (existing) {
      return apiErrors.badRequest('A task with this description already exists');
    }

    await (prisma as any).aIEmployeeCustomTask.create({
      data: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
        description: description.trim(),
      },
    });

    const existingConfig = await (prisma as any).aIEmployeeTaskConfig.findFirst({
      where: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });
    if (!existingConfig) {
      await (prisma as any).aIEmployeeTaskConfig.create({
        data: {
          userId: ctx.userId,
          source: 'industry',
          industry: industryVal,
          employeeType: ctx.employeeType,
          taskKey,
          enabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Custom task added',
      task: { taskKey, description: description.trim(), isCustom: true },
    });
  } catch (e: any) {
    console.error('[task-config POST]', e);
    return apiErrors.internal(e.message || 'Failed to add custom task');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const body = await request.json().catch(() => ({}));
    const {
      agentId,
      taskKey,
      source: bodySource,
      employeeType: bodyEmployeeType,
      industry: bodyIndustry,
    } = body;

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
    if (ctx.source !== 'industry' || !ctx.industry) {
      return apiErrors.badRequest('Custom task removal is only for industry AI employees');
    }

    const industryVal = ctx.industry;

    const custom = await (prisma as any).aIEmployeeCustomTask.findFirst({
      where: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });

    if (!custom) {
      return apiErrors.badRequest('Custom task not found');
    }

    await (prisma as any).aIEmployeeCustomTask.delete({ where: { id: custom.id } });
    await (prisma as any).aIEmployeeTaskConfig.deleteMany({
      where: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });
    await (prisma as any).aIEmployeeTaskSchedule.deleteMany({
      where: {
        userId: ctx.userId,
        source: 'industry',
        industry: industryVal,
        employeeType: ctx.employeeType,
        taskKey,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Custom task removed',
    });
  } catch (e: any) {
    console.error('[task-config DELETE]', e);
    return apiErrors.internal(e.message || 'Failed to remove custom task');
  }
}
