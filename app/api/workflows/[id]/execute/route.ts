/**
 * Generic Multi-Industry Workflow Execute API
 * Start a workflow instance for a lead or deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { startWorkflowInstance } from '@/lib/workflows/workflow-engine';
import { emitCRMEvent } from '@/lib/crm-event-emitter';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { workflowTemplateService } from '@/lib/dal/workflow-template-service';
import { leadService } from '@/lib/dal/lead-service';
import { dealService } from '@/lib/dal/deal-service';
import { getCrmDb } from '@/lib/dal/db';
import { apiErrors } from '@/lib/api-error';

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

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const workflow = await workflowTemplateService.findUnique(ctx, params.id);

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
    const { leadId, dealId, contactId, metadata } = body;

    if (!leadId && !dealId && !contactId) {
      return apiErrors.badRequest('Either leadId, dealId, or contactId is required');
    }

    if (leadId) {
      const lead = await leadService.findUnique(ctx, leadId);
      if (!lead) {
        return apiErrors.notFound('Lead not found');
      }
    }

    if (dealId) {
      const deal = await dealService.findUnique(ctx, dealId);
      if (!deal) {
        return apiErrors.notFound('Deal not found');
      }
    }

    const db = getCrmDb(ctx);
    const existingInstance = await db.workflowInstance.findFirst({
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

    // Start workflow instance using generic workflow engine
    const instanceId = await startWorkflowInstance(session.user.id, params.id, {
      leadId: leadId || undefined,
      dealId: dealId || undefined,
      triggerType: 'MANUAL',
      metadata: metadata || {},
    });

    emitCRMEvent('workflow_started', ctx.userId, { entityId: params.id, entityType: 'Workflow' });

    // Get the created instance with executions
    const instance = await getCrmDb(ctx).workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        template: {
          include: {
            tasks: {
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Verify workflow ownership
    const workflow = await workflowTemplateService.findUnique(ctx, params.id);

    if (!workflow) {
      return apiErrors.notFound('Workflow not found');
    }

    const instances = await getCrmDb(ctx).workflowInstance.findMany({
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
              select: { name: true, taskType: true }
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
