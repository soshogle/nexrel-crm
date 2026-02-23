
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Get AI-powered send time recommendation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { campaignType, targetAudience, campaignGoal } = body;

    // Validation
    if (!campaignType || !campaignGoal) {
      return apiErrors.badRequest('Campaign type and goal are required');
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
    return apiErrors.internal('Failed to get send time recommendation');
  }
}
