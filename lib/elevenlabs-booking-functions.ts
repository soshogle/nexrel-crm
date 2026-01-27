/**
 * ElevenLabs Custom Functions for Appointment Booking
 * These functions are called by the AI agent during phone conversations
 */

import { prisma } from '@/lib/db';
import { emailService } from '@/lib/email-service';
import { addDays, addMinutes, parse, format, isValid } from 'date-fns';

interface BookingContext {
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}

/**
 * Check availability for a specific date and time
 */
export async function checkAvailability(params: {
  userId: string;
  date: string; // Format: YYYY-MM-DD
  time?: string; // Format: HH:mm (optional)
}): Promise<{
  available: boolean;
  availableSlots?: string[];
  message: string;
}> {
  try {
    const { userId, date, time } = params;

    // Parse the requested date
    const requestedDate = new Date(date);
    if (!isValid(requestedDate)) {
      return {
        available: false,
        message: "I couldn't understand that date. Could you try again with a format like 'December 15th' or 'tomorrow'?"
      };
    }

    // Get user's booking settings
    const settings = await prisma.bookingSettings.findUnique({
      where: { userId }
    });

    if (!settings) {
      return {
        available: false,
        message: "I apologize, but the booking system is not configured yet. Please call back later."
      };
    }

    // Check if the date is within allowed advance booking window
    const maxAdvanceDate = addDays(new Date(), settings.advanceBookingDays);
    if (requestedDate > maxAdvanceDate) {
      return {
        available: false,
        message: `I can only book appointments up to ${settings.advanceBookingDays} days in advance. Could you choose an earlier date?`
      };
    }

    // Check if date respects minimum notice hours
    const now = new Date();
    const minNoticeTime = addMinutes(now, settings.minNoticeHours * 60);
    if (requestedDate < minNoticeTime) {
      return {
        available: false,
        message: `I need at least ${settings.minNoticeHours} hours notice for bookings. Could you choose a later time?`
      };
    }

    // Get the day of week schedule
    const dayOfWeek = requestedDate.getDay();
    const schedule = settings.availabilitySchedule as any;
    const daySchedule = schedule?.[dayOfWeek];

    if (!daySchedule || !daySchedule.enabled) {
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
      return {
        available: false,
        message: `I'm sorry, but we're not available on ${dayName}s. Could you choose another day?`
      };
    }

    // Get existing appointments for this date
    const startOfDay = new Date(requestedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(requestedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.bookingAppointment.findMany({
      where: {
        userId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      },
      select: {
        appointmentDate: true,
        duration: true
      }
    });

    // Generate available time slots
    const availableSlots: string[] = [];
    const startTime = parse(daySchedule.startTime, 'HH:mm', requestedDate);
    const endTime = parse(daySchedule.endTime, 'HH:mm', requestedDate);
    const slotDuration = settings.slotDuration;
    const bufferTime = settings.bufferTime;

    let currentSlot = startTime;
    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, slotDuration);
      
      // Check if this slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(apt => {
        const aptStart = new Date(apt.appointmentDate);
        const aptEnd = addMinutes(aptStart, apt.duration || slotDuration);
        const slotStartWithBuffer = addMinutes(currentSlot, -bufferTime);
        const slotEndWithBuffer = addMinutes(slotEnd, bufferTime);
        
        return (
          (aptStart >= slotStartWithBuffer && aptStart < slotEndWithBuffer) ||
          (aptEnd > slotStartWithBuffer && aptEnd <= slotEndWithBuffer) ||
          (aptStart <= slotStartWithBuffer && aptEnd >= slotEndWithBuffer)
        );
      });

      // Check if slot is in the future (respects minimum notice)
      const slotDateTime = new Date(requestedDate);
      slotDateTime.setHours(currentSlot.getHours(), currentSlot.getMinutes(), 0, 0);
      
      if (!hasConflict && slotDateTime >= minNoticeTime) {
        availableSlots.push(format(currentSlot, 'h:mm a'));
      }

      currentSlot = addMinutes(currentSlot, slotDuration + bufferTime);
    }

    if (time) {
      // Check specific time slot
      const requestedTime = parse(time, 'HH:mm', requestedDate);
      const formattedTime = format(requestedTime, 'h:mm a');
      const isAvailable = availableSlots.includes(formattedTime);

      return {
        available: isAvailable,
        availableSlots: isAvailable ? [formattedTime] : availableSlots.slice(0, 3),
        message: isAvailable 
          ? `Great! ${formattedTime} on ${format(requestedDate, 'MMMM do')} is available.`
          : `I'm sorry, ${formattedTime} is not available. Here are some alternative times: ${availableSlots.slice(0, 3).join(', ')}`
      };
    }

    // Return all available slots for the day
    if (availableSlots.length === 0) {
      return {
        available: false,
        message: `Unfortunately, ${format(requestedDate, 'MMMM do')} is fully booked. Would you like to try a different date?`
      };
    }

    return {
      available: true,
      availableSlots: availableSlots.slice(0, 5),
      message: `Yes, we have availability on ${format(requestedDate, 'MMMM do')}. Here are some available times: ${availableSlots.slice(0, 5).join(', ')}`
    };

  } catch (error) {
    console.error('❌ Error checking availability:', error);
    return {
      available: false,
      message: "I'm having trouble checking availability right now. Could you please try again?"
    };
  }
}

