import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagingProvider } from '@/lib/messaging';
import { getCrmDb, conversationService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

// GET /api/messaging/conversations/[id] - Get conversation details

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getCrmDb(ctx);
    const conversation = await db.conversation.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        channelConnection: true,
        lead: true,
      },
    });
    
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    
    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// PATCH /api/messaging/conversations/[id] - Update conversation (mark as read, archive, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { status, markAsRead } = body;
    
    const provider = getMessagingProvider(session.user.id);
    
    // Mark as read if requested
    if (markAsRead) {
      await provider.markAsRead({ conversationId: params.id });
    }
    
    // Update conversation status
    if (status) {
      const ctx = getDalContextFromSession(session);
      if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      await conversationService.update(ctx, params.id, { status });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    );
  }
}
