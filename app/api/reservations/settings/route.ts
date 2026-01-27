
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma as db } from '@/lib/db';

// GET /api/reservations/settings - Get reservation settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let settings = await db.reservationSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Create default settings if none exist
    if (!settings) {
      settings = await db.reservationSettings.create({
        data: {
          userId: session.user.id,
          operatingHours: {
            monday: [{ start: '11:00', end: '22:00' }],
            tuesday: [{ start: '11:00', end: '22:00' }],
            wednesday: [{ start: '11:00', end: '22:00' }],
            thursday: [{ start: '11:00', end: '22:00' }],
            friday: [{ start: '11:00', end: '23:00' }],
            saturday: [{ start: '11:00', end: '23:00' }],
            sunday: [{ start: '12:00', end: '21:00' }],
          },
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/reservations/settings - Update reservation settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.acceptReservations !== undefined) updateData.acceptReservations = body.acceptReservations;
    if (body.minAdvanceHours !== undefined) updateData.minAdvanceHours = parseInt(body.minAdvanceHours);
    if (body.maxAdvanceDays !== undefined) updateData.maxAdvanceDays = parseInt(body.maxAdvanceDays);
    if (body.slotDuration !== undefined) updateData.slotDuration = parseInt(body.slotDuration);
    if (body.bufferBetweenSlots !== undefined) updateData.bufferBetweenSlots = parseInt(body.bufferBetweenSlots);
    if (body.operatingHours !== undefined) updateData.operatingHours = body.operatingHours;
    if (body.requireDeposit !== undefined) updateData.requireDeposit = body.requireDeposit;
    if (body.depositAmount !== undefined) updateData.depositAmount = parseFloat(body.depositAmount);
    if (body.depositMinPartySize !== undefined) updateData.depositMinPartySize = parseInt(body.depositMinPartySize);
    if (body.cancellationPolicy !== undefined) updateData.cancellationPolicy = body.cancellationPolicy;
    if (body.cancellationHours !== undefined) updateData.cancellationHours = parseInt(body.cancellationHours);
    if (body.sendReminders !== undefined) updateData.sendReminders = body.sendReminders;
    if (body.reminderHoursBefore !== undefined) updateData.reminderHoursBefore = parseInt(body.reminderHoursBefore);
    if (body.reminderChannels !== undefined) updateData.reminderChannels = body.reminderChannels;
    if (body.maxPartySizeOnline !== undefined) updateData.maxPartySizeOnline = parseInt(body.maxPartySizeOnline);
    if (body.allowOverbooking !== undefined) updateData.allowOverbooking = body.allowOverbooking;
    if (body.overbookingPercentage !== undefined) updateData.overbookingPercentage = parseInt(body.overbookingPercentage);
    if (body.allowPreOrders !== undefined) updateData.allowPreOrders = body.allowPreOrders;
    if (body.preOrderDeadlineHours !== undefined) updateData.preOrderDeadlineHours = parseInt(body.preOrderDeadlineHours);
    if (body.enableVoiceBooking !== undefined) updateData.enableVoiceBooking = body.enableVoiceBooking;
    if (body.voiceAgentId !== undefined) updateData.voiceAgentId = body.voiceAgentId;

    const settings = await db.reservationSettings.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: {
        userId: session.user.id,
        ...updateData,
        operatingHours: updateData.operatingHours || {
          monday: [{ start: '11:00', end: '22:00' }],
          tuesday: [{ start: '11:00', end: '22:00' }],
          wednesday: [{ start: '11:00', end: '22:00' }],
          thursday: [{ start: '11:00', end: '22:00' }],
          friday: [{ start: '11:00', end: '23:00' }],
          saturday: [{ start: '11:00', end: '23:00' }],
          sunday: [{ start: '12:00', end: '21:00' }],
        },
      },
    });

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
