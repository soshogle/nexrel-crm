import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/elevenlabs-booking-functions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * ElevenLabs Custom Function: Check Availability
 * This endpoint is called by the ElevenLabs AI agent during phone conversations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, date, time } = body;

    // Validate required parameters
    if (!userId || !date) {
      return NextResponse.json(
        { 
          error: 'Missing required parameters',
          available: false,
          message: "I'm missing some required information. Could you please try again?"
        },
        { status: 400 }
      );
    }

    // Check availability
    const result = await checkAvailability({ userId, date, time });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [Check Availability API] Error:', error);
    return NextResponse.json(
      {
        available: false,
        message: "I'm having trouble checking availability right now. Please try again.",
        error: error.message
      },
      { status: 500 }
    );
  }
}

// Allow GET for testing purposes
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const date = searchParams.get('date');
  const time = searchParams.get('time') || undefined;

  if (!userId || !date) {
    return NextResponse.json(
      { error: 'Missing userId or date parameter' },
      { status: 400 }
    );
  }

  try {
    const result = await checkAvailability({ userId, date, time });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
