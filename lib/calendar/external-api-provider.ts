
/**
 * External API Provider for Business Booking Systems
 * Supports custom calendar integrations via webhooks and REST APIs
 */

import {
  ICalendarProvider,
  CalendarEvent,
  CalendarEventResult,
  CalendarCredentials,
} from './types';

export class ExternalApiProvider implements ICalendarProvider {
  private webhookUrl?: string;
  private apiKey?: string;
  private settings: Record<string, any>;

  constructor(credentials: CalendarCredentials) {
    this.webhookUrl = credentials.webhookUrl;
    this.apiKey = credentials.apiKey;
    this.settings = credentials.settings || {};
  }

  async createEvent(event: CalendarEvent): Promise<CalendarEventResult> {
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL not configured for external API integration',
      };
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.webhookUrl}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          event: {
            title: event.summary,
            description: event.description,
            start_time: event.startTime.toISOString(),
            end_time: event.endTime.toISOString(),
            attendees: event.attendees,
            location: event.location,
            reminders: event.reminders,
          },
          metadata: event.metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        eventId: data.id || data.event_id,
        eventLink: data.url || data.event_url,
      };
    } catch (error: any) {
      console.error('External API create error:', error);
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
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const updateData: any = {};
      if (event.summary) updateData.title = event.summary;
      if (event.description) updateData.description = event.description;
      if (event.startTime) updateData.start_time = event.startTime.toISOString();
      if (event.endTime) updateData.end_time = event.endTime.toISOString();
      if (event.attendees) updateData.attendees = event.attendees;
      if (event.location) updateData.location = event.location;

      const response = await fetch(`${this.webhookUrl}/events/${eventId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        eventId: data.id || data.event_id,
        eventLink: data.url || data.event_url,
      };
    } catch (error: any) {
      console.error('External API update error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.webhookUrl}/events/${eventId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('External API delete error:', error);
      return { success: false, error: error.message };
    }
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    if (!this.webhookUrl) {
      return null;
    }

    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.webhookUrl}/events/${eventId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      return {
        id: data.id || data.event_id,
        summary: data.title || data.summary,
        description: data.description,
        startTime: new Date(data.start_time || data.startTime),
        endTime: new Date(data.end_time || data.endTime),
        attendees: data.attendees || [],
        location: data.location,
      };
    } catch (error) {
      console.error('External API get event error:', error);
      return null;
    }
  }

  async checkAvailability(startTime: Date, endTime: Date): Promise<boolean> {
    if (!this.webhookUrl) {
      return true;
    }

    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(
        `${this.webhookUrl}/availability?start=${startTime.toISOString()}&end=${endTime.toISOString()}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        return true; // Default to available on error
      }

      const data = await response.json();
      return data.available !== false;
    } catch (error) {
      console.error('External API availability check error:', error);
      return true;
    }
  }

  async getAvailableSlots(params: {
    date: Date;
    workingHours: { start: number; end: number };
    slotDuration: number;
  }): Promise<Date[]> {
    if (!this.webhookUrl) {
      return [];
    }

    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(
        `${this.webhookUrl}/available-slots?date=${params.date.toISOString()}&start_hour=${params.workingHours.start}&end_hour=${params.workingHours.end}&duration=${params.slotDuration}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return (data.slots || []).map((slot: string) => new Date(slot));
    } catch (error) {
      console.error('External API get available slots error:', error);
      return [];
    }
  }

  async syncEvents(lastSyncTime?: Date): Promise<{
    success: boolean;
    syncedCount?: number;
    error?: string;
  }> {
    if (!this.webhookUrl) {
      return {
        success: false,
        error: 'Webhook URL not configured',
      };
    }

    try {
      const headers: HeadersInit = {};

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      let url = `${this.webhookUrl}/events/sync`;
      if (lastSyncTime) {
        url += `?since=${lastSyncTime.toISOString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        success: true,
        syncedCount: data.count || data.events?.length || 0,
      };
    } catch (error: any) {
      console.error('External API sync error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
