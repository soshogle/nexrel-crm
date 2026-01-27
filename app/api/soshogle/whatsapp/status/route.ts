import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Check WhatsApp Business connection status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'WHATSAPP',
        status: 'CONNECTED',
      },
      select: {
        id: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        providerAccountId: true,
        createdAt: true,
        syncEnabled: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    return NextResponse.json({
      isConnected: true,
      connection: {
        ...connection,
        phoneNumber: connection.displayName || 'WhatsApp Business',
      },
    });
  } catch (error: any) {
    console.error('WhatsApp status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check WhatsApp status' },
      { status: 500 }
    );
  }
}
