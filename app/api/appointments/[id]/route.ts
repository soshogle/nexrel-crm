import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCrmDb } from '@/lib/dal'
import { getDalContextFromSession } from '@/lib/context/industry-context'
import { reviewFeedbackService } from '@/lib/review-feedback-service'
import { processServiceCompletedTriggers } from '@/lib/service-completed-triggers'
import { processOrthodontistWorkflowEnrollment } from '@/lib/orthodontist/workflow-enrollment-triggers'
import { emitCRMEvent } from '@/lib/crm-event-emitter'
import { apiErrors } from '@/lib/api-error';

// GET /api/appointments/[id] - Get appointment details

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()
    const db = getCrmDb(ctx)
    const appointment = await db.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        lead: true,
        payment: true,
      },
    })

    if (!appointment) {
      return apiErrors.notFound('Appointment not found')
    }

    // Transform appointment to include startTime and endTime for calendar compatibility
    const startTime = new Date(appointment.appointmentDate)
    const endTime = new Date(startTime.getTime() + appointment.duration * 60000)
    
    const transformedAppointment = {
      ...appointment,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: appointment.meetingLocation,
      meetingType: 'PHONE',
    }

    return NextResponse.json(transformedAppointment)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return apiErrors.internal('Failed to fetch appointment')
  }
}

// PATCH /api/appointments/[id] - Update appointment
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()
    const db = getCrmDb(ctx)

    const body = await request.json()
    const {
      status,
      notes,
      startTime,
      endTime,
      metadata,
    } = body

    // Verify ownership
    const existingAppointment = await db.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    })

    if (!existingAppointment) {
      return apiErrors.notFound('Appointment not found')
    }

    // Build update data
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (metadata !== undefined) {
      // Merge with existing metadata
      const existingMetadata = existingAppointment.customerResponses
      if (existingMetadata && typeof existingMetadata === 'object' && !Array.isArray(existingMetadata)) {
        updateData.customerResponses = { ...existingMetadata, ...metadata }
      } else {
        updateData.customerResponses = metadata
      }
    }
    
    // Handle date/time updates - convert to appointmentDate and duration
    if (startTime !== undefined && endTime !== undefined) {
      const start = new Date(startTime)
      const end = new Date(endTime)
      
      // Set appointmentDate to the start time
      updateData.appointmentDate = start
      
      // Calculate duration in minutes
      const durationMs = end.getTime() - start.getTime()
      updateData.duration = Math.round(durationMs / 60000) // Convert ms to minutes
      
      console.log('📅 Updating appointment:', {
        id: params.id,
        appointmentDate: updateData.appointmentDate,
        duration: updateData.duration,
        originalStartTime: startTime,
        originalEndTime: endTime,
      })
    }

    const appointment = await db.bookingAppointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        lead: true,
        contact: true,
        payment: true,
      },
    })

    if (status === 'CANCELLED' && existingAppointment.status !== 'CANCELLED') {
      emitCRMEvent('appointment_cancelled', session.user.id, { entityId: params.id, entityType: 'Appointment' });
    }

    // Orthodontist: APPOINTMENT_CONFIRMED triggers Patient Admissions workflow (Law 25 & Consents)
    if (status === 'CONFIRMED' && existingAppointment.status !== 'CONFIRMED' && appointment.leadId) {
      try {
        await processOrthodontistWorkflowEnrollment(session.user.id, appointment.leadId, 'APPOINTMENT_CONFIRMED', {
          appointmentId: appointment.id,
        });
      } catch (triggerError) {
        console.error('Orthodontist appointment-confirmed trigger failed:', triggerError);
      }
    }

    // Trigger feedback collection and workflow/campaign enrollment if appointment was just completed
    if (status === 'COMPLETED' && existingAppointment.status !== 'COMPLETED' && appointment.leadId) {
      try {
        await reviewFeedbackService.triggerFeedbackCollection({
          leadId: appointment.leadId,
          userId: session.user.id,
          appointmentId: appointment.id,
          preferredMethod: 'BOTH', // Try both SMS and voice call
        });
      } catch (feedbackError) {
        console.error('Error triggering feedback collection:', feedbackError);
      }
      try {
        await processServiceCompletedTriggers(session.user.id, appointment.leadId, {
          appointmentId: appointment.id,
          serviceType: 'appointment',
        });
      } catch (triggerError) {
        console.error('Error processing service-completed triggers:', triggerError);
      }
    }

    // Transform the response to include startTime and endTime for calendar compatibility
    const responseStartTime = new Date(appointment.appointmentDate)
    const responseEndTime = new Date(responseStartTime.getTime() + appointment.duration * 60000)
    
    const transformedAppointment = {
      ...appointment,
      title: appointment.customerName || 'Untitled',
      description: appointment.notes,
      startTime: responseStartTime.toISOString(),
      endTime: responseEndTime.toISOString(),
      location: appointment.meetingLocation,
      meetingType: 'PHONE',
    }

    return NextResponse.json(transformedAppointment)
  } catch (error) {
    console.error('Error updating appointment:', error)
    return apiErrors.internal('Failed to update appointment')
  }
}

// DELETE /api/appointments/[id] - Delete/cancel appointment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return apiErrors.unauthorized()
    }

    const ctx = getDalContextFromSession(session)
    if (!ctx) return apiErrors.unauthorized()
    const db = getCrmDb(ctx)

    // Verify ownership
    const existingAppointment = await db.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
    })

    if (!existingAppointment) {
      return apiErrors.notFound('Appointment not found')
    }

    // Soft delete by updating status to CANCELLED
    const appointment = await db.bookingAppointment.update({
      where: { id: params.id },
      data: { 
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'business',
      },
    })

    emitCRMEvent('appointment_cancelled', session.user.id, { entityId: params.id, entityType: 'Appointment' });

    return NextResponse.json({ message: 'Appointment cancelled successfully', appointment })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return apiErrors.internal('Failed to cancel appointment')
  }
}
