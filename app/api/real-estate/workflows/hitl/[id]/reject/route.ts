/**
 * Real Estate HITL Reject API
 * Reject a human-in-the-loop gate
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { rejectHITLGate } from '@/lib/real-estate/workflow-engine';
import { apiErrors } from '@/lib/api-error';
import { logger } from '@/lib/logger';
import { HITLRejectBodySchema } from '@/lib/api-validation';
import { getIdempotentResponse, setIdempotentResponse } from '@/lib/idempotency';
import { checkRateLimit } from '@/lib/rate-limit';

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
      return apiErrors.unauthorized();
    }

    const rateKey = `hitl-reject:${session.user.id}`;
    const rate = checkRateLimit(rateKey, 20, 60_000); // 20/min per user
    if (!rate.success) {
      return apiErrors.rateLimited('Too many rejection requests. Please wait a moment.');
    }

    const body = await request.json().catch(() => ({}));
    const parsed = HITLRejectBodySchema.safeParse(body);
    const { notes, pauseWorkflow, idempotencyKey: bodyKey } = parsed.success ? parsed.data : { notes: undefined, pauseWorkflow: undefined, idempotencyKey: undefined };
    const key = bodyKey || request.headers.get('Idempotency-Key');

    if (key) {
      const cached = getIdempotentResponse(key, `hitl-reject:${params.id}`);
      if (cached) {
        return NextResponse.json(cached.body, { status: cached.status });
      }
    }

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
      return apiErrors.notFound('Task execution not found or not awaiting approval');
    }

    // If pauseWorkflow is true, pause the entire workflow instance
    if (pauseWorkflow) {
      await prisma.rEWorkflowInstance.update({
        where: { id: execution.instanceId },
        data: { status: 'PAUSED' }
      });
    }

    // Reject HITL gate using the engine
    await rejectHITLGate(params.id, session.user.id, notes || 'Rejected by user');

    // Get updated execution
    const updatedExecution = await prisma.rETaskExecution.findUnique({
      where: { id: params.id },
      include: {
        task: true,
        instance: true
      }
    });

    const responseBody = {
      success: true,
      execution: updatedExecution,
      message: pauseWorkflow ? 'Task rejected and workflow paused' : 'Task rejected',
      workflowPaused: pauseWorkflow
    };

    if (key) {
      setIdempotentResponse(key, `hitl-reject:${params.id}`, 200, responseBody);
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    logger.error('Error rejecting HITL', { component: 'hitl-reject', error: String(error) });
    return apiErrors.internal('Failed to reject task');
  }
}
