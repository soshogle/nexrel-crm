import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/soshogle/stats - Get social media messaging statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total connections
    const totalConnections = await prisma.channelConnection.count({
      where: {
        userId: session.user.id,
        channelType: {
          in: ['INSTAGRAM', 'FACEBOOK_MESSENGER', 'WHATSAPP'],
        },
        providerType: {
          in: ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'],
        },
      },
    });

    // Get active connections
    const activeConnections = await prisma.channelConnection.count({
      where: {
        userId: session.user.id,
        channelType: {
          in: ['INSTAGRAM', 'FACEBOOK_MESSENGER', 'WHATSAPP'],
        },
        providerType: {
          in: ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'],
        },
        status: 'CONNECTED',
        isActive: true,
      },
    });

    // Get channel connection IDs for social media
    const socialChannels = await prisma.channelConnection.findMany({
      where: {
        userId: session.user.id,
        channelType: {
          in: ['INSTAGRAM', 'FACEBOOK_MESSENGER', 'WHATSAPP'],
        },
      },
      select: {
        id: true,
      },
    });

    const channelIds = socialChannels.map(ch => ch.id);

    // Get message counts from conversations
    let messagesReceived = 0;
    let messagesSent = 0;

    if (channelIds.length > 0) {
      const messages = await prisma.conversationMessage.findMany({
        where: {
          conversation: {
            channelConnectionId: {
              in: channelIds,
            },
          },
        },
        select: {
          direction: true,
        },
      });

      messages.forEach((msg) => {
        if (msg.direction === 'INBOUND') {
          messagesReceived++;
        } else if (msg.direction === 'OUTBOUND') {
          messagesSent++;
        }
      });
    }

    return NextResponse.json({
      totalConnections,
      activeConnections,
      messagesReceived,
      messagesSent,
    });
  } catch (error: any) {
    console.error('Error fetching social media stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
