import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { voiceCampaignScheduler } from '@/lib/voice-campaign-scheduler';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Voice campaign processing triggered by', session.user.email);

    const result = await voiceCampaignScheduler.processRunningCampaigns(session.user.id);

    return NextResponse.json({
      message: `Processed ${result.processed} campaigns`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in voice campaign scheduling:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process voice campaigns' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { prisma } = await import('@/lib/db');

    const runningCampaigns = await prisma.campaign.count({
      where: {
        userId: session.user.id,
        type: 'VOICE_CALL',
        status: 'RUNNING',
      },
    });

    const scheduledCampaigns = await prisma.campaign.count({
      where: {
        userId: session.user.id,
        type: 'VOICE_CALL',
        status: 'SCHEDULED',
      },
    });

    return NextResponse.json({
      runningCampaigns,
      scheduledCampaigns,
      nextProcessingIn: '5 minutes',
    });
  } catch (error: any) {
    console.error('Error checking campaign status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check campaign status' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
