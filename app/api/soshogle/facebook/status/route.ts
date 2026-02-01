import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check Facebook Messenger connection status
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
        channelType: 'FACEBOOK_MESSENGER',
        status: 'CONNECTED',
      },
      select: {
        id: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        syncEnabled: true,
        providerData: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    // Check if token is expired
    const isExpired = connection.expiresAt && new Date(connection.expiresAt) < new Date();

    return NextResponse.json({
      isConnected: !isExpired,
      connection: {
        ...connection,
        pageName: connection.displayName || 'Facebook Page',
      },
      needsRefresh: isExpired,
    });
  } catch (error: any) {
    console.error('Facebook status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Facebook status' },
      { status: 500 }
    );
  }
}
