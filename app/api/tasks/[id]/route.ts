
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { emitCRMEvent } from '@/lib/crm-event-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/tasks/[id] - Get task details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
            value: true,
            stage: true,
          },
        },
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true,
            completedAt: true,
          },
        },
        blockedTasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        parentTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        attachments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify ownership or assignment
    if (task.userId !== session.user.id && task.assignedToId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (existingTask.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      assignedToId,
      dueDate,
      startDate,
      category,
      tags,
      leadId,
      dealId,
      dependsOnId,
      parentTaskId,
      estimatedHours,
      actualHours,
      progressPercent,
    } = body;

    // Track changes for activity log
    const changes: any[] = [];
    if (status && status !== existingTask.status) {
      changes.push({
        action: 'STATUS_CHANGED',
        oldValue: existingTask.status,
        newValue: status,
      });
    }
    if (assignedToId && assignedToId !== existingTask.assignedToId) {
      changes.push({
        action: 'ASSIGNED',
        oldValue: existingTask.assignedToId,
        newValue: assignedToId,
      });
    }
    if (priority && priority !== existingTask.priority) {
      changes.push({
        action: 'PRIORITY_CHANGED',
        oldValue: existingTask.priority,
        newValue: priority,
      });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        updateData.progressPercent = 100;
        emitCRMEvent('task_completed', session.user.id, { entityId: params.id, entityType: 'Task' });
      } else if (existingTask.status === 'COMPLETED' && status !== 'COMPLETED') {
        updateData.completedAt = null;
      }
    }
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (category !== undefined) updateData.category = category;
    if (tags !== undefined) updateData.tags = tags;
    if (leadId !== undefined) updateData.leadId = leadId;
    if (dealId !== undefined) updateData.dealId = dealId;
    if (dependsOnId !== undefined) updateData.dependsOnId = dependsOnId;
    if (parentTaskId !== undefined) updateData.parentTaskId = parentTaskId;
    if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
    if (actualHours !== undefined) updateData.actualHours = actualHours;
    if (progressPercent !== undefined) updateData.progressPercent = progressPercent;

    const task = await prisma.task.update({
      where: { id: params.id },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        lead: {
          select: {
            id: true,
            businessName: true,
          },
        },
        deal: {
          select: {
            id: true,
            title: true,
          },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Create activity logs for changes
    for (const change of changes) {
      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          userId: session.user.id,
          action: change.action,
          oldValue: change.oldValue,
          newValue: change.newValue,
        },
      });
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
    });

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
