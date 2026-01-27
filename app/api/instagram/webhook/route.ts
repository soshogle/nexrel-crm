import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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

  console.log('Instagram webhook verification attempt:', {
    mode,
    receivedToken: token ? `${token.substring(0, 10)}...` : 'none',
    expectedToken: process.env.INSTAGRAM_VERIFY_TOKEN ? `${process.env.INSTAGRAM_VERIFY_TOKEN.substring(0, 10)}...` : 'none',
    challenge: challenge ? `${challenge.substring(0, 20)}...` : 'none',
  });

  // Verify the webhook
  if (mode === 'subscribe' && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    console.log('✅ Instagram webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('❌ Instagram webhook verification failed - token mismatch');
  return NextResponse.json({ 
    error: 'Forbidden',
    debug: process.env.NODE_ENV === 'development' ? {
      receivedMode: mode,
      tokenMatch: token === process.env.INSTAGRAM_VERIFY_TOKEN,
      hasExpectedToken: !!process.env.INSTAGRAM_VERIFY_TOKEN,
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

    // Find or create conversation
    let conversation = await prisma.conversation.findFirst({
      where: {
        userId: connection.userId,
        channelConnectionId: connection.id,
        contactIdentifier: senderId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: connection.userId,
          channelConnectionId: connection.id,
          contactIdentifier: senderId,
          contactName: senderName,
          status: 'ACTIVE',
          lastMessageAt: new Date(),
        },
      });
      console.log('✨ Created new Instagram conversation:', conversation.id);
    } else {
      // Update conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          contactName: senderName,
          lastMessageAt: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    // Store the message
    const messageContent = messageData.text || messageData.attachments?.[0]?.payload?.url || '';
    
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: connection.userId,
        direction: 'INBOUND',
        content: messageContent,
        externalMessageId: messageData.mid,
        status: 'DELIVERED',
      },
    });

    // Create or update lead
    const existingLead = await prisma.lead.findFirst({
      where: {
        userId: connection.userId,
        phone: senderId,
      },
    });

    if (!existingLead) {
      await prisma.lead.create({
        data: {
          userId: connection.userId,
          businessName: senderName,
          contactPerson: senderName,
          phone: senderId,
          source: 'Instagram DM',
          status: 'NEW',
        },
      });
      console.log('✨ Created lead from Instagram message');
    }

    console.log('✅ Instagram message processed successfully');
  } catch (error) {
    console.error('❌ Error handling Instagram messaging event:', error);
  }
}
