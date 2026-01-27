import { NextRequest, NextResponse } from 'next/server';
import { modifyBooking } from '@/lib/elevenlabs-booking-functions';

export const dynamic = 'force-dynamic';

/**
 * ElevenLabs Custom Function: Modify Booking
 * This endpoint is called by the ElevenLabs AI agent during phone conversations
 * Handles cancellation and rescheduling
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, confirmationCode, action, newDate, newTime } = body;

    // Validate required parameters
    if (!userId || !confirmationCode || !action) {
      return NextResponse.json(
        {
          success: false,
          message: "I need your confirmation code and what you'd like to do with your appointment."
        },
        { status: 400 }
      );
    }

    if (action !== 'cancel' && action !== 'reschedule') {
      return NextResponse.json(
        {
          success: false,
          message: "I can help you cancel or reschedule your appointment. Which would you like to do?"
        },
        { status: 400 }
      );
    }

    // Modify the booking
    const result = await modifyBooking({
      userId,
      confirmationCode,
      action,
      newDate,
      newTime
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [Modify Booking API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: "I'm having trouble with that request. Please try again or contact us directly.",
        error: error.message
      },
      { status: 500 }
    );
  }
}
