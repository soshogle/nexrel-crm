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

    // Verify workflow ownership
    const workflow = await prisma.rEWorkflowTemplate.findFirst({
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
    const { leadId, dealId, metadata } = body;

    if (!leadId && !dealId) {
      return NextResponse.json(
        { error: 'Either leadId or dealId is required' },
        { status: 400 }
      );
    }

    // Verify lead/deal exists and belongs to user
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
      const deal = await getCrmDb(ctx).deal.findFirst({
        where: {
          id: dealId,
          userId: ctx.userId
        }
      });

      if (!deal) {
        return NextResponse.json(
          { error: 'Deal not found' },
          { status: 404 }
        );
      }
    }

    // Check for existing active instance
    const existingInstance = await getCrmDb(ctx).rEWorkflowInstance.findFirst({
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

    // Start workflow instance using the engine
    const instanceId = await startWorkflowInstance(ctx.userId, params.id, {
      leadId: leadId || undefined,
      dealId: dealId || undefined,
      triggerType: 'MANUAL',
      metadata: metadata || {},
    });

    // Get the created instance with executions
    const instance = await getCrmDb(ctx).rEWorkflowInstance.findUnique({
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

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Verify workflow ownership
    const workflow = await getCrmDb(ctx).rEWorkflowTemplate.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    const instances = await getCrmDb(ctx).rEWorkflowInstance.findMany({
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
    return NextResponse.json(
      { error: 'Failed to fetch instances' },
      { status: 500 }
    );
  }
}
