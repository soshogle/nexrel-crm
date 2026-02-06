import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { reviewFeedbackService } from '@/lib/review-feedback-service'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const appointment = await prisma.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        lead: true,
        payment: true,
      },
    })

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Transform appointment to include startTime and endTime for calendar compatibility
    const startTime = new Date(appointment.appointmentDate)
    const endTime = new Date(startTime.getTime() + appointment.duration * 60000)
    
    const transformedAppointment = {
      ...appointment,
      title: appointment.customerName || 'Untitled',
      description: appointment.notes,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      location: appointment.meetingLocation,
      meetingType: 'PHONE',
    }

    return NextResponse.json(transformedAppointment)
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json(
      { error: 'Failed to fetch appointment' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      status,
      notes,
      startTime,
      endTime,
      metadata,
    } = body

    // Verify ownership
    const existingAppointment = await prisma.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
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

    const appointment = await prisma.bookingAppointment.update({
      where: { id: params.id },
      data: updateData,
      include: {
        lead: true,
        contact: true,
        payment: true,
      },
    })

    // Trigger feedback collection if appointment was just completed
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
        // Don't fail the appointment update if feedback fails
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
    return NextResponse.json(
      { error: 'Failed to update appointment' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existingAppointment = await prisma.bookingAppointment.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      )
    }

    // Soft delete by updating status to CANCELLED
    const appointment = await prisma.bookingAppointment.update({
      where: { id: params.id },
      data: { 
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledBy: 'business',
      },
    })

    return NextResponse.json({ message: 'Appointment cancelled successfully', appointment })
  } catch (error) {
    console.error('Error cancelling appointment:', error)
    return NextResponse.json(
      { error: 'Failed to cancel appointment' },
      { status: 500 }
    )
  }
}
