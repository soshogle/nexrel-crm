/**
 * Booking API for Websites
 * Allows website visitors to book appointments
 */

import { NextRequest, NextResponse } from 'next/server';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { addMinutes, parse, isAfter, isBefore } from 'date-fns';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      date,
      time,
      meetingType = 'PHONE_CALL',
      notes,
      timezone = 'UTC',
      serviceId,
    } = body;

    // Validation
    if (!customerName || !customerEmail || !date || !time) {
      return apiErrors.badRequest('Missing required fields');
    }

    // Get website and user
    const website = await getCrmDb(createDalContext('bootstrap', null)).website.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const ctx = createDalContext(website.userId);
    // Get booking settings
    const bookingSettings = await (getCrmDb(ctx) as any).bookingSettings.findUnique({
      where: { userId: website.userId },
    });

    if (!bookingSettings) {
      return apiErrors.notFound('Booking not available for this website');
    }

    // Parse appointment date/time
    const requestedDate = new Date(date);
    const appointmentDateTime = parse(time, 'HH:mm', requestedDate);
    const slotDuration = bookingSettings.slotDuration || 30;

    // Check availability
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await (getCrmDb(ctx) as any).bookingAppointment.findMany({
      where: {
        userId: website.userId,
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

    // Check for conflicts
    const slotEnd = addMinutes(appointmentDateTime, slotDuration);
    const hasConflict = existingAppointments.some((apt: any) => {
      const aptStart = new Date(apt.appointmentDate);
      const aptEnd = addMinutes(aptStart, apt.duration);
      return (
        (isAfter(appointmentDateTime, aptStart) && isBefore(appointmentDateTime, aptEnd)) ||
        (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
        (isBefore(appointmentDateTime, aptStart) && isAfter(slotEnd, aptEnd))
      );
    });

    if (hasConflict) {
      return apiErrors.conflict('This time slot is no longer available');
    }

    // Create or find lead
    let lead = await getCrmDb(ctx).lead.findFirst({
      where: {
        userId: website.userId,
        email: customerEmail,
      },
    });

    if (!lead) {
      lead = await getCrmDb(ctx).lead.create({
        data: {
          userId: website.userId,
          businessName: customerName,
          contactPerson: customerName,
          email: customerEmail,
          phone: customerPhone || '',
          status: 'NEW',
          source: 'WEBSITE_BOOKING',
        },
      });
    }

    // Determine status
    const status = bookingSettings.requireApproval ? 'SCHEDULED' : 'CONFIRMED';

    // Create appointment
    const appointment = await (getCrmDb(ctx) as any).bookingAppointment.create({
      data: {
        userId: website.userId,
        leadId: lead.id,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        appointmentDate: appointmentDateTime,
        duration: slotDuration,
        status,
        notes: notes || null,
        customerTimezone: timezone,
        meetingLocation: meetingType,
      },
    });

    // Create website visitor record
    await (getCrmDb(ctx) as any).websiteVisitor.create({
      data: {
        websiteId: params.id,
        sessionId: `booking-${Date.now()}`,
        interactions: {
          bookings: [
            {
              appointmentId: appointment.id,
              date: appointmentDateTime.toISOString(),
              serviceId,
            },
          ],
        },
      },
    });

    // Trigger website webhook
    await fetch(`${process.env.NEXTAUTH_URL}/api/webhooks/website`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteId: params.id,
        eventType: 'booking_created',
        data: {
          appointmentId: appointment.id,
          customerName,
          customerEmail,
          date: appointmentDateTime.toISOString(),
        },
      }),
    }).catch((err) => {
      console.error('Failed to trigger website webhook:', err);
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        duration: appointment.duration,
        status: appointment.status,
      },
      message: 'Appointment booked successfully',
    });
  } catch (error: any) {
    console.error('Booking error:', error);
    return apiErrors.internal(error.message || 'Failed to book appointment');
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return apiErrors.badRequest('Date parameter is required');
    }

    // Get website
    const website = await getCrmDb(createDalContext('bootstrap', null)).website.findUnique({
      where: { id: params.id },
      include: { user: true },
    });

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const ctx = createDalContext(website.userId);
    // Get booking settings
    const bookingSettings = await (getCrmDb(ctx) as any).bookingSettings.findUnique({
      where: { userId: website.userId },
    });

    if (!bookingSettings) {
      return apiErrors.notFound('Booking not available');
    }

    // Get available slots
    const requestedDate = new Date(date);
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await (getCrmDb(ctx) as any).bookingAppointment.findMany({
      where: {
        userId: website.userId,
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

    // Generate available slots based on business hours
    const slotDuration = bookingSettings.slotDuration || 30;
    const businessHours = bookingSettings.businessHours as any || {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      thursday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '17:00' },
    };

    const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = businessHours[dayOfWeek];

    if (!hours || !hours.start || !hours.end) {
      return NextResponse.json({
        success: true,
        availableSlots: [],
      });
    }

    const [startHour, startMinute] = hours.start.split(':').map(Number);
    const [endHour, endMinute] = hours.end.split(':').map(Number);

    const slots: string[] = [];
    let currentTime = new Date(requestedDate);
    currentTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(requestedDate);
    endTime.setHours(endHour, endMinute, 0, 0);

    while (currentTime < endTime) {
      const slotEnd = addMinutes(currentTime, slotDuration);
      if (slotEnd <= endTime) {
        // Check if slot conflicts with existing appointments
        const hasConflict = existingAppointments.some((apt: any) => {
          const aptStart = new Date(apt.appointmentDate);
          const aptEnd = addMinutes(aptStart, apt.duration);
          return (
            (isAfter(currentTime, aptStart) && isBefore(currentTime, aptEnd)) ||
            (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
            (isBefore(currentTime, aptStart) && isAfter(slotEnd, aptEnd))
          );
        });

        if (!hasConflict) {
          slots.push(currentTime.toTimeString().slice(0, 5));
        }
      }
      currentTime = addMinutes(currentTime, slotDuration);
    }

    return NextResponse.json({
      success: true,
      availableSlots: slots,
    });
  } catch (error: any) {
    console.error('Error getting availability:', error);
    return apiErrors.internal(error.message || 'Failed to get availability');
  }
}
