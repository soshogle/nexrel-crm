import { NextRequest, NextResponse } from 'next/server';
import { createBooking } from '@/lib/elevenlabs-booking-functions';

export const dynamic = 'force-dynamic';

/**
 * ElevenLabs Custom Function: Create Booking
 * This endpoint is called by the ElevenLabs AI agent during phone conversations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      customerName,
      customerPhone,
      customerEmail,
      date,
      time,
      meetingType,
      notes
    } = body;

    // Validate required parameters
    if (!userId || !customerName || !customerPhone || !date || !time) {
      return NextResponse.json(
        {
          success: false,
          message: "I'm missing some required information to book your appointment. Could you please provide your name, phone number, and preferred date and time?"
        },
        { status: 400 }
      );
    }

    // Create the booking
    const result = await createBooking({
      userId,
      customerName,
      customerPhone,
      customerEmail,
      date,
      time,
      meetingType,
      notes
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('❌ [Create Booking API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: "I'm having trouble creating your booking right now. Please try again or contact us directly.",
        error: error.message
      },
      { status: 500 }
    );
  }
}
