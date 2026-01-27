import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/drip/[id]/sequences - List sequences

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

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

    const sequences = await prisma.emailDripSequence.findMany({
      where: { campaignId: id },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(sequences);
  } catch (error: unknown) {
    console.error('Error fetching sequences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sequences' },
      { status: 500 }
    );
  }
}

// POST /api/campaigns/drip/[id]/sequences - Create sequence
export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;
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

    // Don't allow adding sequences to active campaigns
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot add sequences to active campaign. Pause it first.' },
        { status: 400 }
      );
    }

    const {
      name,
      subject,
      previewText,
      htmlContent,
      textContent,
      sequenceOrder,
      delayDays = 0,
      delayHours = 0,
      sendTime,
      sendConditions,
      skipIfEngaged = false,
      isAbTestVariant = false,
      abTestGroup,
      variantOf,
    } = body;

    // Validate required fields
    if (!name || !subject || !htmlContent) {
      return NextResponse.json(
        { error: 'Name, subject, and content are required' },
        { status: 400 }
      );
    }

    // Determine sequence order if not provided
    let order = sequenceOrder;
    if (!order) {
      const lastSequence = await prisma.emailDripSequence.findFirst({
        where: { campaignId: id },
        orderBy: { sequenceOrder: 'desc' },
      });
      order = (lastSequence?.sequenceOrder || 0) + 1;
    }

    const sequence = await prisma.emailDripSequence.create({
      data: {
        campaignId: id,
        name,
        subject,
        previewText,
        htmlContent,
        textContent,
        sequenceOrder: order,
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

    return NextResponse.json(sequence, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating sequence:', error);
    return NextResponse.json(
      { error: 'Failed to create sequence' },
      { status: 500 }
    );
  }
}
