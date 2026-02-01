import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check Instagram Connection Status
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
        channelType: 'INSTAGRAM',
        status: 'CONNECTED',
      },
      select: {
        id: true,
        displayName: true,
        channelIdentifier: true,
        tokenExpiresAt: true,
        lastSyncedAt: true,
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    return NextResponse.json({
      isConnected: true,
      ...connection,
    });
  } catch (error: any) {
    console.error('❌ Error checking Instagram status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Instagram status' },
      { status: 500 }
    );
  }
}
