import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { goHighLevelService } from '@/lib/gohighlevel-service';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gohighlevel/messages
 * Get messages for a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    const limit = searchParams.get('limit');
    const before = searchParams.get('before');

    const messages = await goHighLevelService.getMessages(conversationId, {
      limit: limit ? parseInt(limit) : undefined,
      before: before || undefined,
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/gohighlevel/messages
 * Send a message through GoHighLevel
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, contactId, channel, type, message, mediaUrl } = body;

    // Validation
    if (!conversationId && !contactId) {
      return NextResponse.json(
        { error: 'Either conversationId or contactId is required' },
        { status: 400 }
      );
    }

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    if (contactId && !channel) {
      return NextResponse.json(
        { error: 'channel is required when using contactId' },
        { status: 400 }
      );
    }

    // Send message through GoHighLevel
    const result = await goHighLevelService.sendMessage({
      conversationId,
      contactId,
      channel,
      type: type || 'text',
      body: message,
      mediaUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 400 }
      );
    }

    // Store message in local database for audit trail
    try {
      if (conversationId || contactId) {
        // Find conversation by external ID
        const localConversation = await prisma.conversation.findFirst({
          where: {
            externalConversationId: conversationId,
          },
        });

        if (localConversation) {
          // Update last message time
          await prisma.conversation.update({
            where: { id: localConversation.id },
            data: {
              lastMessageAt: new Date(),
              lastMessagePreview: message.substring(0, 100),
            },
          });

          // Store message
          await prisma.conversationMessage.create({
            data: {
              conversationId: localConversation.id,
              userId: session.user.id,
              content: message,
              direction: 'OUTBOUND',
              status: 'SENT',
              externalMessageId: result.messageId,
              providerData: {
                source: 'gohighlevel',
                messageId: result.messageId,
                channel,
              },
            },
          });
        } else {
          console.log('⚠️ No local conversation found, skipping message storage');
        }
      }
    } catch (dbError) {
      console.error('Error storing message in local DB:', dbError);
      // Don't fail the request if local storage fails
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
