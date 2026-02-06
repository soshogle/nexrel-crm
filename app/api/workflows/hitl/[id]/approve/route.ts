/**
 * Generic Multi-Industry HITL Approve API
 * Approve a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { approveHITLGate } from '@/lib/workflows/workflow-engine';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Approve HITL gate using the generic workflow engine
    await approveHITLGate(params.id, session.user.id, notes);

    // Get updated execution
    const updatedExecution = await prisma.taskExecution.findUnique({
      where: { id: params.id },
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

    // Find next task
    const tasks = updatedExecution?.instance.template.tasks || [];
    const currentTaskIndex = tasks.findIndex((t: { id: string }) => t.id === updatedExecution?.taskId);
    const nextTask = tasks[currentTaskIndex + 1];

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
