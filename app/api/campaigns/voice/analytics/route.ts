import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { voiceCampaignScheduler } from '@/lib/voice-campaign-scheduler';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return apiErrors.badRequest('Campaign ID is required');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const campaign = await campaignService.findUnique(ctx, campaignId);

    if (!campaign) {
      return apiErrors.notFound('Campaign not found');
    }

    const analytics = await voiceCampaignScheduler.getCampaignAnalytics(campaignId);

    return NextResponse.json({
      success: true,
      campaignId,
      campaignName: campaign.name,
      ...analytics,
    });
  } catch (error: any) {
    console.error('Error fetching campaign analytics:', error);
    return apiErrors.internal(error.message || 'Failed to fetch analytics');
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