/**
 * Create an appointment booking
 */
export async function createBooking(params: BookingContext & {
  date: string;
  time: string;
  meetingType?: 'PHONE_CALL' | 'VIDEO_CALL' | 'IN_PERSON';
  notes?: string;
}): Promise<{
  success: boolean;
  confirmationCode?: string;
  message: string;
}> {
  try {
    const { userId, customerName, customerPhone, customerEmail, date, time, meetingType = 'PHONE_CALL', notes } = params;

    // Parse date and time
    const appointmentDate = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    appointmentDate.setHours(hours, minutes, 0, 0);

    if (!isValid(appointmentDate)) {
      return {
        success: false,
        message: "I couldn't process that date and time. Could you try again?"
      };
    }

    // Double-check availability
    const availability = await checkAvailability({
      userId,
      date: format(appointmentDate, 'yyyy-MM-dd'),
      time: format(appointmentDate, 'HH:mm')
    });

    if (!availability.available) {
      return {
        success: false,
        message: availability.message
      };
    }

    // Get booking settings for duration
    const settings = await prisma.bookingSettings.findUnique({
      where: { userId }
    });

    // Generate confirmation code
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create the appointment
    const appointment = await prisma.bookingAppointment.create({
      data: {
        userId,
        customerName,
        customerEmail: customerEmail || undefined,
        customerPhone,
        appointmentDate,
        duration: settings?.slotDuration || 30,
        status: settings?.requireApproval ? 'SCHEDULED' : 'CONFIRMED',
        meetingType: meetingType || 'PHONE_CALL',
        notes: notes || 'Booked via Voice AI',
        confirmationCode,
        meetingLocation: meetingType === 'PHONE_CALL' ? customerPhone : undefined
      }
    });

    // Get user details for notifications
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, businessCategory: true }
    });
    
    const businessName = user?.name || 'Your Business';
    const formattedDate = format(appointmentDate, 'EEEE, MMMM do');
    const formattedTime = format(appointmentDate, 'h:mm a');

    // Send SMS confirmation
    try {
      // Import Twilio dynamically to avoid circular dependencies
      const twilio = require('twilio');
      let accountSid = process.env.TWILIO_ACCOUNT_SID;
      let authToken = process.env.TWILIO_AUTH_TOKEN;
      let fromNumber = process.env.TWILIO_PHONE_NUMBER;

      // Fallback to auth_secrets.json if env vars not available
      if (!accountSid || !authToken || !fromNumber) {
        try {
          const fs = require('fs');
          const path = require('path');
          const authSecretsPath = path.join(process.env.HOME || '/home/ubuntu', '.config', 'abacusai_auth_secrets.json');
          
          if (fs.existsSync(authSecretsPath)) {
            const authSecrets = JSON.parse(fs.readFileSync(authSecretsPath, 'utf8'));
            const twilioSecrets = authSecrets?.twilio?.secrets;
            
            if (twilioSecrets) {
              accountSid = accountSid || twilioSecrets.account_sid?.value;
              authToken = authToken || twilioSecrets.auth_token?.value;
              fromNumber = fromNumber || twilioSecrets.phone_number?.value;
            }
          }
        } catch (secretsError) {
          console.warn('⚠️ Could not read Twilio secrets from auth_secrets.json:', secretsError);
        }
      }

      if (accountSid && authToken && fromNumber) {
        const client = twilio(accountSid, authToken);
        
        const smsMessage = `Your appointment is confirmed! 📅

Date: ${formattedDate}
Time: ${formattedTime}
Confirmation code: ${confirmationCode}

Thank you for choosing ${businessName}!`;

        await client.messages.create({
          body: smsMessage,
          from: fromNumber,
          to: customerPhone
        });
        
        console.log(`✅ SMS confirmation sent to ${customerPhone}`);
      } else {
        console.warn('⚠️ Twilio credentials not configured. Skipping SMS confirmation.');
      }
    } catch (smsError) {
      console.error('❌ Error sending SMS confirmation:', smsError);
      // Don't fail the booking if SMS fails
    }

    // Send confirmation email if email provided
    if (customerEmail) {
      try {
        await emailService.sendAppointmentConfirmation({
          recipientEmail: customerEmail,
          customerName,
          appointmentDate,
          appointmentTime: formattedTime,
          businessName,
          confirmationCode
        });
      } catch (emailError) {
        console.error('❌ Error sending email confirmation:', emailError);
        // Don't fail the booking if email fails
      }
    }

    const statusMessage = settings?.requireApproval 
      ? 'Your booking request has been received and is pending approval.'
      : 'Your appointment is confirmed!';

    return {
      success: true,
      confirmationCode,
      message: `Perfect! ${statusMessage} Your appointment is scheduled for ${formattedDate} at ${formattedTime}. Your confirmation code is ${confirmationCode}. You'll receive an SMS confirmation shortly. ${customerEmail ? "I've also sent you a confirmation email." : ""}`
    };

  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return {
      success: false,
      message: "I'm having trouble creating your booking right now. Please try again or contact us directly."
    };
  }
}

