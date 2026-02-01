import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Send Instagram Direct Message
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId, message, conversationId } = body;

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: 'Missing recipientId or message' },
        { status: 400 }
      );
    }

    // Get Instagram connection
    const connection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        status: 'CONNECTED',
      },
    });

    if (!connection || !connection.accessToken) {
      return NextResponse.json(
        { error: 'Instagram not connected. Please connect your Instagram account first.' },
        { status: 400 }
      );
    }

    // Send message via Instagram Graph API
    const instagramResponse = await fetch(
      `https://graph.instagram.com/v18.0/me/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${connection.accessToken}`,
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId,
          },
          message: {
            text: message,
          },
        }),
      }
    );

    if (!instagramResponse.ok) {
      const errorData = await instagramResponse.json();
      console.error('❌ Instagram send error:', errorData);
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to send message' },
        { status: instagramResponse.status }
      );
    }

    const responseData = await instagramResponse.json();

    // Create or update conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
    }

    if (!conversation) {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          channelConnectionId: connection.id,
          contactIdentifier: recipientId,
          contactName: recipientId, // Will be updated with actual name from Instagram
          status: 'ACTIVE',
          lastMessageAt: new Date(),
        },
      });
    } else {
      // Update existing conversation
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    // Store message in database
    const conversationMessage = await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        userId: session.user.id,
        direction: 'OUTBOUND',
        content: message,
        externalMessageId: responseData.message_id,
        status: 'SENT',
      },
    });

    console.log('✅ Instagram message sent:', responseData.message_id);

    return NextResponse.json({
      success: true,
      messageId: responseData.message_id,
      conversationId: conversation.id,
      message: conversationMessage,
    });
  } catch (error: any) {
    console.error('❌ Error sending Instagram message:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send message' },
      { status: 500 }
    );
  }
}
