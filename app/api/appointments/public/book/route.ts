import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

    // Verify user exists
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

    // Check for conflicts
    const conflictingAppointment = await prisma.bookingAppointment.findFirst({
      where: {
        userId: userId,
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
    let lead = await prisma.lead.findFirst({
      where: {
        userId: userId,
        email: customerEmail,
      },
    })

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          businessName: customerName,
          contactPerson: customerName,
          email: customerEmail,
          phone: customerPhone || '',
          status: 'NEW',
          source: 'BOOKING_WIDGET',
          userId: userId,
        },
      })
    }

    // Create appointment
    const appointment = await prisma.bookingAppointment.create({
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
        userId: userId,
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
