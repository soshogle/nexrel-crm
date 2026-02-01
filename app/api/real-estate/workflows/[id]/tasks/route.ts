/**
 * Real Estate Workflow Tasks API
 * Manage tasks within a workflow template
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const tasks = await prisma.rEWorkflowTask.findMany({
      where: { templateId: params.id },
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: 'Name and taskType are required' },
        { status: 400 }
      );
    }

    // Get the next display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const maxOrder = await prisma.rEWorkflowTask.aggregate({
        where: { templateId: params.id },
        _max: { displayOrder: true }
      });
      order = (maxOrder._max.displayOrder || 0) + 1;
    }

    const task = await prisma.rEWorkflowTask.create({
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
        actionConfig: actionConfig || { actions: [] }
      }
    });

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify workflow ownership
    const workflow = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    // Bulk reorder tasks
    if (body.reorder && Array.isArray(body.tasks)) {
      const updates = body.tasks.map((task: { id: string; displayOrder: number; position?: object }) =>
        prisma.rEWorkflowTask.update({
          where: { id: task.id },
          data: {
            displayOrder: task.displayOrder,
            ...(task.position && { position: task.position })
          }
        })
      );

      await prisma.$transaction(updates);

      const tasks = await prisma.rEWorkflowTask.findMany({
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
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Verify task belongs to this workflow
    const existingTask = await prisma.rEWorkflowTask.findFirst({
      where: {
        id: taskId,
        templateId: params.id
      }
    });

    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = await prisma.rEWorkflowTask.update({
      where: { id: taskId },
      data: {
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
        ...(updateData.actionConfig !== undefined && { actionConfig: updateData.actionConfig })
      }
    });

    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    // Verify workflow ownership
    const workflow = await prisma.rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Verify task belongs to this workflow
    const task = await prisma.rEWorkflowTask.findFirst({
      where: {
        id: taskId,
        templateId: params.id
      }
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Delete the task
    await prisma.rEWorkflowTask.delete({
      where: { id: taskId }
    });

    // Reorder remaining tasks
    const remainingTasks = await prisma.rEWorkflowTask.findMany({
      where: { templateId: params.id },
      orderBy: { displayOrder: 'asc' }
    });

    // Update display orders
    const updates = remainingTasks.map((t: { id: string }, index: number) =>
      prisma.rEWorkflowTask.update({
        where: { id: t.id },
        data: { displayOrder: index + 1 }
      })
    );

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}
