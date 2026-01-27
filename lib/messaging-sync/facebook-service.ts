
/**
 * Facebook Messenger Integration Service
 * Handles sending and receiving Facebook Messenger messages
 */

import axios from 'axios';
import { prisma } from '@/lib/db';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v18.0';

export class FacebookService {
  private accessToken: string;
  private pageId: string;

  constructor(accessToken: string, pageId: string) {
    this.accessToken = accessToken;
    this.pageId = pageId;
  }

  /**
   * Send a Facebook Messenger message
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
        messaging_type: 'RESPONSE',
      };

      if (attachmentUrl) {
        payload.message = {
          attachment: {
            type: 'file',
            payload: {
              url: attachmentUrl,
              is_reusable: true,
            },
          },
        };
      } else {
        payload.message = {
          text: message,
        };
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
      console.error('Error sending Facebook message:', error.response?.data || error);
      throw new Error(`Failed to send Facebook message: ${error.message}`);
    }
  }

  /**
   * Process incoming webhook from Facebook
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

      // Get sender profile info
      const senderProfile = await this.getUserProfile(senderId);

      // Find or create conversation
      let conversation = await prisma.conversation.findUnique({
        where: {
          channelConnectionId_contactIdentifier: {
            channelConnectionId,
            contactIdentifier: senderId,
          },
        },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            userId,
            channelConnectionId,
            contactName: senderProfile.name,
            contactIdentifier: senderId,
            contactAvatar: senderProfile.profile_pic,
            status: 'ACTIVE',
          },
        });
      }

      // Prepare attachments
      const messageAttachments = attachments.map((att: any) => ({
        type: att.type,
        url: att.payload?.url || '',
        name: att.title || 'attachment',
      }));

      // Create message
      await prisma.conversationMessage.create({
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
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: messageText.substring(0, 100) || '(attachment)',
          unreadCount: { increment: 1 },
        },
      });
    } catch (error: any) {
      console.error('Error processing Facebook webhook:', error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await axios.get(`${FACEBOOK_GRAPH_API}/${userId}`, {
        params: {
          fields: 'name,profile_pic',
          access_token: this.accessToken,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting Facebook user profile:', error);
      return { name: userId, profile_pic: null };
    }
  }

  /**
   * Fetch conversation history
   */
  async fetchConversations(limit: number = 25): Promise<any[]> {
    try {
      const response = await axios.get(
        `${FACEBOOK_GRAPH_API}/${this.pageId}/conversations`,
        {
          params: {
            fields: 'participants,messages{message,from,created_time}',
            limit,
            access_token: this.accessToken,
          },
        }
      );

      return response.data.data || [];
    } catch (error: any) {
      console.error('Error fetching Facebook conversations:', error);
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }
  }
}
