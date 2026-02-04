
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';
import { detectDealStageWorkflowTriggers } from '@/lib/real-estate/workflow-triggers';

// GET /api/deals/[id] - Get single deal

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: {
        lead: true,
        assignedTo: true,
        stage: true,
        pipeline: true,
        activities: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

// PATCH /api/deals/[id] - Update deal
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const data = await request.json();
    const existingDeal = await prisma.deal.findUnique({
      where: { id: params.id },
      include: { stage: true },
    });

    if (!existingDeal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Check if stage changed
    let stageChanged = false;
    let newProbability = existingDeal.probability;
    let newStage = null;

    if (data.stageId && data.stageId !== existingDeal.stageId) {
      stageChanged = true;
      newStage = await prisma.pipelineStage.findUnique({
        where: { id: data.stageId },
      });
      if (newStage) {
        newProbability = newStage.probability;
      }
    }

    // Update deal
    const updatedDeal = await prisma.deal.update({
      where: { id: params.id },
      data: {
        ...data,
        probability: data.stageId ? newProbability : existingDeal.probability,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : existingDeal.expectedCloseDate,
      },
      include: {
        lead: true,
        assignedTo: true,
        stage: true,
      },
    });

    // Log activity
    if (stageChanged) {
      await prisma.dealActivity.create({
        data: {
          dealId: params.id,
          userId: user.id,
          type: 'STAGE_CHANGED',
          description: `Deal moved from "${existingDeal.stage.name}" to stage`,
        },
      });

      // Trigger DEAL_STAGE_CHANGED workflows (generic)
      workflowEngine.triggerWorkflow('DEAL_STAGE_CHANGED', {
        userId: user.id,
        dealId: params.id,
        leadId: updatedDeal.leadId || undefined,
        variables: {
          dealTitle: updatedDeal.title,
          dealValue: updatedDeal.value,
          businessName: updatedDeal.lead?.businessName,
        },
      }, {
        oldStageId: existingDeal.stageId,
        newStageId: data.stageId,
      }).catch(err => console.error('Deal stage changed workflow trigger failed:', err));

      // Trigger RE-specific workflows if user is in real estate industry
      if (user.industry === 'REAL_ESTATE' && newStage) {
        detectDealStageWorkflowTriggers(user.id, params.id, newStage.name || '').catch(err => {
          console.error('[RE Workflow] Failed to trigger RE workflow for deal:', err);
        });
      }

      // Check if deal is won (moved to CLOSED_WON stage)
      if (newStage?.name?.toLowerCase().includes('won') || newStage?.name?.toLowerCase().includes('closed won')) {
        // Trigger DEAL_WON workflows
        workflowEngine.triggerWorkflow('DEAL_WON', {
          userId: user.id,
          dealId: params.id,
          leadId: updatedDeal.leadId || undefined,
          variables: {
            dealTitle: updatedDeal.title,
            dealValue: updatedDeal.value,
            contactName: updatedDeal.lead?.contactPerson || updatedDeal.lead?.businessName,
          },
        }).catch(err => console.error('Deal won workflow trigger failed:', err));
      }
    } else if (data.value && data.value !== existingDeal.value) {
      await prisma.dealActivity.create({
        data: {
          dealId: params.id,
          userId: user.id,
          type: 'VALUE_CHANGED',
          description: `Deal value changed from $${existingDeal.value} to $${data.value}`,
        },
      });
    }

    return NextResponse.json(updatedDeal);
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

// DELETE /api/deals/[id] - Delete deal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.deal.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
