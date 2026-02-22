
/**
 * WhatsApp Business API Integration Service
 * Handles sending and receiving WhatsApp messages via Twilio or Cloud API
 */

import axios from 'axios';
import { createDalContext } from '@/lib/context/industry-context';
import { getCrmDb, conversationService } from '@/lib/dal';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

export class WhatsAppService {
  private accessToken: string;
  private phoneNumberId: string;
  private businessAccountId: string;

  constructor(accessToken: string, phoneNumberId: string, businessAccountId: string) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.businessAccountId = businessAccountId;
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(params: {
    to: string;
    message: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'document' | 'video' | 'audio';
  }): Promise<string> {
    try {
      const { to, message, mediaUrl, mediaType } = params;

      const payload: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''), // Remove non-numeric characters
      };

      if (mediaUrl && mediaType) {
        payload.type = mediaType;
        payload[mediaType] = {
          link: mediaUrl,
        };
        if (message) {
          payload[mediaType].caption = message;
        }
      } else {
        payload.type = 'text';
        payload.text = {
          body: message,
        };
      }

      const response = await axios.post(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.messages[0].id;
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error.response?.data || error);
      throw new Error(`Failed to send WhatsApp message: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook from WhatsApp
   */
  async processIncomingMessage(
    webhookData: any,
    channelConnectionId: string,
    userId: string
  ): Promise<void> {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages) return;

      for (const message of value.messages) {
        const fromNumber = message.from;
        const messageId = message.id;
        const timestamp = new Date(parseInt(message.timestamp) * 1000);

        // Get contact name if available
        const contact = value.contacts?.find((c: any) => c.wa_id === fromNumber);
        const contactName = contact?.profile?.name || fromNumber;

        // Extract message content based on type
        let messageText = '';
        let attachments: any[] = [];

        switch (message.type) {
          case 'text':
            messageText = message.text.body;
            break;
          case 'image':
            attachments.push({
              type: 'image',
              url: message.image.link || '',
              name: message.image.caption || 'image',
            });
            messageText = message.image.caption || '';
            break;
          case 'video':
            attachments.push({
              type: 'video',
              url: message.video.link || '',
              name: message.video.caption || 'video',
            });
            messageText = message.video.caption || '';
            break;
          case 'audio':
            attachments.push({
              type: 'audio',
              url: message.audio.link || '',
              name: 'audio',
            });
            break;
          case 'document':
            attachments.push({
              type: 'document',
              url: message.document.link || '',
              name: message.document.filename || 'document',
            });
            messageText = message.document.caption || '';
            break;
        }

        const ctx = createDalContext(userId);
        const db = getCrmDb(ctx);
        // Find or create conversation
        let conversation = await db.conversation.findUnique({
          where: {
            channelConnectionId_contactIdentifier: {
              channelConnectionId,
              contactIdentifier: fromNumber,
            },
          },
        });

        if (!conversation) {
          conversation = await conversationService.create(ctx, {
            channelConnection: { connect: { id: channelConnectionId } },
            contactName,
            contactIdentifier: fromNumber,
            status: 'ACTIVE',
          });
        }

        // Create message
        await db.conversationMessage.create({
          data: {
            conversationId: conversation.id,
            userId,
            direction: 'INBOUND',
            status: 'DELIVERED',
            content: messageText || '(media message)',
            attachments: attachments.length > 0 ? attachments : undefined,
            sentAt: timestamp,
            externalMessageId: messageId,
            providerData: message,
          },
        });

        // Update conversation
        await db.conversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageAt: timestamp,
            lastMessagePreview: messageText.substring(0, 100) || '(media)',
            unreadCount: { increment: 1 },
          },
        });
      }

      // Mark messages as read
      if (value.messages.length > 0) {
        for (const message of value.messages) {
          await this.markAsRead(message.id);
        }
      }
    } catch (error: any) {
      console.error('Error processing WhatsApp webhook:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await axios.post(
        `${WHATSAPP_API_URL}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error: any) {
      console.error('Error marking WhatsApp message as read:', error);
    }
  }
}
