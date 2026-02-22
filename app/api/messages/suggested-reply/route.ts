import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { conversationService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
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

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { conversationId, incomingMessage } = body;

    if (!conversationId || !incomingMessage) {
      return NextResponse.json(
        { error: 'conversationId and incomingMessage are required' },
        { status: 400 }
      );
    }

    // Get conversation details
    const conversation = await conversationService.findUnique(ctx, conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const sortedMessages = (conversation.messages || []).sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()).slice(0, 10);
    const conversationHistory = sortedMessages.map((msg) => ({
      role: msg.direction === 'INBOUND' ? ('user' as const) : ('assistant' as const),
      content: msg.content,
      timestamp: msg.sentAt,
    }));

    const suggestedReply = await aiResponseService.generateSuggestedReply({
      conversationId: conversation.id,
      userId: user.id,
      incomingMessage,
      contactName: conversation.contactName,
      channelType: (conversation as any).channelConnection?.channelType,
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
