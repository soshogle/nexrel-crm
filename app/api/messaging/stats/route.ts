import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/messaging/stats - Channel activity stats (connections, messages) from CRM DB
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);

    const totalConnections = await db.channelConnection.count({
      where: { userId: ctx.userId },
    });

    const activeConnections = await db.channelConnection.count({
      where: {
        userId: ctx.userId,
        status: 'CONNECTED',
      },
    });

    const channelIds = (
      await db.channelConnection.findMany({
        where: { userId: ctx.userId },
        select: { id: true },
      })
    ).map((ch) => ch.id);

    let messagesReceived = 0;
    let messagesSent = 0;

    if (channelIds.length > 0) {
      const messages = await db.conversationMessage.findMany({
        where: {
          conversation: {
            channelConnectionId: { in: channelIds },
          },
        },
        select: { direction: true },
      });
      messages.forEach((msg) => {
        if (msg.direction === 'INBOUND') messagesReceived++;
        else if (msg.direction === 'OUTBOUND') messagesSent++;
      });
    }

    return NextResponse.json({
      totalConnections,
      activeConnections,
      messagesReceived,
      messagesSent,
    });
  } catch (error: unknown) {
    console.error('Error fetching messaging stats:', error);
    return apiErrors.internal('Failed to fetch statistics');
  }
}
