
/**
 * Voice AI Reservation Cancellation Endpoint
 * 
 * Cancels a reservation by confirmation code.
 * Handles voice-based cancellation requests.
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
          message: 'Please provide your confirmation code to cancel the reservation.',
          error: 'Missing confirmation code' 
        },
        { status: 400 }
      );
    }

    // Find the reservation
    const reservation = await prisma.reservation.findFirst({
      where: {
        confirmationCode: confirmationCode.toUpperCase(),
        ...(userId && { userId }),
      },
    });

    if (!reservation) {
      return NextResponse.json(
        {
          success: false,
          message: `I couldn't find a reservation with confirmation code ${confirmationCode.split('').join(' ')}. Could you please check the code?`,
        },
        { status: 404 }
      );
    }

    // Check if already cancelled
    if (reservation.status === 'CANCELLED') {
      return NextResponse.json(
        {
          success: false,
          message: 'This reservation has already been cancelled.',
        },
        { status: 400 }
      );
    }

    // Cancel the reservation
    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELLED',
      },
    });

    // Log the activity
    await prisma.reservationActivity.create({
      data: {
        reservationId: reservation.id,
        type: 'CANCELLED',
        description: 'Reservation cancelled via Voice AI call',
        performedBy: 'system',
      },
    });

    // Cancel any pending reminders
    await prisma.reservationReminder.updateMany({
      where: {
        reservationId: reservation.id,
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
      },
    });

    const dateFormatted = format(new Date(reservation.reservationDate), 'MMMM do');
    const message = `Your reservation for ${reservation.customerName}, party of ${reservation.partySize}, on ${dateFormatted} at ${reservation.reservationTime} has been successfully cancelled. Is there anything else I can help you with?`;

    return NextResponse.json({
      success: true,
      message,
      reservation: {
        confirmationCode: reservation.confirmationCode,
        status: 'CANCELLED',
      },
    });
  } catch (error: any) {
    console.error('❌ Error cancelling reservation:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'System error occurred while cancelling your reservation',
        error: error.message 
      },
      { status: 500 }
    );
  }
}
