import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { addMinutes, parse, isAfter, isBefore, format } from 'date-fns';
import { emailService } from '@/lib/email-service';
import { CalendarService } from '@/lib/calendar/calendar-service';
import { getEmailTemplates, replaceEmailPlaceholders, formatDateForLocale } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/booking/[userId]/book
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerEmail,
      customerPhone,
      date,
      time,
      meetingType,
      notes,
      timezone,
    } = body;

    // Validation
    if (!customerName || !customerEmail || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get user's booking settings
    const settings = await prisma.bookingSettings.findUnique({
      where: { userId: params.userId },
    });

    if (!settings) {
      return NextResponse.json(
        { error: 'Booking settings not found' },
        { status: 404 }
      );
    }

    // Parse appointment date/time
    const requestedDate = new Date(date);
    const appointmentDateTime = parse(time, 'HH:mm', requestedDate);
    const slotDuration = settings.slotDuration || 30;

    // Check if slot is still available
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

    // Check for conflicts
    const slotEnd = addMinutes(appointmentDateTime, slotDuration);
    const hasConflict = existingAppointments.some((apt) => {
      const aptStart = new Date(apt.appointmentDate);
      const aptEnd = addMinutes(aptStart, apt.duration);
      return (
        (isAfter(appointmentDateTime, aptStart) && isBefore(appointmentDateTime, aptEnd)) ||
        (isAfter(slotEnd, aptStart) && isBefore(slotEnd, aptEnd)) ||
        (isBefore(appointmentDateTime, aptStart) && isAfter(slotEnd, aptEnd))
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      );
    }

    // Determine initial status based on settings
    const status = settings.requireApproval ? 'SCHEDULED' : 'CONFIRMED';

    // Get user details for email
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        name: true,
        email: true,
        businessCategory: true,
        language: true,
      },
    });

    // Get active calendar connection for this user
    const calendarConnection = await prisma.calendarConnection.findFirst({
      where: {
        userId: params.userId,
        syncEnabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create appointment with calendar connection if available
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId: params.userId,
        customerName,
        customerEmail,
        customerPhone: customerPhone || '',
        appointmentDate: appointmentDateTime,
        duration: slotDuration,
        status,
        notes: notes || null,
        customerTimezone: timezone || 'UTC',
        meetingLocation: meetingType || 'PHONE',
        calendarConnectionId: calendarConnection?.id || null,
        syncStatus: calendarConnection ? 'PENDING' : undefined,
      },
    });

    // Sync to calendar if connection exists
    if (calendarConnection) {
      console.log('📅 Syncing appointment to calendar:', appointment.id);
      CalendarService.syncAppointmentToCalendar(appointment.id)
        .then((result) => {
          if (result.success) {
            console.log('✅ Appointment synced to calendar successfully');
          } else {
            console.error('❌ Failed to sync to calendar:', result.error);
          }
        })
        .catch((error) => {
          console.error('❌ Calendar sync error:', error);
        });
    } else {
      console.log('ℹ️  No calendar connection found, skipping calendar sync');
    }

    // Send confirmation email to customer via Gmail OAuth
    const businessName = user?.name || 'Our Business';
    const appointmentTime = format(appointmentDateTime, 'h:mm a');
    const confirmationCode = appointment.id.slice(0, 8).toUpperCase();

    console.log('📧 Sending confirmation email to customer:', customerEmail);
    emailService.sendAppointmentConfirmation({
      recipientEmail: customerEmail,
      customerName,
      appointmentDate: appointmentDateTime,
      appointmentTime,
      businessName,
      confirmationCode,
      userId: params.userId, // Use Gmail OAuth for sending
    })
      .then((sent) => {
        if (sent) {
          console.log('✅ Confirmation email sent successfully to customer');
        } else {
          console.error('❌ Failed to send confirmation email to customer');
        }
      })
      .catch((error) => {
        console.error('❌ Email error:', error);
      });

    // Send notification email to business owner if email available
    if (user?.email) {
      console.log('📧 Sending notification email to business owner:', user.email);
      
      // Get user's language preference
      const userLanguage = (user.language && ['en', 'fr', 'es', 'zh'].includes(user.language)) 
        ? (user.language as 'en' | 'fr' | 'es' | 'zh')
        : 'en';
      
      const templates = getEmailTemplates(userLanguage);
      const emailTemplates = templates.bookingNotification;
      
      const formattedDate = formatDateForLocale(appointmentDateTime, userLanguage);
      const actionMessage = settings.requireApproval 
        ? emailTemplates.actionPendingApproval 
        : emailTemplates.actionConfirmed;
      const statusText = settings.requireApproval 
        ? emailTemplates.statusPending 
        : emailTemplates.statusConfirmed;

      const ownerSubject = replaceEmailPlaceholders(emailTemplates.subject, {
        customerName,
        date: format(appointmentDateTime, 'MMM dd, yyyy'),
        time: appointmentTime,
      });
      
      const ownerHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              text-align: center;
              margin-bottom: 30px;
            }
            .booking-details {
              background: #f7f7f7;
              border-left: 4px solid #667eea;
              padding: 20px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .detail-row {
              margin: 10px 0;
            }
            .label {
              font-weight: bold;
              color: #555;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${emailTemplates.headerTitle}</h1>
            <p>${emailTemplates.headerSubtitle}</p>
          </div>

          <div class="booking-details">
            <div class="detail-row">
              <span class="label">${emailTemplates.customerLabel}</span> ${customerName}
            </div>
            <div class="detail-row">
              <span class="label">${emailTemplates.emailLabel}</span> ${customerEmail}
            </div>
            ${customerPhone ? `
            <div class="detail-row">
              <span class="label">${emailTemplates.phoneLabel}</span> ${customerPhone}
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="label">${emailTemplates.dateLabel}</span> ${formattedDate}
            </div>
            <div class="detail-row">
              <span class="label">${emailTemplates.timeLabel}</span> ${appointmentTime}
            </div>
            <div class="detail-row">
              <span class="label">${emailTemplates.durationLabel}</span> ${slotDuration} minutes
            </div>
            ${notes ? `
            <div class="detail-row">
              <span class="label">${emailTemplates.notesLabel}</span> ${notes}
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="label">${emailTemplates.confirmationCodeLabel}</span> ${confirmationCode}
            </div>
            <div class="detail-row">
              <span class="label">${emailTemplates.statusLabel}</span> ${statusText}
            </div>
          </div>

          <p>${replaceEmailPlaceholders(emailTemplates.actionRequired, { message: actionMessage })}</p>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 12px; text-align: center;">
            <p>${emailTemplates.footerPoweredBy}</p>
          </div>
        </body>
        </html>
      `;

      emailService.sendEmail({
        to: user.email,
        subject: ownerSubject,
        html: ownerHtml,
        userId: params.userId, // Use Gmail OAuth for business owner
      })
        .then((sent) => {
          if (sent) {
            console.log('✅ Notification email sent successfully to business owner');
          } else {
            console.error('❌ Failed to send notification email to business owner');
          }
        })
        .catch((error) => {
          console.error('❌ Owner email error:', error);
        });
    }

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        appointmentDate: appointment.appointmentDate,
        duration: appointment.duration,
        status: appointment.status,
        calendarSynced: !!calendarConnection,
      },
      message:
        settings.requireApproval
          ? 'Your appointment request has been received and is pending approval. You will receive a confirmation email shortly.'
          : 'Your appointment has been confirmed! You will receive a confirmation email shortly.',
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create booking' },
      { status: 500 }
    );
  }
}
