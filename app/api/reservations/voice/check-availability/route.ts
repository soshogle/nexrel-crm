
/**
 * Voice AI Availability Check Endpoint
 * 
 * Checks table availability for a given date and party size.
 * Designed to be called by Voice AI agents during phone conversations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/voice-reservation-helper';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, partySize } = body;

    if (!userId || !date || !partySize) {
      return apiErrors.badRequest('Missing required fields: userId, date, partySize');
    }

    const result = await checkAvailability({
      userId,
      date,
      partySize: parseInt(partySize),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ Error checking availability:', error);
    return NextResponse.json(
      { 
        available: false,
        message: 'System error occurred while checking availability',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
