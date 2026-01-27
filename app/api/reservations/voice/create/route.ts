
/**
 * Voice AI Reservation Creation Endpoint
 * 
 * Creates a reservation from voice call data.
 * Handles natural language date/time parsing and auto-confirmation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createVoiceReservation } from '@/lib/voice-reservation-helper';


export const dynamic = 'force-dynamic';

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
      partySize,
      specialRequests,
      occasion,
    } = body;

    // Validate required fields
    if (!userId || !customerName || !customerPhone || !date || !time || !partySize) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Missing required information. Please provide: name, phone, date, time, and party size.',
          error: 'Missing required fields' 
        },
        { status: 400 }
      );
    }

    const result = await createVoiceReservation({
      userId,
      customerName,
      customerPhone,
      customerEmail,
      date,
      time,
      partySize: parseInt(partySize),
      specialRequests,
      occasion,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        confirmationCode: result.confirmationCode,
        message: result.message,
        reservation: result.reservation,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error creating voice reservation:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'System error occurred while creating reservation',
        error: error.message 
      },
      { status: 500 }
      );
  }
}
