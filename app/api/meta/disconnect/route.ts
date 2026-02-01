import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Disconnect Meta account
 * DELETE /api/meta/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and delete the connection
    const connection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        providerType: 'META',
      },
    });

    if (!connection) {
      return NextResponse.json(
        { error: 'No Meta connection found' },
        { status: 404 }
      );
    }

    await prisma.channelConnection.delete({
      where: { id: connection.id },
    });

    console.log('✅ Meta connection disconnected for user:', session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Meta account disconnected successfully',
    });
  } catch (error: any) {
    console.error('❌ Meta disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Meta account' },
      { status: 500 }
    );
  }
}
