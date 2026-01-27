/**
 * GoHighLevel Service
 * Unified social media connectivity through GoHighLevel API
 */

interface GoHighLevelConfig {
  apiKey: string;
  locationId: string;
  baseUrl?: string;
}

interface GoHighLevelContact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, any>;
}

interface GoHighLevelConversation {
  id: string;
  contactId: string;
  channel: 'instagram' | 'facebook' | 'whatsapp' | 'sms';
  lastMessageAt: string;
  unreadCount: number;
}

interface GoHighLevelMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'video' | 'audio';
  body: string;
  mediaUrl?: string;
  sentAt: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
}

export class GoHighLevelService {
  private config: GoHighLevelConfig;
  private baseUrl: string;

  constructor(config?: GoHighLevelConfig) {
    this.config = config || {
      apiKey: process.env.GOHIGHLEVEL_API_KEY || '',
      locationId: process.env.GOHIGHLEVEL_LOCATION_ID || '',
      baseUrl: process.env.GOHIGHLEVEL_BASE_URL || 'https://rest.gohighlevel.com/v1',
    };
    this.baseUrl = this.config.baseUrl || 'https://rest.gohighlevel.com/v1';

    if (!this.config.apiKey) {
      console.warn('⚠️ GoHighLevel API key not configured');
    }
  }

  /**
   * Check if GoHighLevel is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey && this.config.locationId);
  }

  /**
   * Get authorization headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/locations/${this.config.locationId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }

  /**
   * Get all conversations for a specific channel
   */
  async getConversations(params: {
    channel?: 'instagram' | 'facebook' | 'whatsapp' | 'sms';
    limit?: number;
    offset?: number;
  }): Promise<GoHighLevelConversation[]> {
    try {
      const queryParams = new URLSearchParams({
        locationId: this.config.locationId,
        ...(params.channel && { channel: params.channel }),
        ...(params.limit && { limit: params.limit.toString() }),
        ...(params.offset && { offset: params.offset.toString() }),
      });

      const response = await fetch(
        `${this.baseUrl}/conversations?${queryParams.toString()}`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();
      return data.conversations || [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId: string, params?: {
    limit?: number;
    before?: string;
  }): Promise<GoHighLevelMessage[]> {
    try {
      const queryParams = new URLSearchParams({
        ...(params?.limit && { limit: params.limit.toString() }),
        ...(params?.before && { before: params.before }),
      });

      const url = `${this.baseUrl}/conversations/${conversationId}/messages?${queryParams.toString()}`;
      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  /**
   * Send a message through GoHighLevel
   */
  async sendMessage(params: {
    conversationId?: string;
    contactId?: string;
    channel: 'instagram' | 'facebook' | 'whatsapp' | 'sms';
    type?: 'text' | 'image';
    body: string;
    mediaUrl?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const payload: any = {
        locationId: this.config.locationId,
        type: params.type || 'text',
        message: params.body,
      };

      // Add conversation or contact ID
      if (params.conversationId) {
        payload.conversationId = params.conversationId;
      } else if (params.contactId) {
        payload.contactId = params.contactId;
        payload.channel = params.channel;
      } else {
        return { success: false, error: 'Either conversationId or contactId is required' };
      }

      // Add media URL if provided
      if (params.mediaUrl) {
        payload.mediaUrl = params.mediaUrl;
      }

      const response = await fetch(`${this.baseUrl}/conversations/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.messageId || data.id,
      };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send message',
      };
    }
  }

  /**
   * Create or update a contact in GoHighLevel
   */
  async upsertContact(params: {
    email?: string;
    phone?: string;
    name: string;
    customFields?: Record<string, any>;
  }): Promise<{ success: boolean; contactId?: string; error?: string }> {
    try {
      const payload = {
        locationId: this.config.locationId,
        ...params,
      };

      const response = await fetch(`${this.baseUrl}/contacts`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        contactId: data.contact?.id || data.id,
      };
    } catch (error: any) {
      console.error('Error upserting contact:', error);
      return {
        success: false,
        error: error.message || 'Failed to upsert contact',
      };
    }
  }

  /**
   * Get contact by ID or search criteria
   */
  async getContact(params: {
    contactId?: string;
    email?: string;
    phone?: string;
  }): Promise<GoHighLevelContact | null> {
    try {
      let url: string;

      if (params.contactId) {
        url = `${this.baseUrl}/contacts/${params.contactId}`;
      } else if (params.email || params.phone) {
        const queryParams = new URLSearchParams({
          locationId: this.config.locationId,
          ...(params.email && { email: params.email }),
          ...(params.phone && { phone: params.phone }),
        });
        url = `${this.baseUrl}/contacts/lookup?${queryParams.toString()}`;
      } else {
        return null;
      }

      const response = await fetch(url, { headers: this.getHeaders() });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.contact || data;
    } catch (error) {
      console.error('Error fetching contact:', error);
      return null;
    }
  }

  /**
   * Get available channels (connected social media accounts)
   */
  async getAvailableChannels(): Promise<{
    instagram: boolean;
    facebook: boolean;
    whatsapp: boolean;
    sms: boolean;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/locations/${this.config.locationId}/channels`,
        { headers: this.getHeaders() }
      );

      if (!response.ok) {
        // Return all false if we can't fetch
        return { instagram: false, facebook: false, whatsapp: false, sms: false };
      }

      const data = await response.json();
      return {
        instagram: data.channels?.instagram?.connected || false,
        facebook: data.channels?.facebook?.connected || false,
        whatsapp: data.channels?.whatsapp?.connected || false,
        sms: data.channels?.sms?.connected || false,
      };
    } catch (error) {
      console.error('Error fetching available channels:', error);
      return { instagram: false, facebook: false, whatsapp: false, sms: false };
    }
  }

  /**
   * Subscribe to webhooks for real-time message updates
   */
  async setupWebhook(params: {
    url: string;
    events: string[];
  }): Promise<{ success: boolean; webhookId?: string; error?: string }> {
    try {
      const payload = {
        locationId: this.config.locationId,
        url: params.url,
        events: params.events,
      };

      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        return {
          success: false,
          error: error.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        webhookId: data.webhook?.id || data.id,
      };
    } catch (error: any) {
      console.error('Error setting up webhook:', error);
      return {
        success: false,
        error: error.message || 'Failed to setup webhook',
      };
    }
  }
}

// Export singleton instance
export const goHighLevelService = new GoHighLevelService();
