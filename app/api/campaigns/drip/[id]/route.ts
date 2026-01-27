import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/drip/[id] - Get specific campaign

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

    const campaign = await prisma.emailDripCampaign.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
          include: {
            _count: {
              select: { messages: true },
            },
          },
        },
        enrollments: {
          include: {
            messages: {
              select: {
                id: true,
                status: true,
                sentAt: true,
                openedAt: true,
                clickedAt: true,
              },
            },
          },
          orderBy: { enrolledAt: 'desc' },
          take: 100,
        },
        _count: {
          select: { enrollments: true, sequences: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/drip/[id] - Update campaign
export async function PUT(
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

    // Verify ownership
    const existing = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow updating active campaigns
    if (existing.status === 'ACTIVE' && body.status !== 'PAUSED') {
      return NextResponse.json(
        { error: 'Cannot update active campaign. Pause it first.' },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      triggerType,
      triggerConfig,
      fromName,
      fromEmail,
      replyTo,
      enableAbTesting,
      abTestConfig,
      tags,
      status,
    } = body;

    const campaign = await prisma.emailDripCampaign.update({
      where: { id },
      data: {
        name,
        description,
        triggerType,
        triggerConfig,
        fromName,
        fromEmail,
        replyTo,
        enableAbTesting,
        abTestConfig,
        tags,
        status,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: 'asc' },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json(campaign);
  } catch (error: unknown) {
    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/drip/[id] - Delete campaign
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    // Verify ownership
    const campaign = await prisma.emailDripCampaign.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting active campaigns
    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Cannot delete active campaign. Pause or complete it first.' },
        { status: 400 }
      );
    }

    await prisma.emailDripCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
