/**
 * Real Estate HITL Reject API
 * Reject a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Reject a HITL task execution
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
    const { notes, pauseWorkflow } = body;

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
        instance: true
      }
    });

    if (!execution) {
      return NextResponse.json(
        { error: 'Task execution not found or not awaiting approval' },
        { status: 404 }
      );
    }

    // Update the execution as rejected
    const updatedExecution = await prisma.rETaskExecution.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        hitlApprovedBy: session.user.id,
        hitlApprovedAt: new Date(),
        hitlNotes: notes || 'Rejected by user',
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

    // If pauseWorkflow is true, pause the entire workflow instance
    if (pauseWorkflow) {
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: { status: 'PAUSED' }
      });

      return NextResponse.json({
        success: true,
        execution: updatedExecution,
        message: 'Task rejected and workflow paused',
        workflowPaused: true
      });
    }

    // Otherwise, skip this task and continue to next
    const nextTask = await prisma.rEWorkflowTask.findFirst({
      where: {
        templateId: execution.instance.templateId,
        displayOrder: {
          gt: execution.task.displayOrder
        }
      },
      orderBy: { displayOrder: 'asc' }
    });

    if (nextTask) {
      // Start the next task
      await prisma.rETaskExecution.updateMany({
        where: {
          instanceId: execution.instanceId,
          taskId: nextTask.id
        },
        data: {
          status: 'IN_PROGRESS',
          startedAt: new Date()
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
      message: 'Task rejected, proceeding to next task',
      nextTask: nextTask ? nextTask.name : null
    });
  } catch (error) {
    console.error('Error rejecting HITL:', error);
    return NextResponse.json(
      { error: 'Failed to reject task' },
      { status: 500 }
    );
  }
}
