/**
 * Real Estate HITL Approve API
 * Approve a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Approve a HITL task execution
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notes } = body;

    // Find the task execution
    const execution = await prisma.rETaskExecution.findFirst({
      where: {
        id: params.id,
        instance: {
          userId: session.user.id
        },
        status: 'AWAITING_HITL'
      },
      include: {
        task: true,
        instance: {
          include: {
            template: {
              include: {
                tasks: {
                  orderBy: { displayOrder: 'asc' }
                }
              }
            }
          }
        }
      }
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Task execution not found or not awaiting approval' },
        { status: 404 }
      );
    }

    // Update the execution as approved
    const updatedExecution = await prisma.rETaskExecution.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        hitlApprovedBy: session.user.id,
        hitlApprovedAt: new Date(),
        hitlNotes: notes || null,
        completedAt: new Date()
      }
    });

    // Mark HITL notification as actioned
    await prisma.rEHITLNotification.updateMany({
      where: {
        executionId: params.id,
        userId: session.user.id
      },
      data: {
        isActioned: true,
        isRead: true
      }
    });

    // Find and start the next task
    const tasks = execution.instance.template.tasks;
    const currentTaskIndex = tasks.findIndex((t: { id: string }) => t.id === execution.taskId);
    const nextTask = tasks[currentTaskIndex + 1];

    if (nextTask) {
      // Schedule the next task
      const delayMs = calculateDelay(nextTask.delayValue, nextTask.delayUnit);
      const scheduledFor = new Date(Date.now() + delayMs);

      await prisma.rETaskExecution.updateMany({
        where: {
          instanceId: execution.instanceId,
          taskId: nextTask.id
        },
        data: {
          status: delayMs === 0 ? 'IN_PROGRESS' : 'PENDING',
          scheduledFor,
          startedAt: delayMs === 0 ? new Date() : null
        }
      });

      // Update instance current task
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: { currentTaskId: nextTask.id }
      });
    } else {
      // No more tasks, complete the workflow
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });
    }

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      message: 'Task approved successfully',
      nextTask: nextTask ? nextTask.name : null
    });
  } catch (error) {
    console.error('Error approving HITL:', error);
    return NextResponse.json(
      { error: 'Failed to approve task' },
      { status: 500 }
    );
  }
}

function calculateDelay(value: number, unit: string): number {
  switch (unit) {
    case 'MINUTES':
      return value * 60 * 1000;
    case 'HOURS':
      return value * 60 * 60 * 1000;
    case 'DAYS':
      return value * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}
