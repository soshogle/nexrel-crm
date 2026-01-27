import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string; sequenceId: string }>;
};

// PUT /api/campaigns/drip/[id]/sequences/[sequenceId] - Update sequence
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sequenceId } = await context.params;
    const body = await req.json();

    // Verify campaign ownership
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow updating sequences in active campaigns
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot update sequences in active campaign. Pause it first.' },
        { status: 400 }
      );
    }

    // Verify sequence belongs to campaign
    const existing = await prisma.emailDripSequence.findFirst({
      where: { id: sequenceId, campaignId: id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    const {
      name,
      subject,
      previewText,
      htmlContent,
      textContent,
      sequenceOrder,
      delayDays,
      delayHours,
      sendTime,
      sendConditions,
      skipIfEngaged,
      isAbTestVariant,
      abTestGroup,
      variantOf,
    } = body;

    const sequence = await prisma.emailDripSequence.update({
      where: { id: sequenceId },
      data: {
        name,
        subject,
        previewText,
        htmlContent,
        textContent,
        sequenceOrder,
        delayDays,
        delayHours,
        sendTime,
        sendConditions,
        skipIfEngaged,
        isAbTestVariant,
        abTestGroup,
        variantOf,
      },
    });

    return NextResponse.json(sequence);
  } catch (error: unknown) {
    console.error('Error updating sequence:', error);
    return NextResponse.json(
      { error: 'Failed to update sequence' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/drip/[id]/sequences/[sequenceId] - Delete sequence
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, sequenceId } = await context.params;

    // Verify campaign ownership
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting sequences from active campaigns
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot delete sequences from active campaign. Pause it first.' },
        { status: 400 }
      );
    }

    // Verify sequence belongs to campaign
    const sequence = await prisma.emailDripSequence.findFirst({
      where: { id: sequenceId, campaignId: id },
    });

    if (!sequence) {
      return NextResponse.json(
        { error: 'Sequence not found' },
        { status: 404 }
      );
    }

    await prisma.emailDripSequence.delete({
      where: { id: sequenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting sequence:', error);
    return NextResponse.json(
      { error: 'Failed to delete sequence' },
      { status: 500 }
    );
  }
}