/**
 * Cancel or modify an existing booking
 */
export async function modifyBooking(params: {
  userId: string;
  confirmationCode: string;
  action: 'cancel' | 'reschedule';
  newDate?: string;
  newTime?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { userId, confirmationCode, action, newDate, newTime } = params;

    // Find the appointment
    const appointments = await prisma.bookingAppointment.findMany({
      where: {
        userId,
        status: {
          in: ['SCHEDULED', 'CONFIRMED']
        }
      }
    });
    
    const appointment = appointments.find(apt => apt.confirmationCode === confirmationCode.toUpperCase());

    if (!appointment) {
      return {
        success: false,
        message: `I couldn't find an appointment with confirmation code ${confirmationCode}. Could you check the code and try again?`
      };
    }

    if (action === 'cancel') {
      await prisma.bookingAppointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELLED',
          notes: `${appointment.notes || ''} | Cancelled via Voice AI`
        }
      });

      return {
        success: true,
        message: `Your appointment on ${format(new Date(appointment.appointmentDate), 'MMMM do')} has been cancelled. Is there anything else I can help you with?`
      };
    }

    if (action === 'reschedule' && newDate && newTime) {
      // Check new time availability
      const availability = await checkAvailability({
        userId,
        date: newDate,
        time: newTime
      });

      if (!availability.available) {
        return {
          success: false,
          message: availability.message
        };
      }

      const newAppointmentDate = new Date(newDate);
      const [hours, minutes] = newTime.split(':').map(Number);
      newAppointmentDate.setHours(hours, minutes, 0, 0);

      await prisma.bookingAppointment.update({
        where: { id: appointment.id },
        data: {
          appointmentDate: newAppointmentDate,
          notes: `${appointment.notes || ''} | Rescheduled via Voice AI`
        }
      });

      return {
        success: true,
        message: `Perfect! Your appointment has been rescheduled to ${format(newAppointmentDate, 'EEEE, MMMM do')} at ${format(newAppointmentDate, 'h:mm a')}.`
      };
    }

    return {
      success: false,
      message: "I need more information to reschedule your appointment. What date and time would you prefer?"
    };

  } catch (error) {
    console.error('❌ Error modifying booking:', error);
    return {
      success: false,
      message: "I'm having trouble with that request. Please try again or contact us directly."
    };
  }
}
