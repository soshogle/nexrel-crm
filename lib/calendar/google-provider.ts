
/**
 * Google Calendar Provider Implementation
 */

import { google } from 'googleapis';
import {
  ICalendarProvider,
  CalendarEvent,
  CalendarEventResult,
  CalendarCredentials,
} from './types';

export class GoogleCalendarProvider implements ICalendarProvider {
  private calendar: any;
  private calendarId: string;

  constructor(credentials: CalendarCredentials) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    if (credentials.accessToken) {
      auth.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
    }

    this.calendar = google.calendar({ version: 'v3', auth });
    this.calendarId = credentials.calendarId || 'primary';
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEventResult> {
    try {
      const googleEvent = {
        summary: event.summary,
        description: event.description || '',
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        attendees: event.attendees?.map(a => ({
          email: a.email,
          displayName: a.name,
        })) || [],
        location: event.location || '',
        reminders: {
          useDefault: false,
          overrides: event.reminders?.map(r => ({
            method: r.method,
            minutes: r.minutesBefore,
          })) || [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 60 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: this.calendarId,
        resource: googleEvent,
        sendUpdates: 'all',
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
      };
    } catch (error: any) {
      console.error('Google Calendar create error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateEvent(
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEventResult> {
    try {
      const updateData: any = {};

      if (event.summary) updateData.summary = event.summary;
      if (event.description) updateData.description = event.description;
      if (event.location) updateData.location = event.location;
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: 'America/New_York',
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: 'America/New_York',
        };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map(a => ({
          email: a.email,
          displayName: a.name,
        }));
      }

      const response = await this.calendar.events.patch({
        calendarId: this.calendarId,
        eventId: eventId,
        resource: updateData,
        sendUpdates: 'all',
      });

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
      };
    } catch (error: any) {
      console.error('Google Calendar update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.calendar.events.delete({
        calendarId: this.calendarId,
        eventId: eventId,
        sendUpdates: 'all',
      });

      return { success: true };
    } catch (error: any) {
      console.error('Google Calendar delete error:', error);
      return { success: false, error: error.message };
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId: this.calendarId,
        eventId: eventId,
      });

      const event = response.data;
      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        startTime: new Date(event.start.dateTime || event.start.date),
        endTime: new Date(event.end.dateTime || event.end.date),
        attendees: event.attendees?.map((a: any) => ({
          email: a.email,
          name: a.displayName,
          responseStatus: a.responseStatus,
        })) || [],
        location: event.location,
      };
    } catch (error) {
      console.error('Google Calendar get event error:', error);
      return null;
    }
  }

  async checkAvailability(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: this.calendarId }],
        },
      });

      const busy = response.data.calendars[this.calendarId]?.busy || [];
      return busy.length === 0;
    } catch (error) {
      console.error('Google Calendar availability check error:', error);
      return false;
    }
  }

  async getAvailableSlots(params: {
    date: Date;
    workingHours: { start: number; end: number };
    slotDuration: number;
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
          items: [{ id: this.calendarId }],
        },
      });

      const busySlots = response.data.calendars[this.calendarId]?.busy || [];
      const availableSlots: Date[] = [];

      let currentSlot = new Date(startOfDay);
      while (currentSlot < endOfDay) {
        const slotEnd = new Date(currentSlot.getTime() + params.slotDuration * 60000);

        const isAvailable = !busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start);
          const busyEnd = new Date(busy.end);
          return currentSlot < busyEnd && slotEnd > busyStart;
        });

        if (isAvailable && slotEnd <= endOfDay) {
          availableSlots.push(new Date(currentSlot));
        }

        currentSlot = slotEnd;
      }

      return availableSlots;
    } catch (error) {
      console.error('Google Calendar get available slots error:', error);
      return [];
    }
  }

  async syncEvents(lastSyncTime?: Date): Promise<{
    success: boolean;
    syncedCount?: number;
    error?: string;
  }> {
    try {
      const params: any = {
        calendarId: this.calendarId,
        maxResults: 250,
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (lastSyncTime) {
        params.timeMin = lastSyncTime.toISOString();
      } else {
        // Default to last 30 days if no last sync time
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        params.timeMin = thirtyDaysAgo.toISOString();
      }

      const response = await this.calendar.events.list(params);
      const events = response.data.items || [];

      return {
        success: true,
        syncedCount: events.length,
      };
    } catch (error: any) {
      console.error('Google Calendar sync error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
