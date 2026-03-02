import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';
import { resolveDalContext } from '@/lib/context/industry-context';
import { conversationService } from '@/lib/dal/conversation-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Facebook Messenger Webhook Endpoint
 * Receives incoming messages from Facebook Messenger
 */

// GET - Webhook verification (Facebook requires this)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'soshogle_messenger_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Facebook webhook verified');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Facebook webhook verification failed');
    return apiErrors.forbidden('Verification failed');
  }
}

// POST - Receive incoming messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 Incoming Messenger webhook:', JSON.stringify(body, null, 2));

    // Facebook sends test events - ignore them
    if (body.object !== 'page') {
      return NextResponse.json({ received: true });
    }

    // Process each messaging event
    for (const entry of body.entry || []) {
      for (const messagingEvent of entry.messaging || []) {
        await processMessagingEvent(messagingEvent, entry.id);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Error processing Messenger webhook:', error);
    return apiErrors.internal(error.message);
  }
}

async function processMessagingEvent(event: any, pageId: string) {
  try {
    // Extract message data
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageData = event.message;
    const timestamp = event.timestamp;

    if (!senderId || !messageData) {
      console.log('⚠️ Skipping event without sender or message');
      return;
    }

    console.log(`📧 Processing message from ${senderId} to page ${pageId}`);

    // Find the channel connection for this page
    const channelConnection: any = await prisma.channelConnection.findFirst({
      where: {
        providerType: 'FACEBOOK',
        channelType: 'FACEBOOK_MESSENGER',
        channelIdentifier: pageId,
        status: 'CONNECTED',
      },
    } as any);

    if (!channelConnection) {
      console.error(`❌ No active Messenger connection found for page ${pageId}`);
      return;
    }

    console.log(`✅ Found channel connection for user: ${channelConnection.userId}`);

    // Get or create sender profile
    const senderProfile = await getSenderProfile(senderId, channelConnection.accessToken!);
    const senderName = senderProfile?.name || `Messenger User ${senderId}`;

    const ctx = await resolveDalContext(channelConnection.userId);
    let conversation: any = await conversationService.findFirst(ctx, {
      channelConnectionId: channelConnection.id,
      contactIdentifier: senderId,
    });

    if (!conversation) {
      console.log(`📝 Creating new Messenger conversation for ${senderName}`);
      conversation = await conversationService.create(ctx, {
        channelConnectionId: channelConnection.id,
        contactName: senderName,
        contactIdentifier: senderId,
        externalConversationId: senderId,
        status: 'ACTIVE',
      } as any);
    }

    // Save the message
    const messageText = messageData.text || '[Attachment]';
    const messageId = messageData.mid;

    const incomingMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: channelConnection.userId,
        externalMessageId: messageId,
        content: messageText,
        direction: 'INBOUND',
        status: 'DELIVERED',
        providerData: {
          attachments: messageData.attachments || [],
          timestamp,
        },
      },
    });

    await conversationService.update(ctx, conversation.id, {
      lastMessageAt: new Date(),
      lastMessagePreview: messageText.substring(0, 100),
      unreadCount: { increment: 1 },
      status: 'UNREAD',
    } as any);

    // Trigger workflows for MESSAGE_RECEIVED (with channel type filtering)
    workflowEngine.triggerWorkflow('MESSAGE_RECEIVED', {
      userId: channelConnection.userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: senderName,
        messageContent: messageText,
        channelType: 'FACEBOOK_MESSENGER', // Explicitly set channel type for filtering
      },
    }, {
      messageContent: messageText,
    }).catch(err => console.error('Messenger workflow trigger failed:', err));

    // Trigger workflows for MESSAGE_WITH_KEYWORDS
    workflowEngine.triggerWorkflow('MESSAGE_WITH_KEYWORDS', {
      userId: channelConnection.userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: senderName,
        messageContent: messageText,
        channelType: 'FACEBOOK_MESSENGER', // Explicitly set channel type for filtering
      },
    }, {
      messageContent: messageText,
    }).catch(err => console.error('Messenger keyword workflow trigger failed:', err));

    console.log(`✅ Saved Messenger message from ${senderName}`);
  } catch (error: any) {
    console.error('❌ Error processing messaging event:', error);
  }
}

async function getSenderProfile(senderId: string, accessToken: string): Promise<{ name: string } | null> {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${senderId}?fields=name&access_token=${accessToken}`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch sender profile:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching sender profile:', error);
    return null;
  }
}
