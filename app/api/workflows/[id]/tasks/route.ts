/**
 * POST /api/workflows/[id]/tasks
 * Add a task to a workflow (Phase 3 - incremental live creation)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.workflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
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
      return NextResponse.json({ error: 'Task name is required' }, { status: 400 });
    }

    const maxOrder = existing.tasks.length > 0
      ? Math.max(...existing.tasks.map((t) => t.displayOrder))
      : 0;

    const task = await prisma.workflowTask.create({
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
    return NextResponse.json(
      { error: error?.message || 'Failed to add task' },
      { status: 500 }
    );
  }
}
