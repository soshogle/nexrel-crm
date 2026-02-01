/**
 * Agency Voice AI Usage API
 * 
 * Allows agencies to view their Voice AI call history and usage logs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get current user's Voice AI usage logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const result = await voiceAIPlatform.getAgencyUsageLogs(session.user.id, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[VoiceAI] Error fetching usage logs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch usage logs' },
      { status: 500 }
    );
  }
}
