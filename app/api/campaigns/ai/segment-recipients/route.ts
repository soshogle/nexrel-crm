
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Get AI-powered recipient segmentation suggestions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignGoal, recipientType } = body;

    // Validation
    if (!campaignGoal) {
      return NextResponse.json(
        { error: 'Campaign goal is required' },
        { status: 400 }
      );
    }

    // Fetch user's leads or deals
    let availableData: any[] = [];

    if (recipientType === 'deals') {
      availableData = await prisma.deal.findMany({
        where: { userId: session.user.id },
        include: {
          lead: {
            select: {
              businessName: true,
              email: true,
              phone: true,
              status: true,
            },
          },
        },
        take: 100, // Limit for performance
      });
    } else {
      // Default to leads
      availableData = await prisma.lead.findMany({
        where: { userId: session.user.id },
        select: {
          id: true,
          businessName: true,
          email: true,
          phone: true,
          status: true,
          city: true,
          state: true,
        },
        take: 100, // Limit for performance
      });
    }

    // Get AI segmentation suggestions
    const segments = await aiCampaignGenerator.suggestRecipientSegments(
      campaignGoal,
      availableData
    );

    return NextResponse.json({ segments });
  } catch (error) {
    console.error('Error generating recipient segments:', error);
    return NextResponse.json(
      { error: 'Failed to generate recipient segments' },
      { status: 500 }
    );
  }
}
