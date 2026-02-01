import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Get calendar connection status
 * GET /api/calendar/status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.calendarConnection.findFirst({
      where: {
        userId: session.user.id,
        provider: 'GOOGLE',
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncEnabled: true,
        syncStatus: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      isConnected: !!connection,
      connection: connection || null,
    });
  } catch (error: any) {
    console.error('Error checking calendar status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check calendar status' },
      { status: 500 }
    );
  }
}
