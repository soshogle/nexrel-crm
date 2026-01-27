
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';

// GET /api/deals - Get all deals

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const deals = await prisma.deal.findMany({
      where: { userId: user.id },
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
      },
      orderBy: { createdAt: 'desc' },
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
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

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

    // Get stage probability
    const stage = await prisma.pipelineStage.findUnique({
      where: { id: stageId },
    });

    const deal = await prisma.deal.create({
      data: {
        title,
        description,
        value,
        pipelineId,
        stageId,
        leadId: leadId || null,
        priority: priority || 'MEDIUM',
        probability: stage?.probability || 0,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        userId: user.id,
      },
      include: {
        lead: true,
        assignedTo: true,
        stage: true,
      },
    });

    // Create activity log
    await prisma.dealActivity.create({
      data: {
        dealId: deal.id,
        userId: user.id,
        type: 'CREATED',
        description: `Deal created: ${title}`,
      },
    });

    // Track relationships automatically
    try {
      const { RelationshipHooks } = await import('@/lib/relationship-hooks');
      await RelationshipHooks.onDealCreated({
        userId: user.id,
        dealId: deal.id,
        leadId: leadId,
      });
    } catch (error) {
      console.error('Error tracking deal relationships:', error);
      // Don't fail the request if relationship tracking fails
    }

    // Trigger DEAL_CREATED workflows
    workflowEngine.triggerWorkflow('DEAL_CREATED', {
      userId: user.id,
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
