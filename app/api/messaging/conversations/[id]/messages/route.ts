
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagingProvider } from '@/lib/messaging';
import { apiErrors } from '@/lib/api-error';

// GET /api/messaging/conversations/[id]/messages - Get messages for a conversation

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }
    
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const provider = getMessagingProvider(session.user.id, (session.user as { industry?: string }).industry);
    const messages = await provider.getMessages({
      conversationId: params.id,
      limit,
      offset,
    });
    
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return apiErrors.internal('Failed to fetch messages');
  }
}

// POST /api/messaging/conversations/[id]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }
    
    const body = await request.json();
    const { content, attachments } = body;
    
    if (!content || content.trim() === '') {
      return apiErrors.badRequest('Message content is required');
    }
    
    // Get conversation details
    const { getCrmDb } = await import('@/lib/dal');
    const { getDalContextFromSession } = await import('@/lib/context/industry-context');
    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);
    const conversation = await db.conversation.findFirst({
      where: {
        id: params.id,
        userId: ctx.userId,
      },
      include: {
        channelConnection: true,
      },
    });
    
    if (!conversation) {
      return apiErrors.notFound('Conversation not found');
    }
    
    const provider = getMessagingProvider(session.user.id, (session.user as { industry?: string }).industry);
    const result = await provider.sendMessage({
      channelType: conversation.channelConnection.channelType as any,
      to: conversation.contactIdentifier,
      content: content.trim(),
      attachments,
    });
    
    if (result.status === 'FAILED') {
      return apiErrors.internal(result.error || 'Failed to send message');
    }
    
    return NextResponse.json({ 
      success: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return apiErrors.internal('Failed to send message');
  }
}
