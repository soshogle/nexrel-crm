/**
 * Outlook / Microsoft 365 API Integration Service
 * Handles fetching, sending, and syncing Outlook messages via Microsoft Graph
 */

import { getCrmDb, leadService, conversationService } from '@/lib/dal';
import { createDalContext } from '@/lib/context/industry-context';

function extractEmail(str: string): string | null {
  const match = str.match(/<([^>]+)>/);
  return match ? match[1].trim() : (str.includes('@') ? str.trim() : null);
}

interface OutlookMessage {
  id: string;
  conversationId: string;
  subject: string;
  body: { content: string; contentType: string };
  from?: { emailAddress: { name?: string; address?: string } };
  toRecipients?: { emailAddress: { name?: string; address?: string } }[];
  receivedDateTime: string;
  isRead?: boolean;
}

export class OutlookService {
  private accessToken: string;
  private refreshToken?: string;
  private baseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(accessToken: string, refreshToken?: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  private async fetchGraph<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Microsoft Graph error: ${res.status} ${err}`);
    }
    return res.json();
  }

  async fetchMessages(maxResults = 50, deltaToken?: string): Promise<{
    messages: OutlookMessage[];
    nextPageToken?: string;
  }> {
    const params = new URLSearchParams();
    params.set('$top', String(maxResults));
    params.set('$orderby', 'receivedDateTime desc');
    params.set('$select', 'id,conversationId,subject,body,from,toRecipients,receivedDateTime,isRead');
    if (deltaToken) params.set('$skiptoken', deltaToken);

    const data = await this.fetchGraph<{ value: OutlookMessage[]; '@odata.nextLink'?: string }>(
      `/me/messages?${params}`
    );

    const nextLink = data['@odata.nextLink'];
    const nextPageToken = nextLink
      ? new URL(nextLink).searchParams.get('$skiptoken') || undefined
      : undefined;

    return {
      messages: data.value || [],
      nextPageToken,
    };
  }

  parseMessage(msg: OutlookMessage, myEmail?: string): {
    subject: string;
    from: string;
    to: string;
    body: string;
    date: Date;
    isInbound: boolean;
  } {
    const fromAddr = msg.from?.emailAddress?.address || '';
    const from = msg.from?.emailAddress
      ? (msg.from.emailAddress.name ? `"${msg.from.emailAddress.name}" <${fromAddr}>` : fromAddr)
      : '';
    const toRec = msg.toRecipients?.[0]?.emailAddress;
    const to = toRec
      ? (toRec.name ? `"${toRec.name}" <${toRec.address}>` : toRec.address || '')
      : '';
    const body = msg.body?.content || '';
    const isInbound = myEmail ? fromAddr.toLowerCase() !== myEmail.toLowerCase() : true;
    return {
      subject: msg.subject || '(No subject)',
      from,
      to,
      body: body.replace(/<[^>]+>/g, ' ').substring(0, 10000),
      date: new Date(msg.receivedDateTime),
      isInbound,
    };
  }

  async syncToDatabase(channelConnectionId: string, userId: string): Promise<number> {
    const ctx = createDalContext(userId);
    const db = getCrmDb(ctx);
    try {
      const connection = await db.channelConnection.findUnique({
        where: { id: channelConnectionId },
      });

      if (!connection || !connection.syncEnabled) {
        return 0;
      }

      const { messages, nextPageToken } = await this.fetchMessages(
        50,
        (connection.lastSyncCursor as string) || undefined
      );

      const myEmail = connection.channelIdentifier || (await this.getEmailAddress());

      let syncedCount = 0;

      for (const msg of messages) {
        const parsed = this.parseMessage(msg, myEmail);
        const contactRaw = parsed.isInbound ? parsed.from : parsed.to;
        const contactEmail = extractEmail(contactRaw) || contactRaw;
        const contactName = contactRaw.split('<')[0].trim().replace(/^["']|["']$/g, '') || contactEmail;

        let conversation = await db.conversation.findUnique({
          where: {
            channelConnectionId_contactIdentifier: {
              channelConnectionId,
              contactIdentifier: contactEmail,
            },
          },
        });

        if (!conversation) {
          let lead = await leadService.findMany(ctx, { where: { email: contactEmail }, take: 1 }).then((l) => l[0]);
          if (lead) lead = { id: lead.id };

          if (!lead && contactEmail?.includes('@')) {
            const newLead = await leadService.create(ctx, {
              businessName: contactName || contactEmail,
              contactPerson: contactName || undefined,
              email: contactEmail,
              source: 'email_sync',
            });
            lead = { id: newLead.id };
          }

          conversation = await conversationService.create(ctx, {
            channelConnection: { connect: { id: channelConnectionId } },
            ...(lead?.id && { lead: { connect: { id: lead.id } } }),
            contactName,
            contactIdentifier: contactEmail,
            status: 'ACTIVE',
            externalConversationId: msg.conversationId,
          } as any);
        } else if (!conversation.leadId) {
          const lead = await leadService.findMany(ctx, { where: { email: contactEmail }, take: 1 }).then((l) => l[0]);
          if (lead) {
            await conversationService.update(ctx, conversation.id, { leadId: lead.id });
            conversation.leadId = lead.id;
          }
        }

        const existing = await db.conversationMessage.findFirst({
          where: {
            conversationId: conversation.id,
            externalMessageId: msg.id,
          },
        });

        if (!existing) {
          await db.conversationMessage.create({
            data: {
              conversationId: conversation.id,
              userId,
              direction: parsed.isInbound ? 'INBOUND' : 'OUTBOUND',
              status: 'DELIVERED',
              content: `Subject: ${parsed.subject}\n\n${parsed.body}`,
              sentAt: parsed.date,
              deliveredAt: parsed.date,
              externalMessageId: msg.id,
              providerData: { conversationId: msg.conversationId },
            },
          });

          await conversationService.update(ctx, conversation.id, {
            lastMessageAt: parsed.date,
            lastMessagePreview: parsed.subject || parsed.body.substring(0, 100),
            ...(parsed.isInbound && { unreadCount: { increment: 1 } }),
          });

          syncedCount++;
        }
      }

      await db.channelConnection.update({
        where: { id: channelConnectionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncCursor: nextPageToken || connection.lastSyncCursor,
        },
      });

      return syncedCount;
    } catch (error: any) {
      console.error('Error syncing Outlook to database:', error);
      await db.channelConnection.update({
        where: { id: channelConnectionId },
        data: {
          status: 'ERROR',
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  async getEmailAddress(): Promise<string> {
    const profile = await this.fetchGraph<{ mail?: string; userPrincipalName?: string }>('/me?$select=mail,userPrincipalName');
    return profile.mail || profile.userPrincipalName || '';
  }
}
