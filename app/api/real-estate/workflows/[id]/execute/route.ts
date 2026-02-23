/**
 * Real Estate Workflow Execute API
 * Start a workflow instance for a lead or deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { startWorkflowInstance } from '@/lib/real-estate/workflow-engine';
import { apiErrors } from '@/lib/api-error';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Start a new workflow instance
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session) ?? { userId: session?.user?.id || '', industry: null };

    // Verify workflow ownership
    const workflow = await (prisma as any).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId
      },
      include: {
        tasks: {
          orderBy: { displayOrder: 'asc' }
        }
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    if (!workflow.isActive) {
      return apiErrors.badRequest('Workflow is not active');
    }

    if (workflow.tasks.length === 0) {
      return apiErrors.badRequest('Workflow has no tasks');
    }

    const body = await request.json();
    const { leadId, dealId, metadata } = body;

    if (!leadId && !dealId) {
      return apiErrors.badRequest('Either leadId or dealId is required');
    }

    // Verify lead/deal exists and belongs to user
    if (leadId) {
      const lead = await leadService.findUnique(ctx, leadId);

      if (!lead) {
        return apiErrors.notFound('Lead not found');
      }
    }

    if (dealId) {
      const deal = await getCrmDb(ctx).deal.findFirst({
        where: {
          id: dealId,
          userId: ctx.userId
        }
      });

      if (!deal) {
        return apiErrors.notFound('Deal not found');
      }
    }

    // Check for existing active instance
    const existingInstance = await (getCrmDb(ctx) as any).rEWorkflowInstance.findFirst({
      where: {
        templateId: params.id,
        ...(leadId && { leadId }),
        ...(dealId && { dealId }),
        status: 'ACTIVE'
      }
    });

    if (existingInstance) {
      return apiErrors.badRequest('An active workflow instance already exists for this lead/deal');
    }

    // Start workflow instance using the engine
    const instanceId = await startWorkflowInstance(ctx.userId, params.id, {
      leadId: leadId || undefined,
      dealId: dealId || undefined,
      triggerType: 'MANUAL',
      metadata: metadata || {},
    });

    // Get the created instance with executions
    const instance = await (getCrmDb(ctx) as any).rEWorkflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: true,
        lead: {
          select: { id: true, businessName: true, contactPerson: true, email: true, phone: true }
        },
        deal: {
          select: { id: true, title: true }
        },
        executions: {
          include: {
            task: true
          },
          orderBy: { task: { displayOrder: 'asc' } }
        }
      }
    });

    return NextResponse.json({
      success: true,
      instance,
      message: 'Workflow started successfully'
    });
  } catch (error) {
    console.error('Error starting workflow:', error);
    return apiErrors.internal('Failed to start workflow');
  }
}

// GET - Get workflow instances for this template
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
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Verify workflow ownership
    const workflow = await (getCrmDb(ctx) as any).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId
      }
    });

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    const instances = await (getCrmDb(ctx) as any).rEWorkflowInstance.findMany({
      where: {
        templateId: params.id,
        ...(status && { status: status as 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED' })
      },
      include: {
        lead: {
          select: { id: true, businessName: true, contactPerson: true }
        },
        deal: {
          select: { id: true, title: true }
        },
        executions: {
          include: {
            task: {
              select: { name: true, taskType: true, assignedAgentType: true }
            }
          },
          orderBy: { task: { displayOrder: 'asc' } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      success: true,
      instances
    });
  } catch (error) {
    console.error('Error fetching workflow instances:', error);
    return apiErrors.internal('Failed to fetch instances');
  }
}
