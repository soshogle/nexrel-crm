
/**
 * Voice AI Reservation Helper
 * 
 * Provides utilities for Voice AI agents to handle restaurant reservations.
 * These functions are designed to be called by voice agents during phone conversations.
 */

import { prisma } from './db';
import { addDays, format, parse, isValid } from 'date-fns';

export interface VoiceReservationRequest {
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string; // Format: "YYYY-MM-DD" or "tomorrow", "next friday", etc.
  time: string; // Format: "HH:MM" or "7pm", "6:30 PM", etc.
  partySize: number;
  specialRequests?: string;
  occasion?: string;
}

export interface AvailabilityCheck {
  userId: string;
  date: string;
  partySize: number;
}

/**
 * Parse natural language date to YYYY-MM-DD format
 */
export function parseNaturalDate(dateStr: string): string | null {
  const today = new Date();
  const lower = dateStr.toLowerCase().trim();

  // Handle relative dates
  if (lower === 'today') {
    return format(today, 'yyyy-MM-dd');
  }
  if (lower === 'tomorrow') {
    return format(addDays(today, 1), 'yyyy-MM-dd');
  }
  if (lower.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    // Simple implementation - add 7 days and adjust
    // In production, use a more sophisticated date parser
    return format(addDays(today, 7), 'yyyy-MM-dd');
  }

  // Try parsing as YYYY-MM-DD
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }

  // Try parsing MM/DD/YYYY
  if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
    const parsed = parse(dateStr, 'MM/dd/yyyy', new Date());
    if (isValid(parsed)) {
      return format(parsed, 'yyyy-MM-dd');
    }
  }

  return null;
}

/**
 * Parse natural language time to HH:MM format (24-hour)
 */
