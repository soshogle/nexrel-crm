
/**
 * External Calendar Webhook API
 * Receive and process events from external booking systems
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature/authentication
    const authHeader = request.headers.get('authorization');
    const apiKey = authHeader?.replace('Bearer ', '');

    if (!apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find calendar connection with matching API key
    const connection = await prisma.calendarConnection.findFirst({
      where: {
        apiKey,
        provider: 'EXTERNAL_API',
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await request.json();
    const { event_type, event } = body;

    // Handle different event types
    switch (event_type) {
      case 'appointment.created':
      case 'appointment.updated':
        await handleAppointmentEvent(connection.userId, event, connection.id);
        break;
      case 'appointment.cancelled':
        await handleAppointmentCancellation(connection.userId, event.id);
        break;
      default:
        console.warn(`Unknown event type: ${event_type}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

async function handleAppointmentEvent(
  userId: string,
  event: any,
  connectionId: string
) {
  try {
    const appointmentData = {
      calendarConnectionId: connectionId,
      customerName: event.customer_name || event.attendee?.name || 'Unknown',
      customerEmail: event.customer_email || event.attendee?.email,
      customerPhone: event.customer_phone || event.attendee?.phone || '',
      appointmentDate: new Date(event.start_time || event.startTime),
      duration: event.duration || 30,
      status: (event.status === 'confirmed' ? 'CONFIRMED' : 'SCHEDULED') as any,
      notes: event.notes || event.description,
      externalEventId: event.id || event.event_id,
      externalEventLink: event.url || event.event_url,
      syncStatus: 'SYNCED' as any,
      lastSyncAt: new Date(),
    };

    // Try to find existing appointment by external event ID
    const existing = await prisma.bookingAppointment.findFirst({
      where: {
        userId,
        externalEventId: appointmentData.externalEventId,
      },
    });

    if (existing) {
      // Update existing
      await prisma.bookingAppointment.update({
        where: { id: existing.id },
        data: appointmentData,
      });
    } else {
      // Create new (would need callLogId - skip for webhook-only appointments)
      console.log('New external appointment received but requires callLog association');
    }
  } catch (error) {
    console.error('Error handling appointment event:', error);
  }
}

async function handleAppointmentCancellation(userId: string, externalEventId: string) {
  try {
    await prisma.bookingAppointment.updateMany({
      where: {
        userId,
        externalEventId,
      },
      data: {
        status: 'CANCELLED',
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error handling appointment cancellation:', error);
  }
}
