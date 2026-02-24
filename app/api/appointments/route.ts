
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { leadService, getCrmDb } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { emitCRMEvent } from '@/lib/crm-event-emitter'
import { apiErrors } from '@/lib/api-error';
import { parsePagination, paginatedResponse } from '@/lib/api-utils';

// GET /api/appointments - List all appointments for the user

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const pagination = parsePagination(request)

    const where: any = {
      userId: ctx.userId,
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

    const appointments = await getCrmDb(ctx).bookingAppointment.findMany({
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
      take: pagination.take,
      skip: pagination.skip,
    })

    // Also fetch voice AI reservations and include them in the calendar
    let reservations: Awaited<ReturnType<ReturnType<typeof getCrmDb>['reservation']['findMany']>> = []
    try {
      reservations = await getCrmDb(ctx).reservation.findMany({
        where: {
          userId: ctx.userId,
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
    } catch (resErr) {
      console.warn('⚠️ Could not fetch reservations (table may not exist):', resErr)
      // Continue with appointments only - reservations are optional
    }

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

    const total = await getCrmDb(ctx).bookingAppointment.count({ where })
    return paginatedResponse(allAppointments, total, pagination, 'appointments')
  } catch (error) {
    console.error('Error fetching appointments:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const details = process.env.NODE_ENV === 'development' ? { message, stack: error instanceof Error ? error.stack : undefined } : undefined
    return apiErrors.internal('Failed to fetch appointments', details)
  }
}

// POST /api/appointments - Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()

    const body = await request.json()
    const {
      title,
      startTime,
      endTime,
      location,
      leadId,
      contactId,
      contactFallback,
      meetingType,
      requiresPayment,
      notes,
    } = body
    
    console.log('📥 Received appointment data:', { title, startTime, endTime, leadId, contactId, meetingType, location })

    // Customer name: from lead/contact when provided, otherwise from title
    let customerName = title || 'New Appointment'
    let customerEmail = ''
    let customerPhone = ''
    let resolvedLeadId: string | null = null
    let resolvedContactId: string | null = null

    if (leadId || contactId) {
      if (leadId) {
        const lead = await leadService.findUnique(ctx, leadId)
        if (lead) {
          customerName = (lead as any).contactPerson || customerName
          customerEmail = (lead as any).email || ''
          customerPhone = (lead as any).phone || ''
          resolvedLeadId = leadId
        } else if (contactFallback?.name) {
          customerName = contactFallback.name
          customerEmail = contactFallback.email || ''
          customerPhone = contactFallback.phone || ''
          console.warn('⚠️ Lead not found in DB (id may be mock):', leadId, '- using fallback from form')
        } else {
          console.warn('⚠️ Lead not found in DB (id may be mock):', leadId, '- creating appointment without lead link')
        }
      } else if (contactId) {
        const contact = await leadService.findUnique(ctx, contactId)
        if (contact) {
          customerName = (contact as any).contactPerson || (contact as any).businessName || customerName
          customerEmail = (contact as any).email || ''
          customerPhone = (contact as any).phone || ''
          resolvedContactId = contactId
        } else if (contactFallback?.name) {
          customerName = contactFallback.name
          customerEmail = contactFallback.email || ''
          customerPhone = contactFallback.phone || ''
          console.warn('⚠️ Contact not found in DB (id may be mock):', contactId, '- using fallback from form')
        } else {
          console.warn('⚠️ Contact not found in DB (id may be mock):', contactId, '- creating appointment without contact link')
        }
      }
    }

    // customerPhone is required in schema - use placeholder when empty
    if (!customerPhone || customerPhone.trim() === '') {
      customerPhone = '—'
    }

    if (!startTime || !endTime) {
      return apiErrors.badRequest('Start time and end time are required')
    }

    // Validate times
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    // Check for valid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return apiErrors.badRequest('Invalid date/time values provided')
    }

    // Check if start time is in the past
    const now = new Date()
    if (start < now) {
      return apiErrors.badRequest('Cannot create an appointment in the past')
    }

    if (end <= start) {
      return apiErrors.badRequest('End time must be after start time')
    }

    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

    // Check for conflicts
    const conflictingAppointment = await getCrmDb(ctx).bookingAppointment.findFirst({
      where: {
        userId: ctx.userId,
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
      return apiErrors.conflict('Time slot conflicts with an existing appointment')
    }

    // Create appointment (use resolved IDs only - omit when lead/contact not found in DB to avoid FK violation)
    const appointment = await getCrmDb(ctx).bookingAppointment.create({
      data: {
        appointmentDate: start,
        duration,
        meetingLocation: location,
        meetingLink: meetingType === 'VIDEO_CALL' ? location : null,
        requiresPayment: requiresPayment || false,
        notes,
        status: 'SCHEDULED',
        userId: ctx.userId,
        leadId: resolvedLeadId,
        contactId: resolvedContactId,
        customerName,
        customerEmail: customerEmail || null,
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

    emitCRMEvent('appointment_booked', session.user.id, { entityId: appointment.id, entityType: 'Appointment' });

    const appointmentStart = new Date(appointment.appointmentDate)
    const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration || 30) * 60000)
    const transformed = {
      ...appointment,
      title: appointment.customerName || 'Untitled',
      startTime: appointmentStart.toISOString(),
      endTime: appointmentEnd.toISOString(),
    }
    return NextResponse.json(transformed, { status: 201 })
  } catch (error) {
    console.error('Error creating appointment:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    const details = process.env.NODE_ENV === 'development' ? { message, stack: error instanceof Error ? error.stack : undefined } : undefined
    return apiErrors.internal('Failed to create appointment', details)
  }
}
