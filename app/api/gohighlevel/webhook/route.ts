import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { goHighLevelService } from '@/lib/gohighlevel-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gohighlevel/webhook
 * Handle incoming webhooks from GoHighLevel
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📨 GoHighLevel webhook received:', JSON.stringify(body, null, 2));

    const { type, locationId, contactId, conversationId, message } = body;

    // Validate webhook
    if (!type || !locationId) {
      console.error('❌ Invalid webhook payload');
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Handle different webhook types
    switch (type) {
      case 'InboundMessage':
      case 'inbound_message':
        await handleInboundMessage(body);
        break;

      case 'MessageStatus':
      case 'message_status':
        await handleMessageStatus(body);
        break;

      case 'ConversationUpdate':
      case 'conversation_update':
        await handleConversationUpdate(body);
        break;

      default:
        console.log(`ℹ️ Unhandled webhook type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error processing GoHighLevel webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Get or create a ChannelConnection for GoHighLevel
 */
async function getOrCreateGHLChannelConnection(
  userId: string,
  channel: string
): Promise<string> {
  const channelTypeMap: Record<string, string> = {
    instagram: 'INSTAGRAM_DM',
    facebook: 'FACEBOOK_MESSENGER',
    whatsapp: 'WHATSAPP',
    sms: 'SMS',
  };

  const channelType = channelTypeMap[channel?.toLowerCase()] || 'DIRECT';

  // Try to find existing connection
  let connection = await prisma.channelConnection.findFirst({
    where: {
      userId,
      channelType: channelType as any,
      providerType: 'gohighlevel',
    },
  });

  // Create if doesn't exist
  if (!connection) {
    connection = await prisma.channelConnection.create({
      data: {
        userId,
        channelType: channelType as any,
        providerType: 'gohighlevel',
        displayName: `GoHighLevel ${channel}`,
        status: 'CONNECTED',
        isActive: true,
        syncEnabled: true,
        providerData: {
          source: 'gohighlevel',
          channel,
        },
      },
    });
  } else {
    // Update existing connection
    connection = await prisma.channelConnection.update({
      where: { id: connection.id },
      data: {
        status: 'CONNECTED',
        isActive: true,
        lastSyncAt: new Date(),
      },
    });
  }

  return connection.id;
}

/**
 * Handle inbound message webhook
 */
async function handleInboundMessage(data: any) {
  try {
    const { contactId, conversationId, message, channel } = data;

    if (!message) {
      console.error('❌ No message in inbound webhook');
      return;
    }

    console.log(`📬 Processing inbound message from ${channel}: ${contactId}`);

    // Get or create contact in GoHighLevel
    const contact = await goHighLevelService.getContact({ contactId });

    // Find the user who owns this GoHighLevel location
    // For now, we'll use the first admin user (update this based on your needs)
    const user = await prisma.user.findFirst({
      where: { role: 'BUSINESS_OWNER' },
    });

    if (!user) {
      console.error('❌ No business owner found');
      return;
    }

    // Get or create channel connection
    const channelConnectionId = await getOrCreateGHLChannelConnection(user.id, channel);

    // Find or create lead
    let lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { email: contact?.email || undefined },
          { phone: contact?.phone || undefined },
        ],
        userId: user.id,
      },
    });

    if (!lead && (contact?.email || contact?.phone)) {
      lead = await prisma.lead.create({
        data: {
          userId: user.id,
          businessName: contact.name || 'Unknown',
          contactPerson: contact.name || 'Unknown',
          email: contact.email,
          phone: contact.phone,
          source: `GoHighLevel ${channel}`,
          status: 'NEW',
        },
      });
      console.log(`✅ Created new lead: ${lead.id}`);
    }

    // Find or create conversation
    const conversation = await prisma.conversation.upsert({
      where: {
        channelConnectionId_contactIdentifier: {
          channelConnectionId,
          contactIdentifier: contactId,
        },
      },
      create: {
        channelConnectionId,
        userId: user.id,
        leadId: lead?.id,
        contactName: contact?.name || 'Unknown',
        contactIdentifier: contactId,
        contactAvatar: contact?.customFields?.avatar,
        status: 'ACTIVE',
        lastMessageAt: new Date(),
        externalConversationId: conversationId,
        metadata: {
          source: 'gohighlevel',
          channel,
          contactId,
        },
      },
      update: {
        lastMessageAt: new Date(),
        externalConversationId: conversationId,
        metadata: {
          source: 'gohighlevel',
          channel,
          contactId,
        },
      },
    });

    // Store the message
    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: user.id,
        content: message.body || message.text || '',
        direction: 'INBOUND',
        status: 'DELIVERED',
        externalMessageId: message.id,
        providerData: {
          source: 'gohighlevel',
          channel,
          messageId: message.id,
          type: message.type,
          mediaUrl: message.mediaUrl,
        },
      },
    });

    console.log(`✅ Stored inbound message for conversation: ${conversation.id}`);
  } catch (error) {
    console.error('Error handling inbound message:', error);
    throw error;
  }
}

/**
 * Handle message status update
 */
async function handleMessageStatus(data: any) {
  try {
    const { messageId, status } = data;

    console.log(`📊 Message status update: ${messageId} -> ${status}`);

    // Update message status in local database
    const message = await prisma.conversationMessage.findFirst({
      where: {
        externalMessageId: messageId,
      },
    });

    if (message) {
      const mappedStatus = mapMessageStatus(status);
      const updateData: any = {
        status: mappedStatus,
      };

      // Update delivered/read timestamps
      if (mappedStatus === 'DELIVERED' && !message.deliveredAt) {
        updateData.deliveredAt = new Date();
      } else if (mappedStatus === 'READ' && !message.readAt) {
        updateData.readAt = new Date();
      }

      await prisma.conversationMessage.update({
        where: { id: message.id },
        data: updateData,
      });
      console.log(`✅ Updated message status: ${message.id}`);
    }
  } catch (error) {
    console.error('Error handling message status:', error);
  }
}

/**
 * Handle conversation update
 */
async function handleConversationUpdate(data: any) {
  try {
    const { conversationId, status } = data;

    console.log(`💬 Conversation update: ${conversationId} -> ${status}`);

    // Update conversation in local database
    await prisma.conversation.updateMany({
      where: {
        externalConversationId: conversationId,
      },
      data: {
        status: status === 'closed' ? 'ARCHIVED' : 'ACTIVE',
      },
    });

    console.log(`✅ Updated conversation: ${conversationId}`);
  } catch (error) {
    console.error('Error handling conversation update:', error);
  }
}

/**
 * Map GoHighLevel message status to our status
 */
function mapMessageStatus(status: string): 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' {
  const mapping: Record<string, 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
    sending: 'SENDING',
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED',
  };
  return mapping[status?.toLowerCase()] || 'SENT';
}

/**
 * GET /api/gohighlevel/webhook
 * Webhook verification endpoint
 */
export async function GET(request: NextRequest) {
  // Some webhook systems require GET verification
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'active',
    message: 'GoHighLevel webhook endpoint is ready',
  });
}
