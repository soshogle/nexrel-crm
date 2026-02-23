
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiCampaignGenerator } from '@/lib/ai-campaign-generator';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST - Generate SMS campaign from natural language
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
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
      return apiErrors.badRequest('Campaign description is required');
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
    return apiErrors.internal('Failed to generate SMS campaign');
  }
}
