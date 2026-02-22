import { NextRequest, NextResponse } from 'next/server'
import { leadService, getCrmDb } from '@/lib/dal'
import { createDalContext } from '@/lib/context/industry-context'

// POST /api/appointments/public/book - Public booking endpoint for widget

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId, // The business owner's user ID
      customerName,
      customerEmail,
      customerPhone,
      startTime,
      endTime,
      location,
      meetingType,
      notes,
    } = body

    // Validate required fields
    if (!userId || !customerName || !customerEmail || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify user exists (User model stays on prisma - meta DB)
    const { prisma } = await import('@/lib/db');
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 404 }
      )
    }

    // Validate times
    const start = new Date(startTime)
    const end = new Date(endTime)
    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      )
    }

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    const ctx = createDalContext(userId);

    // Check for conflicts
    const conflictingAppointment = await getCrmDb(ctx).bookingAppointment.findFirst({
      where: {
        userId: ctx.userId,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        appointmentDate: {
          gte: new Date(start.getTime() - 60 * 60 * 1000),
          lte: new Date(start.getTime() + 60 * 60 * 1000),
        },
      },
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Time slot is no longer available' },
        { status: 409 }
      )
    }

    // Create or find lead
    let lead = await leadService.findMany(ctx, {
      where: { email: customerEmail },
      take: 1,
    }).then((r) => r[0]);

    if (!lead) {
      lead = await leadService.create(ctx, {
        businessName: customerName,
        contactPerson: customerName,
        email: customerEmail,
        phone: customerPhone || '',
        status: 'NEW',
        source: 'BOOKING_WIDGET',
      })
    }

    // Create appointment
    const appointment = await getCrmDb(ctx).bookingAppointment.create({
      data: {
        appointmentDate: start,
        duration,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        meetingLocation: location,
        meetingLink: meetingType === 'VIDEO_CALL' ? location : null,
        notes: notes || '',
        status: 'SCHEDULED',
        userId: ctx.userId,
        leadId: lead.id,
      },
      include: {
        lead: true,
      },
    })

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        duration: appointment.duration,
        meetingLocation: appointment.meetingLocation,
      },
      message: 'Appointment booked successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating public appointment:', error)
    return NextResponse.json(
      { error: 'Failed to book appointment' },
      { status: 500 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
