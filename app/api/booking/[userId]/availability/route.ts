import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addDays, format, parse, isAfter, isBefore, addMinutes } from 'date-fns';

export const dynamic = 'force-dynamic';

// GET /api/booking/[userId]/availability?date=YYYY-MM-DD
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Get user's booking settings
    const settings = await prisma.bookingSettings.findUnique({
      where: { userId: params.userId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Booking settings not found for this user' },
        { status: 404 }
      );
    }

    const requestedDate = new Date(dateParam);
    const dayOfWeek = format(requestedDate, 'EEEE').toLowerCase() as
      | 'monday'
      | 'tuesday'
      | 'wednesday'
      | 'thursday'
      | 'friday'
      | 'saturday'
      | 'sunday';

    // Check if day is enabled
    const schedule = settings.availabilitySchedule as any;
    const daySchedule = schedule[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled) {
      return NextResponse.json({
        availableSlots: [],
        message: 'No availability on this day',
      });
    }

    // Generate time slots
    const startTime = parse(daySchedule.start, 'HH:mm', requestedDate);
    const endTime = parse(daySchedule.end, 'HH:mm', requestedDate);
    const slotDuration = settings.slotDuration || 30;
    const bufferTime = settings.bufferTime || 0;
    const minNoticeHours = settings.minNoticeHours || 0;

    const slots: string[] = [];
    let currentSlot = startTime;

    while (isBefore(currentSlot, endTime)) {
      const slotTime = format(currentSlot, 'HH:mm');
      const slotDateTime = parse(slotTime, 'HH:mm', requestedDate);

      // Check if slot is in the future (considering min notice hours)
      const now = new Date();
      const minBookingTime = addMinutes(now, minNoticeHours * 60);

      if (isAfter(slotDateTime, minBookingTime)) {
        slots.push(slotTime);
      }

      currentSlot = addMinutes(currentSlot, slotDuration + bufferTime);
    }

    // Get existing appointments for this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.bookingAppointment.findMany({
      where: {
        userId: params.userId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
      },
      select: {
        appointmentDate: true,
        duration: true,
      },
    });

    // Filter out booked slots
    const availableSlots = slots.filter((slot) => {
      const slotStart = parse(slot, 'HH:mm', requestedDate);
      const slotEnd = addMinutes(slotStart, slotDuration);

      // Check if this slot conflicts with any existing appointment
      const hasConflict = existingAppointments.some((apt) => {
        const aptStart = new Date(apt.appointmentDate);
        const aptEnd = addMinutes(aptStart, apt.duration);
        return (
          (isAfter(slotStart, aptStart) && isBefore(slotStart, aptEnd)) ||
          (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
          (isBefore(slotStart, aptStart) && isAfter(slotEnd, aptEnd))
        );
      });

      return !hasConflict;
    });

    return NextResponse.json({
      availableSlots,
      slotDuration,
      date: dateParam,
    });
  } catch (error: any) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch availability' },
      { status: 500 }
    );
  }
}
