
/**
 * Gmail API Integration Service
 * Handles fetching, sending, and syncing Gmail messages
 */

import { google } from 'googleapis';
import { prisma } from '@/lib/db';

const gmail = google.gmail('v1');

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: any;
  internalDate: string;
}

export class GmailService {
  private oauth2Client: any;

  constructor(accessToken: string, refreshToken?: string) {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/messaging/connections/gmail/callback`
    );

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    google.options({ auth: this.oauth2Client });
  }

  /**
   * Fetch recent messages from Gmail
   */
  async fetchMessages(maxResults: number = 50, pageToken?: string): Promise<{
    messages: GmailMessage[];
    nextPageToken?: string;
  }> {
    try {
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        q: 'in:inbox OR in:sent', // Get inbox and sent messages
      });

      const messageIds = response.data.messages || [];
      const messages: GmailMessage[] = [];

      // Fetch full message details for each message
      for (const msg of messageIds) {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'full',
        });

        messages.push(fullMessage.data as GmailMessage);
      }

      return {
        messages,
        nextPageToken: response.data.nextPageToken || undefined,
      };
    } catch (error: any) {
      console.error('Error fetching Gmail messages:', error);
      throw new Error(`Failed to fetch Gmail messages: ${error.message}`);
    }
  }

  /**
   * Send an email via Gmail
   */
  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  }): Promise<string> {
    try {
      const { to, subject, body, threadId } = params;

      // Create email in RFC 2822 format
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        body,
      ].join('\n');

      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId,
        },
      });

      return response.data.id!;
    } catch (error: any) {
      console.error('Error sending Gmail message:', error);
      throw new Error(`Failed to send Gmail message: ${error.message}`);
    }
  }

  /**
   * Parse Gmail message into our format
   */
  parseMessage(message: GmailMessage): {
    subject: string;
    from: string;
    to: string;
    body: string;
    date: Date;
    isInbound: boolean;
  } {
    const headers = message.payload.headers;
    const getHeader = (name: string) =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const subject = getHeader('Subject');
    const from = getHeader('From');
    const to = getHeader('To');
    const date = new Date(parseInt(message.internalDate));

    // Extract body (prefer HTML, fallback to plain text)
    let body = '';
    if (message.payload.body?.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString();
    } else if (message.payload.parts) {
      const htmlPart = message.payload.parts.find((p: any) => p.mimeType === 'text/html');
      const textPart = message.payload.parts.find((p: any) => p.mimeType === 'text/plain');
      const part = htmlPart || textPart;
      if (part?.body?.data) {
        body = Buffer.from(part.body.data, 'base64').toString();
      }
    }

    // Determine if inbound (check if message is in INBOX label)
    const isInbound = message.labelIds?.includes('INBOX') ?? false;

    return { subject, from, to, body, date, isInbound };
  }

  /**
   * Sync messages to database for a specific channel connection
   */
  async syncToDatabase(channelConnectionId: string, userId: string): Promise<number> {
    try {
      // Get channel connection
      const connection = await prisma.channelConnection.findUnique({
        where: { id: channelConnectionId },
      });

      if (!connection || !connection.syncEnabled) {
        return 0;
      }

      // Fetch messages (use cursor for pagination if available)
      const { messages, nextPageToken } = await this.fetchMessages(
        50,
        connection.lastSyncCursor || undefined
      );

      let syncedCount = 0;

      for (const gmailMessage of messages) {
        const parsed = this.parseMessage(gmailMessage);

        // Determine contact identifier (from or to depending on direction)
        const contactEmail = parsed.isInbound ? parsed.from : parsed.to;
        const contactName = contactEmail.split('<')[0].trim() || contactEmail;

        // Find or create conversation
        let conversation = await prisma.conversation.findUnique({
          where: {
            channelConnectionId_contactIdentifier: {
              channelConnectionId,
              contactIdentifier: contactEmail,
            },
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId,
              channelConnectionId,
              contactName,
              contactIdentifier: contactEmail,
              status: 'ACTIVE',
              externalConversationId: gmailMessage.threadId,
            },
          });
        }

        // Check if message already exists
        const existingMessage = await prisma.conversationMessage.findFirst({
          where: {
            conversationId: conversation.id,
            externalMessageId: gmailMessage.id,
          },
        });

        if (!existingMessage) {
          // Create new message
          await prisma.conversationMessage.create({
            data: {
              conversationId: conversation.id,
              userId,
              direction: parsed.isInbound ? 'INBOUND' : 'OUTBOUND',
              status: 'DELIVERED',
              content: `Subject: ${parsed.subject}\n\n${parsed.body}`,
              sentAt: parsed.date,
              deliveredAt: parsed.date,
              externalMessageId: gmailMessage.id,
              providerData: { threadId: gmailMessage.threadId },
            },
          });

          // Update conversation
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              lastMessageAt: parsed.date,
              lastMessagePreview: parsed.subject || parsed.body.substring(0, 100),
              unreadCount: parsed.isInbound ? { increment: 1 } : undefined,
            },
          });

          syncedCount++;
        }
      }

      // Update sync cursor and timestamp
      await prisma.channelConnection.update({
        where: { id: channelConnectionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncCursor: nextPageToken || connection.lastSyncCursor,
        },
      });

      return syncedCount;
    } catch (error: any) {
      console.error('Error syncing Gmail to database:', error);
      
      // Update connection error status
      await prisma.channelConnection.update({
        where: { id: channelConnectionId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Get user's email address
   */
  async getEmailAddress(): Promise<string> {
    try {
      const response = await gmail.users.getProfile({
        userId: 'me',
      });

      return response.data.emailAddress!;
    } catch (error: any) {
      console.error('Error getting Gmail profile:', error);
      throw new Error(`Failed to get Gmail profile: ${error.message}`);
    }
  }
}
