/**
 * Agency Voice AI Billing API
 * 
 * Allows agencies to view their Voice AI billing records.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { voiceAIPlatform } from '@/lib/voice-ai-platform';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Get current user's Voice AI billing records
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const billingRecords = await voiceAIPlatform.getAgencyBillingRecords(session.user.id);

    return NextResponse.json({ billingRecords });
  } catch (error: unknown) {
    console.error('[VoiceAI] Error fetching billing records:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to fetch billing records');
  }
}
