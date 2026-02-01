
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Get AI-powered send time recommendation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignType, targetAudience, campaignGoal } = body;

    // Validation
    if (!campaignType || !campaignGoal) {
      return NextResponse.json(
        { error: 'Campaign type and goal are required' },
        { status: 400 }
      );
    }

    // Get AI send time recommendation
    const recommendation = await aiCampaignGenerator.recommendSendTime(
      campaignType,
      targetAudience || 'General audience',
      campaignGoal
    );

    return NextResponse.json({ recommendation });
  } catch (error) {
    console.error('Error getting send time recommendation:', error);
    return NextResponse.json(
      { error: 'Failed to get send time recommendation' },
      { status: 500 }
    );
  }
}
