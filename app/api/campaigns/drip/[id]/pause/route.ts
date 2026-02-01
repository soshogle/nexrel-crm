import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/pause - Pause campaign

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    if (campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Only active campaigns can be paused' },
        { status: 400 }
      );
    }

    // Pause campaign
    const updated = await prisma.emailDripCampaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    // Pause all active enrollments
    await prisma.emailDripEnrollment.updateMany({
      where: {
        campaignId: id,
        status: 'ACTIVE',
      },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: 'Campaign paused successfully',
    });
  } catch (error: unknown) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: 'Failed to pause campaign' },
      { status: 500 }
    );
  }
}
