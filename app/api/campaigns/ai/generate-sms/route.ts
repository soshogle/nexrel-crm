
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';

export const dynamic = 'force-dynamic';

// POST - Generate SMS campaign from natural language
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      description,
      targetAudience,
      tone,
      goal,
      businessContext,
      brandVoice,
      constraints,
    } = body;

    // Validation
    if (!description) {
      return NextResponse.json(
        { error: 'Campaign description is required' },
        { status: 400 }
      );
    }

    // Generate campaign using AI
    const campaign = await aiCampaignGenerator.generateSmsCampaign({
      description,
      campaignType: 'sms',
      targetAudience,
      tone,
      goal,
      businessContext,
      brandVoice,
      constraints,
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error generating SMS campaign:', error);
    return NextResponse.json(
      { error: 'Failed to generate SMS campaign' },
      { status: 500 }
    );
  }
}
