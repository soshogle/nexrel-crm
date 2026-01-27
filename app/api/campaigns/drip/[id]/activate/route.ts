import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/activate - Activate campaign

export const dynamic = 'force-dynamic';

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
      include: {
        sequences: true,
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaign is already active' },
        { status: 400 }
      );
    }

    // Validate campaign has sequences
    if (campaign.sequences.length === 0) {
      return NextResponse.json(
        { error: 'Campaign must have at least one sequence to activate' },
        { status: 400 }
      );
    }

    // Validate all sequences have required fields
    const invalidSequences = campaign.sequences.filter(
      s => !s.subject || !s.htmlContent
    );

    if (invalidSequences.length > 0) {
      return NextResponse.json(
        { error: 'All sequences must have subject and content' },
        { status: 400 }
      );
    }

    // Activate campaign
    const updated = await prisma.emailDripCampaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: 'Campaign activated successfully',
    });
  } catch (error: unknown) {
    console.error('Error activating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to activate campaign' },
      { status: 500 }
    );
  }
}
