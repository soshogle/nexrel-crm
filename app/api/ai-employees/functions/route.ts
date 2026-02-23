/**
 * AI Employee Voice Agent Functions
 * Handles function calls from ElevenLabs when user talks to an AI employee:
 * - get_my_task_history: What has this employee done?
 * - run_my_tasks: Run this employee's tasks now
 * - get_my_task_config: What tasks are enabled?
 * - update_my_task_toggles: Enable/disable specific tasks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';
import { executeIndustryEmployee } from '@/lib/ai-employees/run-industry-employee';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AgentContext = {
  userId: string;
  source: 'industry' | 're' | 'professional';
  industry?: Industry | null;
  employeeType: string;
  agentName: string;
};

async function resolveAgent(agentId: string): Promise<AgentContext | null> {
  // Try Industry AI Employee
  const industryAgent = await (prisma as any).industryAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (industryAgent) {
    return {
      userId: industryAgent.userId,
      source: 'industry',
      industry: industryAgent.industry,
      employeeType: industryAgent.employeeType,
      agentName: industryAgent.name,
    };
  }

  // Try RE AI Employee
  const reAgent = await (prisma as any).rEAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (reAgent) {
    return {
      userId: reAgent.userId,
      source: 're',
      industry: null,
      employeeType: reAgent.employeeType,
      agentName: reAgent.name,
    };
  }

  // Try Professional AI Employee
  const profAgent = await (prisma as any).professionalAIEmployeeAgent.findUnique({
    where: { id: agentId },
  });
  if (profAgent) {
    return {
      userId: profAgent.userId,
      source: 'professional',
      industry: null,
      employeeType: profAgent.employeeType,
      agentName: profAgent.name,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) {
      return apiErrors.badRequest('agentId required');
    }

    const ctx = await resolveAgent(agentId);
    if (!ctx) {
      return apiErrors.notFound('Agent not found');
    }

    // Verify user owns this agent (session check)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== ctx.userId) {
      return apiErrors.unauthorized();
    }

    const body = await req.json().catch(() => ({}));
    const { function_name, parameters = {} } = body as {
      function_name?: string;
      parameters?: Record<string, unknown>;
    };

    if (!function_name) {
      return apiErrors.badRequest('function_name required');
    }

    let result: unknown;

    switch (function_name) {
      case 'get_my_task_history':
        result = await getTaskHistory(ctx, parameters);
        break;
      case 'run_my_tasks':
        result = await runTasks(ctx, agentId, req);
        break;
      case 'get_my_task_config':
        result = await getTaskConfig(ctx);
        break;
      case 'update_my_task_toggles':
        result = await updateTaskToggles(ctx, parameters);
        break;
      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[AI Employee Functions] Error:', error);
    return apiErrors.internal(error.message || 'Function execution failed');
  }
}

async function getTaskHistory(
  ctx: AgentContext,
  params: { limit?: number }
): Promise<{ success: boolean; history: any[]; message: string }> {
  const limit = Math.min(params.limit || 10, 20);

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
    return {
      success: true,
      history: executions.map((e: any) => ({
        date: e.createdAt,
        status: e.status,
        summary: (e.result as any)?.summary,
        tasksCompleted: (e.result as any)?.tasksCompleted,
      })),
      message: `I've completed ${executions.length} run(s). ${executions[0] ? `Last: ${(executions[0].result as any)?.summary}` : 'No runs yet.'}`,
    };
  }

  if (ctx.source === 're') {
    const executions = await (prisma as any).rEAIEmployeeExecution.findMany({
      where: {
        userId: ctx.userId,
        employeeType: ctx.employeeType,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      success: true,
      history: executions.map((e: any) => ({
        date: e.createdAt,
        status: e.status,
        summary: (e.result as any)?.summary,
        tasksCompleted: (e.result as any)?.tasksCompleted,
      })),
      message: `I've completed ${executions.length} run(s). ${executions[0] ? `Last: ${(executions[0].result as any)?.summary}` : 'No runs yet.'}`,
    };
  }

  // Professional - no execution history table yet, return empty
  return {
    success: true,
    history: [],
    message: "I don't have task history yet. Say 'run your tasks' to execute my job.",
  };
}

async function runTasks(
  ctx: AgentContext,
  _agentId: string,
  req: NextRequest
): Promise<{ success: boolean; summary: string; details?: any }> {
  if (ctx.source === 'industry' && ctx.industry) {
    const result = await executeIndustryEmployee(
      ctx.userId,
      ctx.industry,
      ctx.employeeType,
      { storeHistory: true }
    );
    return {
      success: result.success,
      summary: result.summary || 'Tasks completed',
      details: result,
    };
  }

  if (ctx.source === 're') {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const cookie = req.headers.get('cookie') || '';
    const res = await fetch(`${baseUrl}/api/ai-employees/real-estate/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(cookie && { Cookie: cookie }),
      },
      body: JSON.stringify({ employeeType: ctx.employeeType }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, summary: data.error || 'Run failed' };
    }
    return {
      success: true,
      summary: data.summary || 'Tasks completed',
      details: data,
    };
  }

  // Professional - run not implemented (they're conversational only for now)
  return {
    success: false,
    summary: "I'm a conversational assistant. I don't have automated tasks to run. Ask me questions about my expertise!",
  };
}

async function getTaskConfig(ctx: AgentContext): Promise<{
  success: boolean;
  tasks: { taskKey: string; enabled: boolean; description: string }[];
  message: string;
}> {
  const configs = await (prisma as any).aIEmployeeTaskConfig.findMany({
    where: {
      userId: ctx.userId,
      source: ctx.source,
      industry: ctx.source === 'industry' ? ctx.industry : null,
      employeeType: ctx.employeeType,
    },
  });

  const tasks = configs.length > 0
    ? configs.map((c: any) => ({
        taskKey: c.taskKey,
        enabled: c.enabled,
        description: getTaskDescription(ctx, c.taskKey),
      }))
    : [{ taskKey: 'run', enabled: true, description: getTaskDescription(ctx, 'run') }];

  return {
    success: true,
    tasks,
    message: `My tasks: ${tasks.map((t) => `${t.taskKey} (${t.enabled ? 'on' : 'off'})`).join(', ')}`,
  };
}

async function updateTaskToggles(
  ctx: AgentContext,
  params: { taskKey?: string; enabled?: boolean }
): Promise<{ success: boolean; message: string }> {
  const { taskKey = 'run', enabled = true } = params;
  if (!taskKey) {
    return { success: false, message: 'taskKey required' };
  }

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
      enabled,
    },
    update: { enabled },
  });

  return {
    success: true,
    message: `Task "${taskKey}" is now ${enabled ? 'enabled' : 'disabled'}.`,
  };
}

function getTaskDescription(ctx: AgentContext, taskKey: string): string {
  if (taskKey === 'run') {
    if (ctx.source === 'industry') {
      const module = ctx.industry ? getIndustryAIEmployeeModule(ctx.industry) : null;
      const config = module?.configs?.[ctx.employeeType];
      return config?.description || 'Run this employee\'s main task';
    }
    if (ctx.source === 're') {
      return 'Run this employee\'s main task';
    }
    return 'Run tasks';
  }
  return taskKey;
}
