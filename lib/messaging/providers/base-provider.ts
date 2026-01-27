
// Base provider with common functionality

import { MessagingProvider, ChannelType, Conversation, Message } from '../types';
import { prisma } from '@/lib/db';

export abstract class BaseMessagingProvider implements MessagingProvider {
  abstract name: string;
  
  protected userId: string;
  
  constructor(userId: string) {
    this.userId = userId;
  }
  
  // Store conversation locally in our database
  protected async storeConversation(data: {
    channelConnectionId: string;
    contactName: string;
    contactIdentifier: string;
    contactAvatar?: string;
    leadId?: string;
    externalConversationId?: string;
  }) {
    return await prisma.conversation.upsert({
      where: {
        channelConnectionId_contactIdentifier: {
          channelConnectionId: data.channelConnectionId,
          contactIdentifier: data.contactIdentifier,
        },
      },
      update: {
        contactName: data.contactName,
        contactAvatar: data.contactAvatar,
        leadId: data.leadId,
        externalConversationId: data.externalConversationId,
      },
      create: {
        userId: this.userId,
        channelConnectionId: data.channelConnectionId,
        contactName: data.contactName,
        contactIdentifier: data.contactIdentifier,
        contactAvatar: data.contactAvatar,
        leadId: data.leadId,
        externalConversationId: data.externalConversationId,
      },
    });
  }
  
  // Store message locally in our database
  protected async storeMessage(data: {
    conversationId: string;
    direction: 'INBOUND' | 'OUTBOUND';
    content: string;
    status?: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    externalMessageId?: string;
    attachments?: any;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
  }) {
    const message = await prisma.conversationMessage.create({
      data: {
        conversationId: data.conversationId,
        userId: this.userId,
        direction: data.direction,
        content: data.content,
        status: data.status || 'SENT',
        externalMessageId: data.externalMessageId,
        attachments: data.attachments,
        sentAt: data.sentAt || new Date(),
        deliveredAt: data.deliveredAt,
        readAt: data.readAt,
      },
    });
    
    // Update conversation last message
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessageAt: message.sentAt,
        lastMessagePreview: data.content.substring(0, 100),
        unreadCount: data.direction === 'INBOUND' ? { increment: 1 } : undefined,
      },
    });
    
    return message;
  }
  
  // Abstract methods that providers must implement
  abstract sendMessage(params: {
    channelType: ChannelType;
    to: string;
    content: string;
    attachments?: Array<{type: string; url: string; name?: string}>;
  }): Promise<{
    messageId: string;
    status: 'SENT' | 'FAILED';
    error?: string;
  }>;
  
  abstract getConversations(params: {
    channelType?: ChannelType;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]>;
  
  abstract getMessages(params: {
    conversationId: string;
    limit?: number;
    offset?: number;
  }): Promise<Message[]>;
  
  abstract markAsRead(params: {
    conversationId: string;
    messageId?: string;
  }): Promise<void>;
  
  abstract connectChannel(params: {
    channelType: ChannelType;
    credentials: any;
  }): Promise<{
    success: boolean;
    channelId: string;
    error?: string;
  }>;
  
  abstract disconnectChannel(params: {
    channelId: string;
  }): Promise<void>;
  
  abstract getChannelStatus(params: {
    channelId: string;
  }): Promise<{
    connected: boolean;
    error?: string;
  }>;
}
