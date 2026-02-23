import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/activate - Activate campaign

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.notFound('Campaign not found');
    }

    if (campaign.status === 'ACTIVE') {
      return apiErrors.badRequest('Campaign is already active');
    }

    // Validate campaign has sequences
    if (campaign.sequences.length === 0) {
      return apiErrors.badRequest('Campaign must have at least one sequence to activate');
    }

    // Validate all sequences have required fields
    const invalidSequences = campaign.sequences.filter(
      s => !s.subject || !s.htmlContent
    );

    if (invalidSequences.length > 0) {
      return apiErrors.badRequest('All sequences must have subject and content');
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
    return apiErrors.internal('Failed to activate campaign');
  }
}
