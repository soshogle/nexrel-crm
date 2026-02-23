import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { campaignService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { voiceCampaignScheduler } from '@/lib/voice-campaign-scheduler';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    console.log('Voice campaign processing triggered by', session.user.email);

    const result = await voiceCampaignScheduler.processRunningCampaigns(session.user.id);

    return NextResponse.json({
      message: `Processed ${result.processed} campaigns`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in voice campaign scheduling:', error);
    return apiErrors.internal(error.message || 'Failed to process voice campaigns');
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const runningCampaigns = await campaignService.count(ctx, {
      type: 'VOICE_CALL',
      status: 'RUNNING',
    });

    const scheduledCampaigns = await campaignService.count(ctx, {
      type: 'VOICE_CALL',
      status: 'SCHEDULED',
    });

    return NextResponse.json({
      runningCampaigns,
      scheduledCampaigns,
      nextProcessingIn: '5 minutes',
    });
  } catch (error: any) {
    console.error('Error checking campaign status:', error);
    return apiErrors.internal(error.message || 'Failed to check campaign status');
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
