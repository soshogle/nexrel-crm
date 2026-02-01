import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Check Meta connection status
 * GET /api/meta/status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for Meta credentials
    const metaSettings = await prisma.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: 'META',
      },
    });

    const hasCredentials = !!(metaSettings?.appId && metaSettings?.appSecret);

    // Check for active connection
    const connection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        providerType: 'META',
      },
      select: {
        id: true,
        displayName: true,
        channelIdentifier: true,
        status: true,
        expiresAt: true,
        metadata: true,
        createdAt: true,
      },
    });

    console.log('📊 Meta status check:', {
      hasCredentials,
      isConnected: !!connection,
    });

    return NextResponse.json({
      hasCredentials,
      isConnected: !!connection,
      connection: connection || null,
    });
  } catch (error: any) {
    console.error('❌ Meta status check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check Meta status' },
      { status: 500 }
    );
  }
}
