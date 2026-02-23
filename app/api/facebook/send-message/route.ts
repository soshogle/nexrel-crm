import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getCrmDb, conversationService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { facebookMessengerService } from '@/lib/facebook-messenger-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Send a message via Facebook Messenger
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { conversationId, message } = body;

    if (!conversationId || !message) {
      return apiErrors.badRequest('Missing conversationId or message');
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Get conversation details
    const conversation = await conversationService.findUnique(ctx, conversationId);

    if (!conversation || conversation.userId !== session.user.id) {
      return apiErrors.notFound('Conversation not found');
    }

    const { channelConnection } = conversation;
    if (!channelConnection) {
      return apiErrors.notFound('Channel connection not found');
    }

    if (channelConnection.channelType !== 'FACEBOOK_MESSENGER') {
      return apiErrors.badRequest('This conversation is not a Messenger conversation');
    }

    const pageId = channelConnection.channelIdentifier;
    const accessToken = channelConnection.accessToken;
    const recipientId = conversation.contactIdentifier;

    if (!pageId || !accessToken || !recipientId) {
      return apiErrors.badRequest('Missing required connection data');
    }

    // Send message via Facebook Messenger
    const result = await facebookMessengerService.sendMessage({
      pageId,
      recipientId,
      message,
      accessToken,
    });

    if (!result.success) {
      return apiErrors.internal(result.error || 'Failed to send message');
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
    return apiErrors.internal(error.message || 'Failed to send message');
  }
}
