
/**
 * Microsoft Calendar Provider (Outlook/Office365)
 * Supports both Outlook.com and Office 365 calendars
 */

import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import {
  ICalendarProvider,
  CalendarEvent,
  CalendarEventResult,
  CalendarCredentials,
} from './types';

export class MicrosoftCalendarProvider implements ICalendarProvider {
  private client: Client;
  private calendarId: string;

  constructor(credentials: CalendarCredentials) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, credentials.accessToken || '');
      },
    });

    this.calendarId = credentials.calendarId || 'calendar';
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEventResult> {
    try {
      const microsoftEvent = {
        subject: event.summary,
        body: {
          contentType: 'HTML',
          content: event.description || '',
        },
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: 'Eastern Standard Time',
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: 'Eastern Standard Time',
        },
        location: event.location ? {
          displayName: event.location,
        } : undefined,
        attendees: event.attendees?.map(a => ({
          emailAddress: {
            address: a.email,
            name: a.name,
          },
          type: 'required',
        })) || [],
        isReminderOn: event.reminders && event.reminders.length > 0,
        reminderMinutesBeforeStart: event.reminders?.[0]?.minutesBefore || 15,
      };

      const response = await this.client
        .api(`/me/calendars/${this.calendarId}/events`)
        .post(microsoftEvent);

      return {
        success: true,
        eventId: response.id,
        eventLink: response.webLink,
      };
    } catch (error: any) {
      console.error('Microsoft Calendar create error:', error);
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

      if (event.summary) updateData.subject = event.summary;
      if (event.description) {
        updateData.body = {
          contentType: 'HTML',
          content: event.description,
        };
      }
      if (event.location) {
        updateData.location = { displayName: event.location };
      }
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: 'Eastern Standard Time',
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: 'Eastern Standard Time',
        };
      }
      if (event.attendees) {
        updateData.attendees = event.attendees.map(a => ({
          emailAddress: {
            address: a.email,
            name: a.name,
          },
          type: 'required',
        }));
      }

      const response = await this.client
        .api(`/me/events/${eventId}`)
        .patch(updateData);

      return {
        success: true,
        eventId: response.id,
        eventLink: response.webLink,
      };
    } catch (error: any) {
      console.error('Microsoft Calendar update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.api(`/me/events/${eventId}`).delete();
      return { success: true };
    } catch (error: any) {
      console.error('Microsoft Calendar delete error:', error);
      return { success: false, error: error.message };
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.client.api(`/me/events/${eventId}`).get();

      return {
        id: response.id,
        summary: response.subject,
        description: response.body?.content,
        startTime: new Date(response.start.dateTime),
        endTime: new Date(response.end.dateTime),
        attendees: response.attendees?.map((a: any) => ({
          email: a.emailAddress.address,
          name: a.emailAddress.name,
          responseStatus: a.status?.response,
        })) || [],
        location: response.location?.displayName,
      };
    } catch (error) {
      console.error('Microsoft Calendar get event error:', error);
      return null;
    }
  }

  async checkAvailability(startTime: Date, endTime: Date): Promise<boolean> {
    try {
      const response = await this.client
        .api('/me/calendar/getSchedule')
        .post({
          schedules: ['user@example.com'],
          startTime: {
            dateTime: startTime.toISOString(),
            timeZone: 'Eastern Standard Time',
          },
          endTime: {
            dateTime: endTime.toISOString(),
            timeZone: 'Eastern Standard Time',
          },
        });

      const scheduleItems = response.value?.[0]?.scheduleItems || [];
      return scheduleItems.length === 0;
    } catch (error) {
      console.error('Microsoft Calendar availability check error:', error);
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
      const response = await this.client
        .api(`/me/calendars/${this.calendarId}/calendarView`)
        .query({
          startDateTime: startOfDay.toISOString(),
          endDateTime: endOfDay.toISOString(),
        })
        .get();

      const busySlots = response.value || [];
      const availableSlots: Date[] = [];

      let currentSlot = new Date(startOfDay);
      while (currentSlot < endOfDay) {
        const slotEnd = new Date(currentSlot.getTime() + params.slotDuration * 60000);

        const isAvailable = !busySlots.some((busy: any) => {
          const busyStart = new Date(busy.start.dateTime);
          const busyEnd = new Date(busy.end.dateTime);
          return currentSlot < busyEnd && slotEnd > busyStart;
        });

        if (isAvailable && slotEnd <= endOfDay) {
          availableSlots.push(new Date(currentSlot));
        }

        currentSlot = slotEnd;
      }

      return availableSlots;
    } catch (error) {
      console.error('Microsoft Calendar get available slots error:', error);
      return [];
    }
  }

  async syncEvents(lastSyncTime?: Date): Promise<{
    success: boolean;
    syncedCount?: number;
    error?: string;
  }> {
    try {
      const queryParams: any = {
        $top: 250,
        $orderby: 'start/dateTime',
      };

      if (lastSyncTime) {
        queryParams.$filter = `start/dateTime ge '${lastSyncTime.toISOString()}'`;
      }

      const response = await this.client
        .api(`/me/calendars/${this.calendarId}/events`)
        .query(queryParams)
        .get();

      const events = response.value || [];

      return {
        success: true,
        syncedCount: events.length,
      };
    } catch (error: any) {
      console.error('Microsoft Calendar sync error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
