/**
 * Generic Multi-Industry HITL Reject API
 * Reject a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rejectHITLGate } from '@/lib/workflows/workflow-engine';

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
    const execution = await prisma.taskExecution.findFirst({
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

    // If pauseWorkflow is true, pause the entire workflow instance
    if (pauseWorkflow) {
      await prisma.workflowInstance.update({
        where: { id: execution.instanceId },
        data: { status: 'PAUSED' }
      });
    }

    // Reject HITL gate using the generic workflow engine
    await rejectHITLGate(params.id, session.user.id, notes || 'Rejected by user');

    // Get updated execution
    const updatedExecution = await prisma.taskExecution.findUnique({
      where: { id: params.id },
      include: {
        task: true,
        instance: true
      }
    });

    return NextResponse.json({
      success: true,
      execution: updatedExecution,
      message: pauseWorkflow ? 'Task rejected and workflow paused' : 'Task rejected',
      workflowPaused: pauseWorkflow
    });
  } catch (error) {
    console.error('Error rejecting HITL:', error);
    return NextResponse.json(
      { error: 'Failed to reject task' },
      { status: 500 }
    );
  }
}
