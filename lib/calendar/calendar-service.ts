
/**
 * Unified Calendar Service - Factory Pattern
 * Provides a single interface for all calendar providers
 */

import { prisma } from '@/lib/db';
import { ICalendarProvider, CalendarCredentials, CalendarProvider as ProviderType } from './types';
import { GoogleCalendarProvider } from './google-provider';
import { MicrosoftCalendarProvider } from './microsoft-provider';
import { AppleCalendarProvider } from './apple-provider';
import { ExternalApiProvider } from './external-api-provider';

export class CalendarService {
  /**
   * Create a calendar provider instance based on the provider type
   */
  static createProvider(
    providerType: ProviderType,
    credentials: CalendarCredentials
  ): ICalendarProvider {
    switch (providerType) {
      case 'GOOGLE':
        return new GoogleCalendarProvider(credentials);
      case 'OUTLOOK':
      case 'OFFICE365':
        return new MicrosoftCalendarProvider(credentials);
      case 'APPLE':
        return new AppleCalendarProvider(credentials);
      case 'EXTERNAL_API':
        return new ExternalApiProvider(credentials);
      default:
        throw new Error(`Unsupported calendar provider: ${providerType}`);
    }
  }

  /**
   * Get calendar provider for a specific connection
   */
  static async getProviderForConnection(connectionId: string): Promise<ICalendarProvider | null> {
    try {
      const connection = await prisma.calendarConnection.findUnique({
        where: { id: connectionId },
      });

      if (!connection) {
        return null;
      }

      const credentials: CalendarCredentials = {
        accessToken: connection.accessToken || undefined,
        refreshToken: connection.refreshToken || undefined,
        expiresAt: connection.expiresAt || undefined,
        apiKey: connection.apiKey || undefined,
        webhookUrl: connection.webhookUrl || undefined,
        calendarId: connection.calendarId || undefined,
        settings: connection.settings as Record<string, any> | undefined,
      };

      return this.createProvider(connection.provider, credentials);
    } catch (error) {
      console.error('Error getting provider for connection:', error);
      return null;
    }
  }

  /**
   * Get all active calendar connections for a user
   */
  static async getUserConnections(userId: string) {
    return await prisma.calendarConnection.findMany({
      where: {
        userId,
        syncEnabled: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Sync appointment to calendar
   */
  static async syncAppointmentToCalendar(appointmentId: string) {
    try {
      const appointment = await prisma.bookingAppointment.findUnique({
        where: { id: appointmentId },
        include: {
          calendarConnection: true,
          lead: true,
        },
      });

      if (!appointment || !appointment.calendarConnection) {
        return { success: false, error: 'Appointment or calendar connection not found' };
      }

      const provider = await this.getProviderForConnection(
        appointment.calendarConnection.id
      );

      if (!provider) {
        return { success: false, error: 'Could not create calendar provider' };
      }

      // Create or update event
      const event = {
        summary: `Appointment with ${appointment.customerName}`,
        description: appointment.notes || 'Scheduled appointment',
        startTime: appointment.appointmentDate,
        endTime: new Date(
          appointment.appointmentDate.getTime() + appointment.duration * 60000
        ),
        attendees: appointment.customerEmail
          ? [
              {
                email: appointment.customerEmail,
                name: appointment.customerName,
                phone: appointment.customerPhone,
              },
            ]
          : [],
        location: appointment.lead?.address || undefined,
      };

      let result;
      if (appointment.externalEventId) {
        // Update existing event
        result = await provider.updateEvent(appointment.externalEventId, event);
      } else {
        // Create new event
        result = await provider.createEvent(event);
      }

      if (result.success) {
        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            externalEventId: result.eventId,
            externalEventLink: result.eventLink,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });
      } else {
        await prisma.bookingAppointment.update({
          where: { id: appointmentId },
          data: {
            syncStatus: 'FAILED',
          },
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error syncing appointment to calendar:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Two-way sync: Pull events from calendar providers
   */
  static async syncFromCalendar(userId: string) {
    try {
      const connections = await this.getUserConnections(userId);
      let totalSynced = 0;

      for (const connection of connections) {
        const provider = await this.getProviderForConnection(connection.id);
        if (!provider) continue;

        const result = await provider.syncEvents(connection.lastSyncAt || undefined);

        if (result.success) {
          totalSynced += result.syncedCount || 0;

          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: {
              lastSyncAt: new Date(),
              syncStatus: 'SYNCED',
            },
          });
        } else {
          await prisma.calendarConnection.update({
            where: { id: connection.id },
            data: {
              syncStatus: 'FAILED',
            },
          });
        }
      }

      return {
        success: true,
        syncedCount: totalSynced,
        connectionsCount: connections.length,
      };
    } catch (error: any) {
      console.error('Error syncing from calendar:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