export function parseNaturalTime(timeStr: string): string | null {
  const lower = timeStr.toLowerCase().trim();

  // Handle formats like "7pm", "6:30 PM", "19:00"
  const patterns = [
    // 7pm, 7 pm
    /^(\d{1,2})\s*(pm|p\.m\.)$/,
    // 7:30pm, 7:30 pm
    /^(\d{1,2}):(\d{2})\s*(pm|p\.m\.)$/,
    // 7am, 7 am
    /^(\d{1,2})\s*(am|a\.m\.)$/,
    // 7:30am, 7:30 am
    /^(\d{1,2}):(\d{2})\s*(am|a\.m\.)$/,
    // 19:00 (24-hour)
    /^(\d{1,2}):(\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] ? parseInt(match[2]) : 0;
      const period = match[3];

      // Convert to 24-hour format
      if (period && period.startsWith('pm') && hour < 12) {
        hour += 12;
      } else if (period && period.startsWith('am') && hour === 12) {
        hour = 0;
      }

      // Validate
      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * Check availability for a given date, time, and party size
 */
export async function checkAvailability(params: AvailabilityCheck): Promise<{
  available: boolean;
  availableSlots?: string[];
  message: string;
}> {
  try {
    // Get restaurant settings
    const settings = await prisma.reservationSettings.findFirst({
      where: { userId: params.userId },
    });

    if (!settings || !settings.acceptReservations) {
      return {
        available: false,
        message: "I'm sorry, we're not accepting reservations at this time. Please contact the restaurant directly.",
      };
    }

    // Get all active tables
    const tables = await prisma.restaurantTable.findMany({
      where: {
        userId: params.userId,
        isActive: true,
        capacity: {
          gte: params.partySize,
        },
      },
      orderBy: {
        capacity: 'asc',
      },
    });

    if (tables.length === 0) {
      return {
        available: false,
        message: `I'm sorry, we don't have tables available for a party of ${params.partySize}. Would you like to try a different party size?`,
      };
    }

    // Get existing reservations for the date
    const existingReservations = await prisma.reservation.findMany({
      where: {
        userId: params.userId,
        reservationDate: new Date(params.date),
        status: {
          in: ['PENDING', 'CONFIRMED', 'SEATED'],
        },
      },
    });

    // Generate available time slots (simplified)
    const slotDuration = settings.slotDuration || 30;
    const bufferTime = settings.bufferBetweenSlots || 15;
    
    // Operating hours (you can expand this to check day-specific hours)
    const openingHour = 11; // 11 AM
    const closingHour = 22; // 10 PM

    const availableSlots: string[] = [];
    
    for (let hour = openingHour; hour < closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Check if this time slot has available tables
        const reservationsAtTime = existingReservations.filter(
          (r) => r.reservationTime === timeSlot
        );
        
        const availableTables = tables.length - reservationsAtTime.length;
        
        if (availableTables > 0) {
          availableSlots.push(timeSlot);
        }
      }
    }

    if (availableSlots.length === 0) {
      return {
        available: false,
        message: `I'm sorry, we're fully booked for ${params.date}. Would you like to try a different date?`,
      };
    }

    return {
      available: true,
      availableSlots: availableSlots.slice(0, 10), // Return first 10 slots
      message: `Great! We have availability on ${params.date}. I can offer you times starting at ${availableSlots[0]}.`,
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return {
      available: false,
      message: "I'm having trouble checking availability right now. Please try again or contact us directly.",
    };
  }
}

/**
 * Create a reservation via voice call
 */
export async function createVoiceReservation(params: VoiceReservationRequest): Promise<{
  success: boolean;
  confirmationCode?: string;
  message: string;
  reservation?: any;
}> {
  try {
    console.log('🎤 [VOICE AI] Creating reservation with params:', JSON.stringify(params, null, 2));
    
    // Parse date and time
    const parsedDate = parseNaturalDate(params.date);
    const parsedTime = parseNaturalTime(params.time);

    console.log('📅 [VOICE AI] Parsed date:', parsedDate);
    console.log('⏰ [VOICE AI] Parsed time:', parsedTime);

    if (!parsedDate) {
      console.error('❌ [VOICE AI] Failed to parse date:', params.date);
      return {
        success: false,
        message: "I'm sorry, I didn't understand the date. Could you please say the date again? For example, 'tomorrow' or 'next Friday'?",
      };
    }

    if (!parsedTime) {
      console.error('❌ [VOICE AI] Failed to parse time:', params.time);
      return {
        success: false,
        message: "I'm sorry, I didn't understand the time. Could you please say the time again? For example, '7 PM' or '6:30 PM'?",
      };
    }

    // Check availability first
    const availability = await checkAvailability({
      userId: params.userId,
      date: parsedDate,
      partySize: params.partySize,
    });

    if (!availability.available) {
      return {
        success: false,
        message: availability.message,
      };
    }

    // Find suitable table
    const table = await prisma.restaurantTable.findFirst({
      where: {
        userId: params.userId,
        isActive: true,
        capacity: {
          gte: params.partySize,
        },
      },
      orderBy: {
        capacity: 'asc',
      },
    });

    // Generate confirmation code
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create reservation
    console.log('💾 [VOICE AI] Creating reservation in database...');
    const reservation = await prisma.reservation.create({
      data: {
        userId: params.userId,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        reservationDate: new Date(parsedDate),
        reservationTime: parsedTime,
        partySize: params.partySize,
        tableId: table?.id,
        status: 'CONFIRMED', // Auto-confirm phone reservations
        confirmationCode,
        specialRequests: params.specialRequests,
        occasion: params.occasion,
        source: 'VOICE_AI',
      },
      include: {
        table: true,
      },
    });

    console.log('✅ [VOICE AI] Reservation created successfully!', {
      id: reservation.id,
      confirmationCode,
      customer: params.customerName,
      date: parsedDate,
      time: parsedTime,
      partySize: params.partySize,
    });

    // Create activity log
    await prisma.reservationActivity.create({
      data: {
        reservationId: reservation.id,
        type: 'CREATED',
        description: `Reservation created via Voice AI call for ${params.customerName}`,
        performedBy: 'system',
      },
    });

    // Create reminder (if enabled)
    const settings = await prisma.reservationSettings.findFirst({
      where: { userId: params.userId },
    });

    if (settings?.sendReminders) {
      const reminderDate = new Date(reservation.reservationDate);
      reminderDate.setHours(reminderDate.getHours() - (settings.reminderHoursBefore || 24));

      await prisma.reservationReminder.create({
        data: {
          reservationId: reservation.id,
          channel: 'SMS',
          scheduledFor: reminderDate,
          status: 'PENDING',
          message: `Reminder: You have a reservation at ${params.customerName} for ${params.partySize} on ${format(new Date(parsedDate), 'MMMM do')} at ${parsedTime}. Confirmation code: ${confirmationCode}`,
        },
      });
    }

    return {
      success: true,
      confirmationCode,
      reservation,
      message: `Perfect! Your reservation is confirmed for ${params.customerName}, party of ${params.partySize}, on ${format(new Date(parsedDate), 'MMMM do')} at ${parsedTime}. Your confirmation code is ${confirmationCode.split('').join(' ')}. We'll send you a text message reminder. Is there anything else I can help you with?`,
    };
  } catch (error) {
    console.error('Error creating voice reservation:', error);
    return {
      success: false,
      message: "I'm sorry, I'm having trouble creating your reservation right now. Please try again or contact us directly.",
    };
  }
}

/**
 * Generate reservation-aware system prompt for Voice AI agents
 */
import { LANGUAGE_PROMPT_SECTION } from './voice-languages';

export function generateReservationSystemPrompt(options: {
  businessName: string;
  businessIndustry?: string;
  knowledgeBase?: string;
}): string {
  return `${LANGUAGE_PROMPT_SECTION}

You are a professional and friendly AI receptionist for ${options.businessName}${options.businessIndustry ? `, a ${options.businessIndustry} business` : ''}. Your primary role is to help customers make restaurant reservations over the phone.

RESERVATION HANDLING INSTRUCTIONS:

1. **Greeting**: Always greet callers warmly and introduce yourself as the AI receptionist for ${options.businessName}.

2. **Information Gathering**: When a customer wants to make a reservation, collect the following information in a natural, conversational way:
   - Date of reservation (e.g., "tomorrow", "next Friday", specific date)
   - Time preference (e.g., "7 PM", "6:30 PM")
   - Party size (number of guests)
   - Customer name
   - Phone number (confirm by repeating back)
   - Email address (optional, but recommended)
   - Special requests or dietary restrictions (ask if they have any)
   - Occasion (birthday, anniversary, business meeting, etc. - ask if it's a special occasion)

3. **Date and Time Parsing**: Accept natural language:
   - Dates: "today", "tomorrow", "next Friday", "December 25th", "12/25/2025"
   - Times: "7pm", "7 PM", "6:30 PM", "19:00", "seven thirty"

4. **Availability Confirmation**: After collecting date, time, and party size, confirm availability by saying:
   "Let me check our availability for [date] at [time] for [party size] guests."
   
5. **Reservation Confirmation**: Once booked, provide:
   - Confirmation that the reservation is made
   - Repeat back: date, time, party size, name
   - Provide the confirmation code (spell it out clearly: "Your confirmation code is A-B-C-1-2-3")
   - Mention that they'll receive a text message reminder
   - Ask if they have any questions or special requests

6. **Alternative Suggestions**: If requested time is unavailable, suggest:
   - "I'm sorry, we're fully booked at that time. Would you like to try [alternative time 1] or [alternative time 2]?"
   - Or ask: "Would you prefer a different date?"

7. **Handling Questions**: Answer common questions about:
   - Restaurant hours
   - Dress code
   - Parking availability
   - Menu items (if provided in knowledge base)
   - Group reservations
   - Cancellation policy

8. **Professional Tone**:
   - Always be polite, patient, and professional
   - Never interrupt the customer
   - Repeat back important information to confirm accuracy
   - If you don't understand something, politely ask for clarification
   - Handle complaints or concerns with empathy

9. **Ending the Call**:
   - Thank the customer for calling
   - Confirm their reservation one more time
   - Wish them a great day or evening

10. **What NOT to Do**:
   - Never make up information about the restaurant
   - Don't promise things you're not certain about
   - Don't handle payment information over the phone (reservations should be free)
   - Don't share other customers' information

${options.knowledgeBase ? `\n\nRESTAURANT INFORMATION:\n${options.knowledgeBase}` : ''}

Remember: You are representing ${options.businessName}. Be warm, professional, and helpful. Your goal is to make the reservation process smooth and pleasant for the customer while accurately collecting all necessary information.`;
}
