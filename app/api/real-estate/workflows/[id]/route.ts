/**
 * Real Estate Workflow Single Template API
 * Get, update, or delete a specific workflow template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get a specific workflow template with tasks
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = typeof (context.params as any).then === 'function'
      ? await (context.params as Promise<{ id: string }>)
      : context.params as { id: string };

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workflow = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        },
        instances: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            lead: {
              select: { id: true, businessName: true, contactPerson: true }
            },
            deal: {
              select: { id: true, title: true }
            }
          }
        },
        _count: {
          select: { instances: true }
        }
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (error) {
    console.error('Error fetching RE workflow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow' },
      { status: 500 }
    );
  }
}

const VALID_RETASK_TYPES = new Set([
  'QUALIFICATION', 'MLS_SEARCH', 'SHOWING_SCHEDULE', 'SHOWING_FEEDBACK', 'OFFER_PREP', 'OFFER_SUBMIT',
  'CONDITION_TRACKING', 'CLOSING_COORDINATION', 'POST_CLOSE_FOLLOWUP', 'CMA_GENERATION', 'LISTING_PREP',
  'PHOTO_SCHEDULING', 'MARKETING_DRAFT', 'LISTING_PUBLISH', 'LISTING_VISIT_CONFIRMED', 'CUSTOM'
]);

const VALID_RE_AGENT_TYPES = new Set([
  'RE_SPEED_TO_LEAD', 'RE_FSBO_OUTREACH', 'RE_EXPIRED_OUTREACH', 'RE_COLD_REACTIVATION', 'RE_DOCUMENT_CHASER',
  'RE_SHOWING_CONFIRM', 'RE_SPHERE_NURTURE', 'RE_BUYER_FOLLOWUP', 'RE_MARKET_UPDATE', 'RE_STALE_DIAGNOSTIC',
  'RE_LISTING_BOOST', 'RE_CMA_GENERATOR'
]);

// PUT - Full update (metadata + tasks) - used by workflow builder on save
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = typeof (context.params as any).then === 'function'
      ? await (context.params as Promise<{ id: string }>)
      : context.params as { id: string };
    const id = params.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive, tasks, type, workflowType } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    const rawType = type ?? workflowType;
    if (rawType !== undefined) {
      updateData.type = rawType === 'BUYER_PIPELINE' ? 'BUYER' : rawType === 'SELLER_PIPELINE' ? 'SELLER' : rawType;
    }

    if (tasks && Array.isArray(tasks)) {
      // Delete RETaskExecution first (FK: taskId -> REWorkflowTask)
      // Executions reference tasks, so we must remove them before deleting tasks
      const taskIds = await prisma.rEWorkflowTask.findMany({
        where: { templateId: id },
        select: { id: true }
      });
      const ids = taskIds.map(t => t.id);
      if (ids.length > 0) {
        await prisma.rETaskExecution.deleteMany({
          where: { taskId: { in: ids } }
        });
      }

      await prisma.rEWorkflowTask.deleteMany({
        where: { templateId: id }
      });

      const createdTasks = await prisma.$transaction(
        tasks.map((task: any, index: number) => {
          const baseConfig = (task.actionConfig as object) || { actions: [] } as Record<string, unknown>;
          const actionConfig = {
            ...baseConfig,
            assignedAgentId: task.assignedAgentId || null,
            assignedAgentName: task.assignedAgentName || null,
            agentColor: task.agentColor || '#6B7280',
            assignedAIEmployeeId: task.assignedAIEmployeeId || null,
          };
          const taskType = VALID_RETASK_TYPES.has(task.taskType) ? task.taskType : 'CUSTOM';
          const assignedAgentType = task.assignedAgentType && VALID_RE_AGENT_TYPES.has(task.assignedAgentType)
            ? task.assignedAgentType
            : null;
          const pos = task.position || { angle: (task.angle ?? (index * 36) - 90), radius: task.radius ?? 0.7 };
          const position = typeof pos === 'object' && pos !== null
            ? { angle: Number(pos.angle) || 0, radius: Number(pos.radius) ?? 0.7 }
            : { angle: (index * 36) - 90, radius: 0.7 };
          return prisma.rEWorkflowTask.create({
            data: {
              templateId: id,
              name: (task.name as string) || 'Task',
              description: (task.description as string) || '',
              taskType,
              assignedAgentType,
              delayValue: Math.max(0, Number(task.delayMinutes ?? task.delayValue ?? 0) || 0),
              delayUnit: (task.delayUnit as string) || 'MINUTES',
              isHITL: Boolean(task.isHITL),
              isOptional: Boolean(task.isOptional),
              position,
              displayOrder: task.displayOrder ?? index + 1,
              parentTaskId: null,
              branchCondition: (task.branchCondition as object | undefined) ?? undefined,
              actionConfig,
            },
          });
        })
      );

      const oldIdToNewId: Record<string, string> = {};
      tasks.forEach((task: any, i: number) => {
        if (createdTasks[i]) oldIdToNewId[task.id] = createdTasks[i].id;
      });

      const updates = tasks
        .map((task: any, i: number) => {
          const newParentId = task.parentTaskId ? oldIdToNewId[task.parentTaskId] : null;
          if (newParentId && createdTasks[i]) {
            return prisma.rEWorkflowTask.update({
              where: { id: createdTasks[i].id },
              data: { parentTaskId: newParentId },
            });
          }
          return null;
        })
        .filter(Boolean);

      if (updates.length > 0) {
        await prisma.$transaction(updates);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.rEWorkflowTemplate.update({
        where: { id },
        data: updateData as any,
      });
    }

    const raw = await prisma.rEWorkflowTemplate.findFirst({
      where: { id },
      include: {
        tasks: { orderBy: { displayOrder: 'asc' } }
      }
    });

    const workflow = raw ? {
      ...raw,
      workflowType: raw.type === 'BUYER' ? 'BUYER_PIPELINE' : raw.type === 'SELLER' ? 'SELLER_PIPELINE' : raw.type,
      tasks: raw.tasks.map((t: any) => {
        const ac = t.actionConfig || {};
        return {
          ...t,
          assignedAgentId: ac.assignedAgentId || null,
          assignedAgentName: ac.assignedAgentName || null,
          agentColor: ac.agentColor || '#6B7280',
          assignedAIEmployeeId: ac.assignedAIEmployeeId || null,
          delayMinutes: t.delayValue,
          angle: t.position?.angle ?? 0,
          radius: t.position?.radius ?? 0.7,
        };
      }),
    } : null;

    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (error) {
    const err = error as Error;
    console.error('Error updating RE workflow (PUT):', err);
    const message = err?.message || 'Failed to update workflow';
    return NextResponse.json(
      { error: message, details: process.env.NODE_ENV === 'development' ? err?.stack : undefined },
      { status: 500 }
    );
  }
}

// PATCH - Partial update (metadata only)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = typeof (context.params as any).then === 'function'
      ? await (context.params as Promise<{ id: string }>)
      : context.params as { id: string };

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, isActive } = body;

    const workflow = await prisma.rEWorkflowTemplate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      workflow
    });
  } catch (error) {
    console.error('Error updating RE workflow:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a workflow template
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const params = typeof (context.params as any).then === 'function'
      ? await (context.params as Promise<{ id: string }>)
      : context.params as { id: string };

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const existing = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        _count: {
          select: { instances: true }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Check for active instances
    const activeInstances = await prisma.rEWorkflowInstance.count({
      where: {
        templateId: params.id,
        status: 'ACTIVE'
      }
    });

    if (activeInstances > 0) {
      return NextResponse.json(
        { error: `Cannot delete workflow with ${activeInstances} active instances` },
        { status: 400 }
      );
    }

    // Delete workflow (cascade will delete tasks)
    await prisma.rEWorkflowTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting RE workflow:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow' },
      { status: 500 }
    );
  }
}
