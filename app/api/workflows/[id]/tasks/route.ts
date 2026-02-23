/**
 * POST /api/workflows/[id]/tasks
 * Add a task to a workflow (Phase 3 - incremental live creation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { workflowTemplateService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const existing = await workflowTemplateService.findUnique(ctx, params.id);

    if (!existing) {
      return apiErrors.notFound('Workflow not found');
    }

    const body = await request.json();
    const {
      name,
      taskType = 'CUSTOM',
      description = '',
      delayMinutes = 0,
      delayUnit = 'MINUTES',
      actionConfig = { actions: [] },
    } = body;

    if (!name) {
      return apiErrors.badRequest('Task name is required');
    }

    const maxOrder = existing.tasks.length > 0
      ? Math.max(...existing.tasks.map((t) => t.displayOrder))
      : 0;

    const task = await getCrmDb(ctx).workflowTask.create({
      data: {
        templateId: params.id,
        name,
        description,
        taskType: taskType || 'CUSTOM',
        assignedAgentType: null,
        delayValue: delayMinutes || 0,
        delayUnit: delayUnit || 'MINUTES',
        isHITL: false,
        isOptional: false,
        position: { row: Math.floor(maxOrder / 3), col: maxOrder % 3 },
        displayOrder: maxOrder + 1,
        actionConfig: actionConfig || { actions: [] },
      },
    });

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        name: task.name,
        description: task.description || '',
        taskType: task.taskType,
        displayOrder: task.displayOrder,
        delayMinutes: task.delayValue,
        delayUnit: task.delayUnit,
      },
    });
  } catch (error: any) {
    console.error('[workflows/tasks] Error:', error);
    return apiErrors.internal(error?.message || 'Failed to add task');
  }
}
