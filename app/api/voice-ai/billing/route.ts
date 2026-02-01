/**
 * Agency Voice AI Billing API
 * 
 * Allows agencies to view their Voice AI billing records.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get current user's Voice AI billing records
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const billingRecords = await voiceAIPlatform.getAgencyBillingRecords(session.user.id);

    return NextResponse.json({ billingRecords });
  } catch (error: unknown) {
    console.error('[VoiceAI] Error fetching billing records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch billing records' },
      { status: 500 }
    );
  }
}
