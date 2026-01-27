
/**
 * Voice AI Reservation Lookup Endpoint
 * 
 * Looks up a reservation by confirmation code.
 * Useful for customers calling to modify or cancel reservations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { format } from 'date-fns';


export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmationCode, userId } = body;

    if (!confirmationCode) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Please provide your confirmation code.',
          error: 'Missing confirmation code' 
        },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        confirmationCode: confirmationCode.toUpperCase(),
        ...(userId && { userId }),
      },
      include: {
        table: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: `I couldn't find a reservation with confirmation code ${confirmationCode.split('').join(' ')}. Could you please check the code and try again?`,
        },
        { status: 404 }
      );
    }

    // Format the response in a voice-friendly way
    const dateFormatted = format(new Date(reservation.reservationDate), 'MMMM do, yyyy');
    const message = `I found your reservation for ${reservation.customerName}, party of ${reservation.partySize}, on ${dateFormatted} at ${reservation.reservationTime}. The status is ${reservation.status.toLowerCase()}. ${reservation.table ? `You're reserved at ${reservation.table.tableName}.` : ''} How can I help you with this reservation?`;

    return NextResponse.json({
      success: true,
      message,
      reservation: {
        id: reservation.id,
        confirmationCode: reservation.confirmationCode,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        date: format(new Date(reservation.reservationDate), 'yyyy-MM-dd'),
        time: reservation.reservationTime,
        partySize: reservation.partySize,
        status: reservation.status,
        table: reservation.table?.tableName,
        specialRequests: reservation.specialRequests,
        occasion: reservation.occasion,
      },
    });
  } catch (error: any) {
    console.error('❌ Error looking up reservation:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'System error occurred while looking up your reservation',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
