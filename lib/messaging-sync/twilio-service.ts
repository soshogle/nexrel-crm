
/**
 * Twilio SMS Integration Service
 * Handles sending and receiving SMS messages via Twilio
 */

import twilio from 'twilio';
import { prisma } from '@/lib/db';

export class TwilioService {
  private client: ReturnType<typeof twilio>;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.phoneNumber = phoneNumber;
  }

  /**
   * Send an SMS message
   */
  async sendSMS(params: {
    to: string;
    body: string;
    mediaUrl?: string[];
  }): Promise<string> {
    try {
      const message = await this.client.messages.create({
        from: this.phoneNumber,
        to: params.to,
        body: params.body,
        mediaUrl: params.mediaUrl,
      });

      return message.sid;
    } catch (error: any) {
      console.error('Error sending Twilio SMS:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook from Twilio
   */
  async processIncomingMessage(webhookData: {
    MessageSid: string;
    From: string;
    To: string;
    Body: string;
    NumMedia?: string;
    MediaUrl0?: string;
    MediaContentType0?: string;
  }, channelConnectionId: string, userId: string): Promise<void> {
    try {
      const { MessageSid, From, To, Body, NumMedia, MediaUrl0, MediaContentType0 } = webhookData;

      // Find or create conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          channelConnectionId_contactIdentifier: {
            channelConnectionId,
            contactIdentifier: From,
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId,
            channelConnectionId,
            contactName: From, // Just use phone number as name initially
            contactIdentifier: From,
            status: 'ACTIVE',
          },
        });
      }

      // Prepare attachments if media is present
      const attachments = [];
      if (NumMedia && parseInt(NumMedia) > 0 && MediaUrl0) {
        attachments.push({
          type: MediaContentType0 || 'image/jpeg',
          url: MediaUrl0,
          name: 'media_attachment',
        });
      }

      // Create message
      await prisma.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          userId,
          direction: 'INBOUND',
          status: 'DELIVERED',
          content: Body,
          attachments: attachments.length > 0 ? attachments : undefined,
          externalMessageId: MessageSid,
          providerData: webhookData,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: Body.substring(0, 100),
          unreadCount: { increment: 1 },
        },
      });
    } catch (error: any) {
      console.error('Error processing Twilio webhook:', error);
      throw error;
    }
  }

  /**
   * Fetch message history from Twilio (for initial sync)
   */
  async fetchMessageHistory(limit: number = 50): Promise<any[]> {
    try {
      const messages = await this.client.messages.list({
        limit,
        to: this.phoneNumber, // Messages TO our Twilio number (inbound)
      });

      const sentMessages = await this.client.messages.list({
        limit,
        from: this.phoneNumber, // Messages FROM our Twilio number (outbound)
      });

      return [...messages, ...sentMessages].sort(
        (a, b) => b.dateCreated.getTime() - a.dateCreated.getTime()
      );
    } catch (error: any) {
      console.error('Error fetching Twilio message history:', error);
      throw new Error(`Failed to fetch message history: ${error.message}`);
    }
  }

  /**
   * Sync Twilio message history to database
   */
  async syncToDatabase(channelConnectionId: string, userId: string): Promise<number> {
    try {
      const messages = await this.fetchMessageHistory();
      let syncedCount = 0;

      for (const twilioMessage of messages) {
        const isInbound = twilioMessage.to === this.phoneNumber;
        const contactPhone = isInbound ? twilioMessage.from : twilioMessage.to;

        // Find or create conversation
        let conversation = await prisma.conversation.findUnique({
          where: {
            channelConnectionId_contactIdentifier: {
              channelConnectionId,
              contactIdentifier: contactPhone,
            },
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId,
              channelConnectionId,
              contactName: contactPhone,
              contactIdentifier: contactPhone,
              status: 'ACTIVE',
            },
          });
        }

        // Check if message already exists
        const existingMessage = await prisma.conversationMessage.findFirst({
          where: {
            conversationId: conversation.id,
            externalMessageId: twilioMessage.sid,
          },
        });

        if (!existingMessage) {
          await prisma.conversationMessage.create({
            data: {
              conversationId: conversation.id,
              userId,
              direction: isInbound ? 'INBOUND' : 'OUTBOUND',
              status: 'DELIVERED',
              content: twilioMessage.body,
              sentAt: twilioMessage.dateCreated,
              deliveredAt: twilioMessage.dateCreated,
              externalMessageId: twilioMessage.sid,
            },
          });

          syncedCount++;
        }
      }

      // Update sync timestamp
      await prisma.channelConnection.update({
        where: { id: channelConnectionId },
        data: {
          lastSyncAt: new Date(),
        },
      });

      return syncedCount;
    } catch (error: any) {
      console.error('Error syncing Twilio to database:', error);
      throw error;
    }
  }
}
