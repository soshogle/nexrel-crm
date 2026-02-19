/**
 * Real Estate HITL Approve API
 * Approve a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { approveHITLGate } from '@/lib/real-estate/workflow-engine';
import { apiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { HITLApproveBodySchema } from '@/lib/api-validation';

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
      return apiErrors.unauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const parsed = HITLApproveBodySchema.safeParse(body);
    const notes = parsed.success ? parsed.data.notes : undefined;

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
      return apiErrors.notFound('Task execution not found or not awaiting approval');
    }

    // Approve HITL gate using the engine
    await approveHITLGate(params.id, session.user.id, notes);

    // Get updated execution
    const updatedExecution = await prisma.rETaskExecution.findUnique({
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
    logger.error('Error approving HITL', { component: 'hitl-approve', error: String(error) });
    return apiErrors.internal('Failed to approve task');
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
