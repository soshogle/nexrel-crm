import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dealService, getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { workflowEngine } from '@/lib/workflow-engine';
import { emitCRMEvent } from '@/lib/crm-event-emitter';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const deals = await dealService.findMany(ctx, {
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        stage: true,
        pipeline: true,
      } as any,
    });

    return NextResponse.json(deals);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

// POST /api/deals - Create new deal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      title,
      description,
      value,
      pipelineId,
      stageId,
      leadId,
      priority,
      expectedCloseDate,
    } = await request.json();

    const stage = await getCrmDb(ctx).pipelineStage.findUnique({
      where: { id: stageId },
    });

    const deal = await dealService.create(ctx, {
      title,
      description: description ?? '',
      value: value ?? 0,
      pipelineId,
      stageId,
      leadId: leadId || null,
      priority: (priority as any) || 'MEDIUM',
      probability: stage?.probability ?? 0,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
    } as any);

    emitCRMEvent('deal_created', ctx.userId, { entityId: deal.id, entityType: 'Deal', data: { title, value } });

    await getCrmDb(ctx).dealActivity.create({
      data: {
        dealId: deal.id,
        userId: ctx.userId,
        type: 'CREATED',
        description: `Deal created: ${title}`,
      },
    });

    try {
      const { RelationshipHooks } = await import('@/lib/relationship-hooks');
      await RelationshipHooks.onDealCreated({
        userId: ctx.userId,
        dealId: deal.id,
        leadId: leadId,
      });
    } catch (error) {
      console.error('Error tracking deal relationships:', error);
    }

    workflowEngine.triggerWorkflow('DEAL_CREATED', {
      userId: ctx.userId,
      dealId: deal.id,
      leadId: deal.leadId || undefined,
      variables: {
        dealTitle: title,
        dealValue: value,
        businessName: deal.lead?.businessName,
      },
    }).catch(err => console.error('Deal created workflow trigger failed:', err));

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
