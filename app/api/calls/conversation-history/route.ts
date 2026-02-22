import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, conversationService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';

/**
 * Get call history for a specific phone number or conversation
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phoneNumber');
    const conversationId = searchParams.get('conversationId');

    if (!phoneNumber && !conversationId) {
      return NextResponse.json({ error: 'Phone number or conversation ID required' }, { status: 400 });
    }

    let calls: any[] = [];

    const ctx = getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (conversationId) {
      // Get conversation to find contact identifier
      const conversation = await conversationService.findUnique(ctx, conversationId);

      if (!conversation) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }

      // Find calls for this contact
      const db = getCrmDb(ctx);
      calls = await db.callLog.findMany({
        where: {
          userId: ctx.userId,
          OR: [
            { fromNumber: conversation.contactIdentifier },
            { toNumber: conversation.contactIdentifier }
          ]
        },
        include: {
          voiceAgent: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    } else if (phoneNumber) {
      // Find calls for this phone number
      const db = getCrmDb(ctx);
      calls = await db.callLog.findMany({
        where: {
          userId: ctx.userId,
          OR: [
            { fromNumber: phoneNumber },
            { toNumber: phoneNumber }
          ]
        },
        include: {
          voiceAgent: {
            select: {
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
    }

    return NextResponse.json({ calls });
  } catch (error: any) {
    console.error('Error fetching call history:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch call history' },
      { status: 500 }
    );
  }
}
