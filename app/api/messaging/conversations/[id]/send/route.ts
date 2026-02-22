
/**
 * Send Message API Endpoint
 * Sends a message through the appropriate channel (Gmail, SMS, Facebook, Instagram, WhatsApp)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { GmailService } from '@/lib/messaging-sync/gmail-service';
import { TwilioService } from '@/lib/messaging-sync/twilio-service';
import { FacebookService } from '@/lib/messaging-sync/facebook-service';
import { InstagramService } from '@/lib/messaging-sync/instagram-service';
import { WhatsAppService } from '@/lib/messaging-sync/whatsapp-service';
import { facebookMessengerService } from '@/lib/facebook-messenger-service';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = params.id;
    const { message, attachmentUrl, subject } = await req.json();

    if (!message && !attachmentUrl) {
      return NextResponse.json(
        { error: 'Message or attachment required' },
        { status: 400 }
      );
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getCrmDb(ctx);
    // Get conversation with channel connection
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        channelConnection: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    if (conversation.userId !== ctx.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const connection = conversation.channelConnection;
    let externalMessageId: string | undefined;

    // Route to appropriate service based on channel type
    switch (connection.channelType) {
      case 'EMAIL':
        if (!connection.accessToken) {
          throw new Error('No access token for email');
        }
        const gmailService = new GmailService(
          connection.accessToken,
          connection.refreshToken || undefined
        );
        const threadId = conversation.metadata as any;
        externalMessageId = await gmailService.sendEmail({
          to: conversation.contactIdentifier,
          subject: subject || 'Re: Previous conversation',
          body: message,
          threadId: threadId?.threadId,
        });
        break;

      case 'SMS':
        const providerData = connection.providerData as any;
        if (!providerData?.accountSid || !providerData?.authToken) {
          throw new Error('Missing Twilio credentials');
        }
        if (!connection.channelIdentifier) {
          throw new Error('Missing channel identifier for SMS');
        }
        const twilioService = new TwilioService(
          providerData.accountSid,
          providerData.authToken,
          connection.channelIdentifier
        );
        externalMessageId = await twilioService.sendSMS({
          to: conversation.contactIdentifier,
          body: message,
          mediaUrl: attachmentUrl ? [attachmentUrl] : undefined,
        });
        break;

      case 'FACEBOOK_MESSENGER':
        if (!connection.accessToken) {
          throw new Error('No access token for Facebook');
        }
        // Use the new messenger service for direct messenger integration
        if (connection.channelIdentifier && conversation.contactIdentifier) {
          const result = await facebookMessengerService.sendMessage({
            pageId: connection.channelIdentifier,
            recipientId: conversation.contactIdentifier,
            message,
            accessToken: connection.accessToken,
          });
          if (!result.success) {
            throw new Error(result.error || 'Failed to send Messenger message');
          }
          externalMessageId = result.messageId;
        } else {
          // Fallback to old Facebook service if needed
          const facebookService = new FacebookService(
            connection.accessToken,
            connection.providerAccountId!
          );
          externalMessageId = await facebookService.sendMessage({
            recipientId: conversation.contactIdentifier,
            message,
            attachmentUrl,
          });
        }
        break;

      case 'INSTAGRAM':
        if (!connection.accessToken) {
          throw new Error('No access token for Instagram');
        }
        const instagramService = new InstagramService(
          connection.accessToken,
          connection.providerAccountId!
        );
        externalMessageId = await instagramService.sendMessage({
          recipientId: conversation.contactIdentifier,
          message,
          attachmentUrl,
        });
        break;

      case 'WHATSAPP':
        if (!connection.accessToken) {
          throw new Error('No access token for WhatsApp');
        }
        const whatsappProviderData = connection.providerData as any;
        const whatsappService = new WhatsAppService(
          connection.accessToken,
          connection.providerAccountId!,
          whatsappProviderData?.businessAccountId
        );
        externalMessageId = await whatsappService.sendMessage({
          to: conversation.contactIdentifier,
          message,
          mediaUrl: attachmentUrl,
        });
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported channel type: ${connection.channelType}` },
          { status: 400 }
        );
    }

    // Save outbound message to database
    const savedMessage = await db.conversationMessage.create({
      data: {
        conversationId,
        userId: ctx.userId,
        direction: 'OUTBOUND',
        status: 'SENT',
        content: message,
        sentAt: new Date(),
        externalMessageId,
      },
    });

    // Update conversation
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: message.substring(0, 100),
      },
    });

    return NextResponse.json({
      success: true,
      message: savedMessage,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
