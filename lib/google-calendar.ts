
/**
 * Google Calendar Integration for Appointment Booking
 */

import { google } from 'googleapis';

export class GoogleCalendarService {
  private calendar: any;

  constructor(credentials?: { accessToken: string; refreshToken: string }) {
    if (!credentials) {
      // Use service account or OAuth2 credentials
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      this.calendar = google.calendar({ version: 'v3', auth });
    } else {
      // Use user-specific credentials
      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      this.calendar = google.calendar({ version: 'v3', auth });
    }
  }

  /**
   * Book an appointment in Google Calendar
   */
  async bookAppointment(params: {
    calendarId: string;
    summary: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    attendeeEmail?: string;
    attendeeName?: string;
    attendeePhone?: string;
  }) {
    try {
      const event = {
        summary: params.summary,
        description: params.description || '',
        start: {
          dateTime: params.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: params.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: params.attendeeEmail
          ? [{ email: params.attendeeEmail, displayName: params.attendeeName }]
          : [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: params.calendarId,
        resource: event,
        sendUpdates: 'all',
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
      };
    } catch (error: any) {
      console.error('Google Calendar booking error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check availability for a given time slot
   */
  async checkAvailability(params: {
    calendarId: string;
    startTime: Date;
    endTime: Date;
  }): Promise<boolean> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: params.startTime.toISOString(),
          timeMax: params.endTime.toISOString(),
          items: [{ id: params.calendarId }],
        },
      });

      const busy = response.data.calendars[params.calendarId]?.busy || [];
      return busy.length === 0; // Available if no busy times
    } catch (error) {
      console.error('Calendar availability check error:', error);
      return false;
    }
  }

  /**
   * Get available time slots for a specific date
   */
  async getAvailableSlots(params: {
    calendarId: string;
    date: Date;
    workingHours: { start: number; end: number }; // e.g., { start: 9, end: 17 } for 9am-5pm
    slotDuration: number; // in minutes
  }): Promise<Date[]> {
    const startOfDay = new Date(params.date);
    startOfDay.setHours(params.workingHours.start, 0, 0, 0);

    const endOfDay = new Date(params.date);
    endOfDay.setHours(params.workingHours.end, 0, 0, 0);

    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          items: [{ id: params.calendarId }],
        },
      });

      const busySlots = response.data.calendars[params.calendarId]?.busy || [];
      const availableSlots: Date[] = [];

      let currentSlot = new Date(startOfDay);
      while (currentSlot < endOfDay) {
        const slotEnd = new Date(currentSlot.getTime() + params.slotDuration * 60000);

        // Check if this slot overlaps with any busy time
        const isAvailable = !busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return currentSlot < busyEnd && slotEnd > busyStart;
        });

        if (isAvailable) {
          availableSlots.push(new Date(currentSlot));
        }

        currentSlot = slotEnd;
      }

      return availableSlots;
    } catch (error) {
      console.error('Get available slots error:', error);
      return [];
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(calendarId: string, eventId: string) {
    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Cancel appointment error:', error);
      return { success: false, error: error.message };
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();
