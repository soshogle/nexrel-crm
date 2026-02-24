
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagingProvider } from '@/lib/messaging';
import { apiErrors } from '@/lib/api-error';

// GET /api/messaging/conversations - Get all conversations

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }
    
    const searchParams = request.nextUrl.searchParams;
    const channelType = searchParams.get('channelType') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    const provider = getMessagingProvider(session.user.id, (session.user as { industry?: string }).industry);
    const conversations = await provider.getConversations({
      channelType: channelType as any,
      limit,
      offset,
    });
    
    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return apiErrors.internal('Failed to fetch conversations');
  }
}
