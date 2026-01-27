
/**
 * Unified Calendar Types for Multi-Provider Support
 */

export type CalendarProvider = 'GOOGLE' | 'OUTLOOK' | 'OFFICE365' | 'APPLE' | 'EXTERNAL_API';

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: CalendarAttendee[];
  location?: string;
  reminders?: CalendarReminder[];
  metadata?: Record<string, any>;
}

export interface CalendarAttendee {
  email: string;
  name?: string;
  phone?: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

export interface CalendarReminder {
  method: 'email' | 'popup' | 'sms';
  minutesBefore: number;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface CalendarCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  apiKey?: string;
  webhookUrl?: string;
  calendarId?: string;
  settings?: Record<string, any>;
}

export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

export interface ICalendarProvider {
  /**
   * Create a new event in the calendar
   */
  createEvent(event: CalendarEvent): Promise<CalendarEventResult>;

  /**
   * Update an existing event
   */
  updateEvent(eventId: string, event: Partial<CalendarEvent>): Promise<CalendarEventResult>;

  /**
   * Delete an event
   */
  deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Get a specific event by ID
   */
  getEvent(eventId: string): Promise<CalendarEvent | null>;

  /**
   * Check if a time slot is available
   */
  checkAvailability(startTime: Date, endTime: Date): Promise<boolean>;

  /**
   * Get available time slots for a given date
   */
  getAvailableSlots(params: {
    date: Date;
    workingHours: { start: number; end: number };
    slotDuration: number;
  }): Promise<Date[]>;

  /**
   * Sync events (two-way sync)
   */
  syncEvents(lastSyncTime?: Date): Promise<{
    success: boolean;
    syncedCount?: number;
    error?: string;
  }>;
}
