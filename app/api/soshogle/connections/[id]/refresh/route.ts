import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/soshogle/connections/[id]/refresh - Refresh connection status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id: params.id },
    });

    if (!connection) {
      return apiErrors.notFound('Connection not found');
    }

    if (connection.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Update last synced timestamp
    await prisma.channelConnection.update({
      where: { id: params.id },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error refreshing connection:', error);
    return apiErrors.internal('Failed to refresh connection');
  }
}
