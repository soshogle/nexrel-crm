/**
 * Instagram DM Integration Service
 * Handles sending and receiving Instagram Direct Messages
 * Uses Facebook Graph API (Instagram Messaging API)
 */

import axios from 'axios';
import { getCrmDb, conversationService } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

export class InstagramService {
  private accessToken: string;
  private instagramAccountId: string;

  constructor(accessToken: string, instagramAccountId: string) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
  }

  /**
   * Send an Instagram DM
   */
  async sendMessage(params: {
    recipientId: string;
    message: string;
    attachmentUrl?: string;
  }): Promise<string> {
    try {
      const { recipientId, message, attachmentUrl } = params;

      const payload: any = {
        recipient: { id: recipientId },
        message: {},
      };

      if (attachmentUrl) {
        payload.message.attachment = {
          type: 'image',
          payload: {
            url: attachmentUrl,
            is_reusable: true,
          },
        };
      } else {
        payload.message.text = message;
      }

      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/me/messages`,
        payload,
        {
          params: { access_token: this.accessToken },
        }
      );

      return response.data.message_id;
    } catch (error: any) {
      console.error('Error sending Instagram message:', error.response?.data || error);
      throw new Error(`Failed to send Instagram message: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook from Instagram
   */
  async processIncomingMessage(
    webhookData: any,
    channelConnectionId: string,
    userId: string
  ): Promise<void> {
    try {
      const messaging = webhookData.entry[0]?.messaging[0];
      if (!messaging) return;

      const senderId = messaging.sender.id;
      const messageId = messaging.message?.mid;
      const messageText = messaging.message?.text || '';
      const attachments = messaging.message?.attachments || [];

      // Get sender info
      const senderInfo = await this.getUserInfo(senderId);

      const ctx = createDalContext(userId);
      const db = getCrmDb(ctx);

      // Find or create conversation
      let conversation = await db.conversation.findUnique({
        where: {
          channelConnectionId_contactIdentifier: {
            channelConnectionId,
            contactIdentifier: senderId,
          },
        },
      });

      if (!conversation) {
        conversation = await conversationService.create(ctx, {
          channelConnection: { connect: { id: channelConnectionId } },
          contactName: senderInfo.username || senderId,
          contactIdentifier: senderId,
          contactAvatar: senderInfo.profile_picture_url,
          status: 'ACTIVE',
        } as any);
      }

      // Prepare attachments
      const messageAttachments = attachments.map((att: any) => ({
        type: att.type,
        url: att.payload?.url || '',
        name: att.title || 'attachment',
      }));

      // Create message
      await db.conversationMessage.create({
        data: {
          conversationId: conversation.id,
          userId,
          direction: 'INBOUND',
          status: 'DELIVERED',
          content: messageText,
          attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
          externalMessageId: messageId,
          providerData: messaging,
        },
      });

      // Update conversation
      await conversationService.update(ctx, conversation.id, {
        lastMessageAt: new Date(),
        lastMessagePreview: messageText.substring(0, 100) || '(attachment)',
        unreadCount: { increment: 1 },
      });
    } catch (error: any) {
      console.error('Error processing Instagram webhook:', error);
      throw error;
    }
  }

  /**
   * Get Instagram user info
   */
  async getUserInfo(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${userId}`, {
        params: {
          fields: 'username,profile_picture_url',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting Instagram user info:', error);
      return { username: userId, profile_picture_url: null };
    }
  }
}
