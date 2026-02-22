import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb, conversationService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { facebookMessengerService } from '@/lib/facebook-messenger-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Send a message via Facebook Messenger
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'Missing conversationId or message' },
        { status: 400 }
      );
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get conversation details
    const conversation = await conversationService.findUnique(ctx, conversationId);

    if (!conversation || conversation.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const { channelConnection } = conversation;
    if (!channelConnection) {
      return NextResponse.json(
        { error: 'Channel connection not found' },
        { status: 404 }
      );
    }

    if (channelConnection.channelType !== 'FACEBOOK_MESSENGER') {
      return NextResponse.json(
        { error: 'This conversation is not a Messenger conversation' },
        { status: 400 }
      );
    }

    const pageId = channelConnection.channelIdentifier;
    const accessToken = channelConnection.accessToken;
    const recipientId = conversation.contactIdentifier;

    if (!pageId || !accessToken || !recipientId) {
      return NextResponse.json(
        { error: 'Missing required connection data' },
        { status: 400 }
      );
    }

    // Send message via Facebook Messenger
    const result = await facebookMessengerService.sendMessage({
      pageId,
      recipientId,
      message,
      accessToken,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Save outbound message to database
    const savedMessage = await getCrmDb(ctx).conversationMessage.create({
      data: {
        conversationId,
        userId: ctx.userId,
        externalMessageId: result.messageId || `temp-${Date.now()}`,
        content: message,
        direction: 'OUTBOUND',
        status: 'SENT',
      },
    });

    return NextResponse.json({
      success: true,
      message: savedMessage,
    });
  } catch (error: any) {
    console.error('❌ Error sending Messenger message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
