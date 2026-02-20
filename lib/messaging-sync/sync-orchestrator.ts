
/**
 * Message Synchronization Orchestrator
 * Coordinates syncing messages from all connected channels
 */

import { prisma } from '@/lib/db';
import { GmailService } from './gmail-service';
import { OutlookService } from './outlook-service';
import { TwilioService } from './twilio-service';
import { syncLogger } from './sync-logger';
import { decrypt } from '@/lib/encryption';

export class MessageSyncOrchestrator {
  /**
   * Sync messages for all channels of a specific user
   */
  static async syncUserMessages(userId: string): Promise<{
    synced: number;
    errors: string[];
  }> {
    let totalSynced = 0;
    const errors: string[] = [];

    try {
      // Get all connected and enabled channels for this user
      const connections = await prisma.channelConnection.findMany({
        where: {
          userId,
          status: 'CONNECTED',
          syncEnabled: true,
        },
      });

      syncLogger.info(userId, 'ALL', `Starting sync, found ${connections.length} connections`, { connectionCount: connections.length });

      for (const connection of connections) {
        try {
          let synced = 0;

          switch (connection.channelType) {
            case 'EMAIL':
              synced = (connection.providerType || '').toLowerCase() === 'outlook'
                ? await this.syncOutlook(connection, userId)
                : await this.syncGmail(connection, userId);
              break;
            case 'SMS':
              synced = await this.syncTwilio(connection, userId);
              break;
            case 'FACEBOOK_MESSENGER':
              // Facebook uses webhooks primarily, no polling needed
              console.log('Facebook uses webhooks, skipping poll sync');
              break;
            case 'INSTAGRAM':
              // Instagram uses webhooks primarily, no polling needed
              console.log('Instagram uses webhooks, skipping poll sync');
              break;
            case 'WHATSAPP':
              // WhatsApp uses webhooks primarily, no polling needed
              console.log('WhatsApp uses webhooks, skipping poll sync');
              break;
            default:
              console.log(`Unknown channel type: ${connection.channelType}`);
          }

          totalSynced += synced;
          syncLogger.info(userId, connection.channelType, `Synced ${synced} messages`, {
            synced,
            displayName: connection.displayName,
            providerType: connection.providerType,
          });
        } catch (error: any) {
          const errorMsg = `Error syncing ${connection.channelType}: ${error.message}`;
          syncLogger.error(userId, connection.channelType, errorMsg, error.message, {
            connectionId: connection.id,
            providerType: connection.providerType,
          });
          errors.push(errorMsg);

          // Update connection error status
          await prisma.channelConnection.update({
            where: { id: connection.id },
            data: {
              status: 'ERROR',
              errorMessage: error.message,
            },
          });
        }
      }

      return { synced: totalSynced, errors };
    } catch (error: any) {
      console.error('Error in sync orchestrator:', error);
      throw error;
    }
  }

  /**
   * Sync Outlook messages
   */
  private static async syncOutlook(
    connection: any,
    userId: string
  ): Promise<number> {
    if (!connection.accessToken) {
      throw new Error('No access token for Outlook connection');
    }
    const outlookService = new OutlookService(
      connection.accessToken,
      connection.refreshToken
    );
    return await outlookService.syncToDatabase(connection.id, userId);
  }

  /**
   * Sync Gmail messages
   */
  private static async syncGmail(
    connection: any,
    userId: string
  ): Promise<number> {
    if (!connection.accessToken) {
      throw new Error('No access token for Gmail connection');
    }

    const gmailAccessToken = decrypt(connection.accessToken);
    const gmailRefreshToken = connection.refreshToken ? decrypt(connection.refreshToken) : undefined;
    const gmailService = new GmailService(
      gmailAccessToken,
      gmailRefreshToken
    );

    return await gmailService.syncToDatabase(connection.id, userId);
  }

  /**
   * Sync Twilio SMS messages
   */
  private static async syncTwilio(
    connection: any,
    userId: string
  ): Promise<number> {
    const providerData = connection.providerData as any;
    
    if (!providerData?.accountSid || !providerData?.authToken) {
      throw new Error('Missing Twilio credentials');
    }

    const twilioService = new TwilioService(
      providerData.accountSid,
      providerData.authToken,
      connection.channelIdentifier
    );

    return await twilioService.syncToDatabase(connection.id, userId);
  }

  /**
   * Sync all users (can be called by a cron job)
   */
  static async syncAllUsers(): Promise<{
    totalSynced: number;
    usersProcessed: number;
    errors: string[];
  }> {
    let totalSynced = 0;
    let usersProcessed = 0;
    const allErrors: string[] = [];

    try {
      // Get all users who have at least one connected channel
      const users = await prisma.user.findMany({
        where: {
          channelConnections: {
            some: {
              status: 'CONNECTED',
              syncEnabled: true,
            },
          },
        },
        select: { id: true },
      });

      console.log(`Starting sync for ${users.length} users`);

      for (const user of users) {
        try {
          const result = await this.syncUserMessages(user.id);
          totalSynced += result.synced;
          allErrors.push(...result.errors);
          usersProcessed++;
        } catch (error: any) {
          console.error(`Error syncing user ${user.id}:`, error);
          allErrors.push(`User ${user.id}: ${error.message}`);
        }
      }

      return {
        totalSynced,
        usersProcessed,
        errors: allErrors,
      };
    } catch (error: any) {
      console.error('Error in syncAllUsers:', error);
      throw error;
    }
  }
}
