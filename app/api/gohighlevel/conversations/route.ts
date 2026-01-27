import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { goHighLevelService } from '@/lib/gohighlevel-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gohighlevel/conversations
 * Fetch conversations from GoHighLevel
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as 'instagram' | 'facebook' | 'whatsapp' | 'sms' | undefined;
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const conversations = await goHighLevelService.getConversations({
      channel,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json({ conversations });
  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
