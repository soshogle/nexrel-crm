/**
 * Real Estate Workflow Tasks API
 * Manage tasks within a workflow template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get all tasks for a workflow
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    // Verify workflow ownership
    const workflow = await getCrmDb(ctx).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    const tasks = await getCrmDb(ctx).rEWorkflowTask.findMany({
      where: { templateId: params.id },
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return apiErrors.internal('Failed to fetch tasks');
  }
}

// POST - Add a new task to the workflow
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
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    // Verify workflow ownership
    const workflow = await getCrmDb(ctx).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    const body = await request.json();
    const {
      name,
      description,
      taskType,
      assignedAgentType,
      delayValue,
      delayUnit,
      isHITL,
      isOptional,
      position,
      displayOrder,
      parentTaskId,
      branchCondition,
      actionConfig
    } = body;

    if (!name || !taskType) {
      return apiErrors.badRequest('Name and taskType are required');
    }

    // Get the next display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await getCrmDb(ctx).rEWorkflowTask.aggregate({
        where: { templateId: params.id },
        _max: { displayOrder: true }
      });
      order = (maxOrder._max.displayOrder || 0) + 1;
    }

    const baseConfig = (actionConfig as object) || { actions: [] } as Record<string, unknown>;
    const finalActionConfig = {
      ...baseConfig,
      assignedAgentId: body.assignedAgentId || null,
      assignedAgentName: body.assignedAgentName || null,
      agentColor: body.agentColor || '#6B7280',
      assignedAIEmployeeId: body.assignedAIEmployeeId || null,
    };

    const task = await getCrmDb(ctx).rEWorkflowTask.create({
      data: {
        templateId: params.id,
        name,
        description: description || '',
        taskType,
        assignedAgentType: assignedAgentType || null,
        delayValue: delayValue || 0,
        delayUnit: delayUnit || 'MINUTES',
        isHITL: isHITL || false,
        isOptional: isOptional || false,
        position: position || { angle: (order * 36) - 90, radius: 1 },
        displayOrder: order,
        parentTaskId: parentTaskId || null,
        branchCondition: branchCondition ?? undefined,
        actionConfig: finalActionConfig
      }
    });

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return apiErrors.internal('Failed to create task');
  }
}

// PATCH - Update a task or reorder tasks
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    // Verify workflow ownership
    const workflow = await getCrmDb(ctx).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    const body = await request.json();
    
    // Bulk reorder tasks
    if (body.reorder && Array.isArray(body.tasks)) {
      const updates = body.tasks.map((task: { id: string; displayOrder: number; position?: object }) =>
        getCrmDb(ctx).rEWorkflowTask.update({
          where: { id: task.id },
          data: {
            displayOrder: task.displayOrder,
            ...(task.position && { position: task.position })
          }
        })
      );

      await getCrmDb(ctx).$transaction(updates);

      const tasks = await getCrmDb(ctx).rEWorkflowTask.findMany({
        where: { templateId: params.id },
        orderBy: { displayOrder: 'asc' }
      });

      return NextResponse.json({
        success: true,
        tasks
      });
    }

    // Update single task
    const { taskId, ...updateData } = body;
    if (!taskId) {
      return apiErrors.badRequest('taskId is required');
    }

    // Verify task belongs to this workflow
    const existingTask = await getCrmDb(ctx).rEWorkflowTask.findFirst({
      where: {
        id: taskId,
        templateId: params.id
      }
    });

    if (!existingTask) {
      return apiErrors.notFound('Task not found');
    }

    const baseConfig = ((existingTask as any).actionConfig as object) || { actions: [] } as Record<string, unknown>;
    const hasAssignment = updateData.assignedAgentId !== undefined || updateData.assignedAgentName !== undefined ||
      updateData.agentColor !== undefined || updateData.assignedAIEmployeeId !== undefined;
    const finalActionConfig = hasAssignment
      ? {
          ...baseConfig,
          assignedAgentId: updateData.assignedAgentId ?? (baseConfig as any).assignedAgentId ?? null,
          assignedAgentName: updateData.assignedAgentName ?? (baseConfig as any).assignedAgentName ?? null,
          agentColor: updateData.agentColor ?? (baseConfig as any).agentColor ?? '#6B7280',
          assignedAIEmployeeId: updateData.assignedAIEmployeeId ?? (baseConfig as any).assignedAIEmployeeId ?? null,
        }
      : undefined;

    const updatePayload: Record<string, unknown> = {
      ...(updateData.name !== undefined && { name: updateData.name }),
      ...(updateData.description !== undefined && { description: updateData.description }),
      ...(updateData.taskType !== undefined && { taskType: updateData.taskType }),
      ...(updateData.assignedAgentType !== undefined && { assignedAgentType: updateData.assignedAgentType }),
      ...(updateData.delayValue !== undefined && { delayValue: updateData.delayValue }),
      ...(updateData.delayUnit !== undefined && { delayUnit: updateData.delayUnit }),
      ...(updateData.isHITL !== undefined && { isHITL: updateData.isHITL }),
      ...(updateData.isOptional !== undefined && { isOptional: updateData.isOptional }),
      ...(updateData.position !== undefined && { position: updateData.position }),
      ...(updateData.displayOrder !== undefined && { displayOrder: updateData.displayOrder }),
      ...(updateData.parentTaskId !== undefined && { parentTaskId: updateData.parentTaskId }),
      ...(updateData.branchCondition !== undefined && { branchCondition: updateData.branchCondition }),
      ...(finalActionConfig && { actionConfig: finalActionConfig }),
      ...(updateData.actionConfig !== undefined && !hasAssignment && { actionConfig: updateData.actionConfig }),
    };

    const task = await getCrmDb(ctx).rEWorkflowTask.update({
      where: { id: taskId },
      data: updatePayload as any
    });

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return apiErrors.internal('Failed to update task');
  }
}

// DELETE - Delete a task from the workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return apiErrors.badRequest('taskId is required');
    }

    // Verify workflow ownership
    const workflow = await getCrmDb(ctx).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    // Verify task belongs to this workflow
    const task = await getCrmDb(ctx).rEWorkflowTask.findFirst({
      where: {
        id: taskId,
        templateId: params.id
      }
    });

    if (!task) {
      return apiErrors.notFound('Task not found');
    }

    // Delete the task
    await getCrmDb(ctx).rEWorkflowTask.delete({
      where: { id: taskId }
    });

    // Reorder remaining tasks
    const remainingTasks = await getCrmDb(ctx).rEWorkflowTask.findMany({
      where: { templateId: params.id },
      orderBy: { displayOrder: 'asc' }
    });

    // Update display orders
    const updates = remainingTasks.map((t: { id: string }, index: number) =>
      getCrmDb(ctx).rEWorkflowTask.update({
        where: { id: t.id },
        data: { displayOrder: index + 1 }
      })
    );

    if (updates.length > 0) {
      await getCrmDb(ctx).$transaction(updates);
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return apiErrors.internal('Failed to delete task');
  }
}
