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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const workflow = await workflowTemplateService.findUnique(ctx, params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    if (!workflow.isActive) {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 400 }
      );
    }

    if (workflow.tasks.length === 0) {
      return NextResponse.json(
        { error: 'Workflow has no tasks' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { leadId, dealId, contactId, metadata } = body;

    if (!leadId && !dealId && !contactId) {
      return NextResponse.json(
        { error: 'Either leadId, dealId, or contactId is required' },
        { status: 400 }
      );
    }

    if (leadId) {
      const lead = await leadService.findUnique(ctx, leadId);
      if (!lead) {
        return NextResponse.json(
          { error: 'Lead not found' },
          { status: 404 }
        );
      }
    }

    if (dealId) {
      const deal = await dealService.findUnique(ctx, dealId);
      if (!deal) {
        return NextResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
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
      return NextResponse.json(
        { error: 'An active workflow instance already exists for this lead/deal' },
        { status: 400 }
      );
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
    return NextResponse.json(
      { error: 'Failed to start workflow' },
      { status: 500 }
    );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify workflow ownership
    const workflow = await workflowTemplateService.findUnique(ctx, params.id);

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}
