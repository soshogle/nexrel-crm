
// Messaging abstraction types - provider-agnostic

export enum ChannelType {
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  INSTAGRAM = 'INSTAGRAM',
  FACEBOOK_MESSENGER = 'FACEBOOK_MESSENGER',
  GOOGLE_BUSINESS = 'GOOGLE_BUSINESS',
  WEBSITE_CHAT = 'WEBSITE_CHAT',
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  attachments?: Array<{
    type: string;
    url: string;
    name?: string;
    size?: number;
  }>;
}

export interface Conversation {
  id: string;
  channelType: ChannelType;
  contactName: string;
  contactIdentifier: string;
  contactAvatar?: string;
  lastMessageAt?: Date;
  lastMessagePreview?: string;
  unreadCount: number;
  status: 'ACTIVE' | 'ARCHIVED' | 'UNREAD' | 'SNOOZED';
}

export interface MessagingProvider {
  name: string;
  
  // Send a message
  sendMessage(params: {
    channelType: ChannelType;
    to: string;
    content: string;
    attachments?: Array<{type: string; url: string; name?: string}>;
  }): Promise<{
    messageId: string;
    status: 'SENT' | 'FAILED';
    error?: string;
  }>;
  
  // Get conversations
  getConversations(params: {
    channelType?: ChannelType;
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]>;
  
  // Get messages for a conversation
  getMessages(params: {
    conversationId: string;
    limit?: number;
    offset?: number;
  }): Promise<Message[]>;
  
  // Mark message as read
  markAsRead(params: {
    conversationId: string;
    messageId?: string;
  }): Promise<void>;
  
  // Connect a channel (OAuth or config)
  connectChannel(params: {
    channelType: ChannelType;
    credentials: any;
  }): Promise<{
    success: boolean;
    channelId: string;
    error?: string;
  }>;
  
  // Disconnect a channel
  disconnectChannel(params: {
    channelId: string;
  }): Promise<void>;
  
  // Get channel status
  getChannelStatus(params: {
    channelId: string;
  }): Promise<{
    connected: boolean;
    error?: string;
  }>;
}
