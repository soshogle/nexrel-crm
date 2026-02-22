import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { workflowEngine } from '@/lib/workflow-engine';
import { createDalContext } from '@/lib/context/industry-context';
import { conversationService } from '@/lib/dal/conversation-service';
import { leadService } from '@/lib/dal/lead-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Instagram Webhook Handler
 * Receives and processes incoming Instagram messages and events
 */

// Webhook verification (GET request)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Support both INSTAGRAM_VERIFY_TOKEN and FACEBOOK_VERIFY_TOKEN (fallback)
  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.FACEBOOK_VERIFY_TOKEN || 'soshogle_messenger_verify_token';

  console.log('Instagram webhook verification attempt:', {
    mode,
    receivedToken: token ? `${token.substring(0, 10)}...` : 'none',
    expectedToken: verifyToken ? `${verifyToken.substring(0, 10)}...` : 'none',
    challenge: challenge ? `${challenge.substring(0, 20)}...` : 'none',
    hasInstagramToken: !!process.env.INSTAGRAM_VERIFY_TOKEN,
    hasFacebookToken: !!process.env.FACEBOOK_VERIFY_TOKEN,
  });

  // Verify the webhook
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Instagram webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ Instagram webhook verification failed - token mismatch', {
    receivedToken: token,
    expectedToken: verifyToken,
    tokenMatch: token === verifyToken,
    mode,
  });
  
  return NextResponse.json({ 
    error: 'Forbidden',
    message: 'Webhook verification failed. Please check that INSTAGRAM_VERIFY_TOKEN or FACEBOOK_VERIFY_TOKEN matches the verify token in Facebook settings.',
    debug: process.env.NODE_ENV === 'development' ? {
      receivedMode: mode,
      receivedToken: token,
      expectedToken: verifyToken,
      tokenMatch: token === verifyToken,
      hasInstagramToken: !!process.env.INSTAGRAM_VERIFY_TOKEN,
      hasFacebookToken: !!process.env.FACEBOOK_VERIFY_TOKEN,
    } : undefined
  }, { status: 403 });
}

// Webhook event handler (POST request)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 Instagram webhook received:', JSON.stringify(body, null, 2));

    // Instagram sends events in this format
    if (body.object !== 'instagram') {
      return NextResponse.json({ received: true });
    }

    // Process each entry
    for (const entry of body.entry || []) {
      const changes = entry.changes || [];
      const messaging = entry.messaging || [];

      // Handle messaging events (direct messages)
      for (const event of messaging) {
        await handleMessagingEvent(event);
      }

      // Handle changes (e.g., mentions, comments)
      for (const change of changes) {
        console.log('🔄 Instagram change event:', change.field);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('❌ Instagram webhook processing error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle Instagram messaging events
 */
async function handleMessagingEvent(event: any) {
  try {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;
    const messageData = event.message;

    if (!senderId || !recipientId || !messageData) {
      console.log('⚠️ Incomplete Instagram message event');
      return;
    }

    // Find the channel connection by recipient ID (the Instagram account receiving the message)
    const connection = await prisma.channelConnection.findFirst({
      where: {
        channelType: 'INSTAGRAM',
        channelIdentifier: recipientId,
        status: 'CONNECTED',
      },
    });

    if (!connection) {
      console.log('❌ No Instagram connection found for recipient:', recipientId);
      return;
    }

    // Get sender info from Instagram Graph API if access token is available
    let senderName = senderId;
    if (connection.accessToken) {
      try {
        const userInfoResponse = await fetch(
          `https://graph.instagram.com/${senderId}?fields=id,username,name&access_token=${connection.accessToken}`
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          senderName = userInfo.name || userInfo.username || senderId;
        }
      } catch (error) {
        console.error('Error fetching sender info:', error);
      }
    }

    const ctx = createDalContext(connection.userId);
    let conversation = await conversationService.findFirst(ctx, {
      channelConnectionId: connection.id,
      contactIdentifier: senderId,
    });

    if (!conversation) {
      conversation = await conversationService.create(ctx, {
        channelConnectionId: connection.id,
        contactIdentifier: senderId,
        contactName: senderName,
        status: 'ACTIVE',
        lastMessageAt: new Date(),
      });
      console.log('✨ Created new Instagram conversation:', conversation.id);
    } else {
      await conversationService.update(ctx, conversation.id, {
        contactName: senderName,
        lastMessageAt: new Date(),
        status: 'ACTIVE',
      });
    }

    // Store the message
    const messageContent = messageData.text || messageData.attachments?.[0]?.payload?.url || '';
    
    const incomingMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: connection.userId,
        direction: 'INBOUND',
        content: messageContent,
        externalMessageId: messageData.mid,
        status: 'DELIVERED',
      },
    });

    await conversationService.update(ctx, conversation.id, {
      lastMessageAt: new Date(),
      lastMessagePreview: messageContent.substring(0, 100),
      unreadCount: { increment: 1 },
      status: 'UNREAD',
    });

    // Trigger workflows for MESSAGE_RECEIVED (with channel type filtering)
    workflowEngine.triggerWorkflow('MESSAGE_RECEIVED', {
      userId: connection.userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: senderName,
        messageContent,
        channelType: 'INSTAGRAM', // Explicitly set channel type for filtering
      },
    }, {
      messageContent,
    }).catch(err => console.error('Instagram workflow trigger failed:', err));

    // Trigger workflows for MESSAGE_WITH_KEYWORDS
    workflowEngine.triggerWorkflow('MESSAGE_WITH_KEYWORDS', {
      userId: connection.userId,
      conversationId: conversation.id,
      messageId: incomingMessage.id,
      leadId: conversation.leadId || undefined,
      variables: {
        contactName: senderName,
        messageContent,
        channelType: 'INSTAGRAM', // Explicitly set channel type for filtering
      },
    }, {
      messageContent,
    }).catch(err => console.error('Instagram keyword workflow trigger failed:', err));

    const leads = await leadService.findMany(ctx, { where: { phone: senderId }, take: 1 });
    if (leads.length === 0) {
      await leadService.create(ctx, {
        businessName: senderName,
        contactPerson: senderName,
        phone: senderId,
        source: 'Instagram DM',
        status: 'NEW',
      });
      console.log('✨ Created lead from Instagram message');
    }

    console.log('✅ Instagram message processed successfully');
  } catch (error) {
    console.error('❌ Error handling Instagram messaging event:', error);
  }
}
