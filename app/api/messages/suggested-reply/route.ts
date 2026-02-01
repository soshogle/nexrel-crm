
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { aiResponseService } from '@/lib/ai-response-service';

/**
 * Generate suggested reply for human agents
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { conversationId, incomingMessage } = body;

    if (!conversationId || !incomingMessage) {
      return NextResponse.json(
        { error: 'conversationId and incomingMessage are required' },
        { status: 400 }
      );
    }

    // Get conversation details
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id,
      },
      include: {
        messages: {
          orderBy: { sentAt: 'desc' },
          take: 10,
        },
        channelConnection: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
      timestamp: msg.sentAt,
    }));

    const suggestedReply = await aiResponseService.generateSuggestedReply({
      conversationId: conversation.id,
      userId: user.id,
      incomingMessage,
      contactName: conversation.contactName,
      channelType: conversation.channelConnection.channelType,
      conversationHistory,
    });

    return NextResponse.json({ suggestedReply });
  } catch (error) {
    console.error('Failed to generate suggested reply:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggested reply' },
      { status: 500 }
    );
  }
}
