/**
 * Facebook Messenger Service
 * Handles message syncing and sending for Facebook Messenger
 */

import { prisma } from './db';

export class FacebookMessengerService {
  /**
   * Sync historical conversations from Facebook Messenger
   */
  async syncConversations(userId: string): Promise<{ success: boolean; synced: number; error?: string }> {
    try {
      // Get all active Messenger connections for this user
      const connections = await prisma.channelConnection.findMany({
        where: {
          userId,
          providerType: 'FACEBOOK',
          channelType: 'FACEBOOK_MESSENGER',
          status: 'CONNECTED',
        },
      });

      if (connections.length === 0) {
        return { success: false, synced: 0, error: 'No Messenger connections found' };
      }

      let totalSynced = 0;

      for (const connection of connections) {
        const pageId = connection.channelIdentifier;
        const accessToken = connection.accessToken;

        if (!pageId || !accessToken) {
          console.error('Missing page ID or access token for connection:', connection.id);
          continue;
        }

        console.log(`🔄 Syncing conversations for page ${pageId}...`);

        // Get conversations from Facebook
        const conversationsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${pageId}/conversations?` +
          `fields=participants,messages{message,from,created_time,id}&` +
          `access_token=${accessToken}`
        );

        if (!conversationsResponse.ok) {
          console.error('Failed to fetch conversations:', await conversationsResponse.text());
          continue;
        }

        const conversationsData = await conversationsResponse.json();
        const conversations = conversationsData.data || [];

        console.log(`Found ${conversations.length} conversations`);

        // Process each conversation
        for (const fbConversation of conversations) {
          const participants = fbConversation.participants?.data || [];
          
          // Find the user (not the page)
          const participant = participants.find((p: any) => p.id !== pageId);
          if (!participant) continue;

          const participantId = participant.id;
          const participantName = participant.name || `User ${participantId}`;

          // Find or create conversation in our database
          let dbConversation = await prisma.conversation.findFirst({
            where: {
              userId,
              channelConnectionId: connection.id,
              contactIdentifier: participantId,
            },
          });

          if (!dbConversation) {
            dbConversation = await prisma.conversation.create({
              data: {
                userId,
                channelConnectionId: connection.id,
                contactName: participantName,
                contactIdentifier: participantId,
                externalConversationId: participantId,
                status: 'ACTIVE',
              },
            });
            console.log(`🆕 Created conversation for ${participantName}`);
          }

          // Sync messages
          const messages = fbConversation.messages?.data || [];
          let messageSynced = 0;

          for (const message of messages) {
            const messageId = message.id;
            const messageText = message.message || '[Attachment]';
            const fromId = message.from?.id;
            const createdTime = message.created_time;

            // Check if message already exists
            const existingMessage = await prisma.conversationMessage.findFirst({
              where: {
                conversationId: dbConversation.id,
                externalMessageId: messageId,
              },
            });

            if (existingMessage) continue;

            // Determine direction
            const direction = fromId === pageId ? 'OUTBOUND' : 'INBOUND';

            // Save message
            await prisma.conversationMessage.create({
              data: {
                conversationId: dbConversation.id,
                userId,
                externalMessageId: messageId,
                content: messageText,
                direction,
                status: 'DELIVERED',
                sentAt: new Date(createdTime),
                providerData: {
                  fromId,
                },
              },
            });

            messageSynced++;
          }

          console.log(`✅ Synced ${messageSynced} messages for ${participantName}`);
          totalSynced += messageSynced;
        }

        // Update last synced time
        await prisma.channelConnection.update({
          where: { id: connection.id },
          data: { lastSyncedAt: new Date() },
        });
      }

      return { success: true, synced: totalSynced };
    } catch (error: any) {
      console.error('❌ Error syncing Messenger conversations:', error);
      return { success: false, synced: 0, error: error.message };
    }
  }

  /**
   * Send a message via Facebook Messenger
   */
  async sendMessage(params: {
    pageId: string;
    recipientId: string;
    message: string;
    accessToken: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const { pageId, recipientId, message, accessToken } = params;

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${pageId}/messages?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { text: message },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to send message');
      }

      const data = await response.json();
      console.log('✅ Messenger message sent:', data);

      return { success: true, messageId: data.message_id };
    } catch (error: any) {
      console.error('❌ Error sending Messenger message:', error);
      return { success: false, error: error.message };
    }
  }
}

export const facebookMessengerService = new FacebookMessengerService();
