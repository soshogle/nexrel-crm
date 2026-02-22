// Demo provider for initial implementation (simulates messaging without external APIs)
// This will be replaced with actual providers (Twilio, etc.)

import { BaseMessagingProvider } from './base-provider';
import { ChannelType, Conversation, Message } from '../types';

export class DemoMessagingProvider extends BaseMessagingProvider {
  name = 'demo';
  
  async sendMessage(params: {
    channelType: ChannelType;
    to: string;
    content: string;
    attachments?: Array<{type: string; url: string; name?: string}>;
  }): Promise<{
    messageId: string;
    status: 'SENT' | 'FAILED';
    error?: string;
  }> {
    try {
      // Find or create channel connection
      const channelConnection = await this.db.channelConnection.findFirst({
        where: {
          userId: this.userId,
          channelType: params.channelType,
          status: 'CONNECTED',
        },
      });
      
      if (!channelConnection) {
        return {
          messageId: '',
          status: 'FAILED',
          error: 'No connected channel found',
        };
      }
      
      // Find or create conversation
      let conversation = await this.db.conversation.findFirst({
        where: {
          channelConnectionId: channelConnection.id,
          contactIdentifier: params.to,
        },
      });
      
      if (!conversation) {
        conversation = await this.storeConversation({
          channelConnectionId: channelConnection.id,
          contactName: params.to,
          contactIdentifier: params.to,
        });
      }
      
      // Store message
      const message = await this.storeMessage({
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        content: params.content,
        status: 'SENT',
        attachments: params.attachments,
      });
      
      // Simulate message delivery after 1 second
      setTimeout(async () => {
        await this.db.conversationMessage.update({
          where: { id: message.id },
          data: { 
            status: 'DELIVERED',
            deliveredAt: new Date(),
          },
        });
      }, 1000);
      
      return {
        messageId: message.id,
        status: 'SENT',
      };
    } catch (error) {
      console.error('Error sending message:', error);
      return {
        messageId: '',
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async getConversations(params: {
    channelType?: ChannelType;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]> {
    const conversations = await this.db.conversation.findMany({
      where: {
        userId: this.userId,
        channelConnection: params.channelType ? {
          channelType: params.channelType,
        } : undefined,
      },
      include: {
        channelConnection: true,
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      take: params.limit || 50,
      skip: params.offset || 0,
    });
    
    return conversations.map(conv => ({
      id: conv.id,
      channelType: conv.channelConnection.channelType as ChannelType,
      contactName: conv.contactName,
      contactIdentifier: conv.contactIdentifier,
      contactAvatar: conv.contactAvatar || undefined,
      lastMessageAt: conv.lastMessageAt || undefined,
      lastMessagePreview: conv.lastMessagePreview || undefined,
      unreadCount: conv.unreadCount,
      status: conv.status as 'ACTIVE' | 'ARCHIVED' | 'UNREAD' | 'SNOOZED',
    }));
  }
  
  async getMessages(params: {
    conversationId: string;
    limit?: number;
    offset?: number;
  }): Promise<Message[]> {
    const messages = await this.db.conversationMessage.findMany({
      where: {
        conversationId: params.conversationId,
        userId: this.userId,
      },
      orderBy: {
        sentAt: 'asc',
      },
      take: params.limit || 100,
      skip: params.offset || 0,
    });
    
    return messages.map(msg => ({
      id: msg.id,
      conversationId: msg.conversationId,
      content: msg.content,
      direction: msg.direction as 'INBOUND' | 'OUTBOUND',
      status: msg.status as 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
      sentAt: msg.sentAt,
      deliveredAt: msg.deliveredAt || undefined,
      readAt: msg.readAt || undefined,
      attachments: msg.attachments as any,
    }));
  }
  
  async markAsRead(params: {
    conversationId: string;
    messageId?: string;
  }): Promise<void> {
    if (params.messageId) {
      await this.db.conversationMessage.update({
        where: { id: params.messageId },
        data: { 
          status: 'READ',
          readAt: new Date(),
        },
      });
    } else {
      await this.db.conversationMessage.updateMany({
        where: {
          conversationId: params.conversationId,
          direction: 'INBOUND',
          status: { not: 'READ' },
        },
        data: {
          status: 'READ',
          readAt: new Date(),
        },
      });
    }
    
    await this.db.conversation.update({
      where: { id: params.conversationId },
      data: { unreadCount: 0 },
    });
  }
  
  async connectChannel(params: {
    channelType: ChannelType;
    credentials: any;
  }): Promise<{
    success: boolean;
    channelId: string;
    error?: string;
  }> {
    try {
      const channelConnection = await this.db.channelConnection.create({
        data: {
          userId: this.userId,
          channelType: params.channelType,
          channelIdentifier: params.credentials.identifier || `demo-${Date.now()}`,
          displayName: params.credentials.displayName || `${params.channelType} Channel`,
          status: 'CONNECTED',
          providerType: 'demo',
          isDefault: true,
        },
      });
      
      return {
        success: true,
        channelId: channelConnection.id,
      };
    } catch (error) {
      console.error('Error connecting channel:', error);
      return {
        success: false,
        channelId: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async disconnectChannel(params: {
    channelId: string;
  }): Promise<void> {
    await this.db.channelConnection.update({
      where: { id: params.channelId },
      data: { status: 'DISCONNECTED' },
    });
  }
  
  async getChannelStatus(params: {
    channelId: string;
  }): Promise<{
    connected: boolean;
    error?: string;
  }> {
    const channel = await this.db.channelConnection.findUnique({
      where: { id: params.channelId },
    });
    
    return {
      connected: channel?.status === 'CONNECTED',
      error: channel?.errorMessage || undefined,
    };
  }
}
