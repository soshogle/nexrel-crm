
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/appointments - List all appointments for the user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {
      userId: session.user.id,
    }

    if (status) {
      where.status = status
    }

    if (startDate || endDate) {
      where.appointmentDate = {}
      if (startDate) {
        where.appointmentDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.appointmentDate.lte = new Date(endDate)
      }
    }

    const appointments = await prisma.bookingAppointment.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        contact: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentType: true,
          },
        },
      },
      orderBy: {
        appointmentDate: 'asc',
      },
    })

    // Also fetch voice AI reservations and include them in the calendar
    const reservations = await prisma.reservation.findMany({
      where: {
        userId: session.user.id,
        ...(status && {
          status: status === 'SCHEDULED' ? 'CONFIRMED' : 
                  status === 'COMPLETED' ? 'COMPLETED' : 
                  status === 'CANCELLED' ? 'CANCELLED' : undefined
        }),
        ...(startDate || endDate ? {
          reservationDate: {
            ...(startDate && { gte: new Date(startDate) }),
            ...(endDate && { lte: new Date(endDate) }),
          },
        } : {}),
      },
      orderBy: {
        reservationDate: 'asc',
      },
    })

    console.log(`📞 Found ${reservations.length} voice AI reservations to include`)

    // Transform appointments to include startTime and endTime for calendar compatibility
    // Filter out appointments with invalid dates first
    const transformedAppointments = appointments
      .filter((apt) => {
        if (!apt.appointmentDate) {
          console.warn('⚠️ Skipping appointment with null appointmentDate:', apt.id)
          return false
        }
        const testDate = new Date(apt.appointmentDate)
        if (isNaN(testDate.getTime())) {
          console.warn('⚠️ Skipping appointment with invalid appointmentDate:', apt.id, apt.appointmentDate)
          return false
        }
        return true
      })
      .map((apt) => {
        const startTime = new Date(apt.appointmentDate)
        // Use duration if available, otherwise default to 30 minutes
        const durationMinutes = apt.duration || 30
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000)
        
        return {
          ...apt,
          title: apt.customerName || 'Untitled', // Ensure we have a title
          description: apt.notes || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: apt.meetingLocation || null,
          meetingType: 'PHONE', // Default type, can be enhanced later
          status: apt.status || 'SCHEDULED', // Ensure status is always set
          source: 'APPOINTMENT',
        }
      })

    // Transform voice reservations to match appointment format
    const transformedReservations = reservations
      .filter((res) => {
        if (!res.reservationDate || !res.reservationTime) {
          console.warn('⚠️ Skipping reservation with invalid data:', res.id)
          return false
        }
        return true
      })
      .map((res) => {
        // Parse reservation time (format: "HH:MM" in 24-hour)
        const [hours, minutes] = res.reservationTime.split(':').map(Number)
        const startTime = new Date(res.reservationDate)
        startTime.setHours(hours, minutes, 0, 0)
        
        const durationMinutes = res.duration || 120
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000)
        
        // Map reservation status to appointment status
        const mappedStatus = res.status === 'CONFIRMED' ? 'SCHEDULED' :
                           res.status === 'COMPLETED' ? 'COMPLETED' :
                           res.status === 'CANCELLED' ? 'CANCELLED' :
                           res.status === 'NO_SHOW' ? 'NO_SHOW' : 'SCHEDULED'
        
        return {
          id: res.id,
          userId: res.userId,
          customerName: res.customerName,
          customerEmail: res.customerEmail || null,
          customerPhone: res.customerPhone,
          appointmentDate: startTime,
          duration: durationMinutes,
          status: mappedStatus,
          notes: res.specialRequests || res.occasion ? 
                 `${res.specialRequests || ''}${res.specialRequests && res.occasion ? ' | ' : ''}${res.occasion || ''}`.trim() : 
                 null,
          title: `${res.customerName} (Party of ${res.partySize})`,
          description: res.specialRequests || res.occasion || null,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          location: res.section || null,
          meetingType: 'PHONE_CALL',
          confirmationCode: res.confirmationCode,
          partySize: res.partySize,
          source: 'VOICE_AI',
          lead: null,
          contact: null,
          payment: null,
        }
      })

    // Combine both arrays and sort by date
    const allAppointments = [...transformedAppointments, ...transformedReservations]
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())

    console.log(`📅 Returning ${allAppointments.length} total appointments (${transformedAppointments.length} appointments + ${transformedReservations.length} voice reservations)`)

    return NextResponse.json(allAppointments)
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointments' },
      { status: 500 }
    )
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      startTime,
      endTime,
      location,
      leadId,
      contactId,
      meetingType,
      requiresPayment,
      notes,
    } = body
    
    console.log('📥 Received appointment data:', { title, startTime, endTime, leadId, contactId, meetingType, location })

    // Validate required fields - must have either lead or contact
    if (!leadId && !contactId) {
      console.error('❌ Validation failed: No lead or contact ID provided', { leadId, contactId })
      return NextResponse.json(
        { error: 'A customer/lead or contact must be selected for this appointment' },
        { status: 400 }
      )
    }

    if (!startTime || !endTime) {
      return NextResponse.json(
        { error: 'Start time and end time are required' },
        { status: 400 }
      )
    }

    // Validate times
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    // Check for valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date/time values provided' },
        { status: 400 }
      )
    }

    // Check if start time is in the past
    const now = new Date()
    if (start < now) {
      return NextResponse.json(
        { error: 'Cannot create an appointment in the past' },
        { status: 400 }
      )
    }

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
        userId: session.user.id,
        status: {
          notIn: ['CANCELLED', 'NO_SHOW'],
        },
        appointmentDate: {
          gte: new Date(start.getTime() - 60 * 60 * 1000), // 1 hour before
          lte: new Date(start.getTime() + 60 * 60 * 1000), // 1 hour after
        },
      },
    })

    if (conflictingAppointment) {
      return NextResponse.json(
        { error: 'Time slot conflicts with an existing appointment' },
        { status: 409 }
      )
    }

    // Get customer name from lead or contact
    let customerName = title || 'New Appointment'
    let customerEmail = ''
    let customerPhone = ''

    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { contactPerson: true, email: true, phone: true },
      })
      if (lead) {
        customerName = lead.contactPerson || customerName
        customerEmail = lead.email || ''
        customerPhone = lead.phone || ''
      }
    } else if (contactId) {
      const contact = await prisma.lead.findUnique({
        where: { id: contactId },
        select: { contactPerson: true, businessName: true, email: true, phone: true },
      })
      if (contact) {
        customerName = contact.contactPerson || contact.businessName || customerName
        customerEmail = contact.email || ''
        customerPhone = contact.phone || ''
      }
    }

    // Create appointment
    const appointment = await prisma.bookingAppointment.create({
      data: {
        appointmentDate: start,
        duration,
        meetingLocation: location,
        meetingLink: meetingType === 'VIDEO_CALL' ? location : null,
        requiresPayment: requiresPayment || false,
        notes,
        status: 'SCHEDULED',
        userId: session.user.id,
        leadId: leadId || null,
        contactId: contactId || null,
        customerName,
        customerEmail,
        customerPhone,
      },
      include: {
        lead: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
        contact: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Failed to create appointment' },
      { status: 500 }
    )
  }
}
