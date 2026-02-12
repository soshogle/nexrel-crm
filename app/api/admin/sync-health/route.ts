/**
 * GET /api/admin/sync-health - Sync health dashboard data
 * Returns connection status, last sync times, error counts
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const connections = await prisma.channelConnection.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        channelType: true,
        providerType: true,
        displayName: true,
        status: true,
        lastSyncAt: true,
        lastSyncCursor: true,
        errorMessage: true,
        syncEnabled: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      total: connections.length,
      connected: connections.filter((c) => c.status === 'CONNECTED').length,
      errors: connections.filter((c) => c.status === 'ERROR').length,
      syncEnabled: connections.filter((c) => c.syncEnabled).length,
    };

    return NextResponse.json({
      connections: connections.map((c) => ({
        ...c,
        lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
      })),
      stats,
    });
  } catch (error: any) {
    console.error('Sync health error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch sync health' },
      { status: 500 }
    );
  }
}
