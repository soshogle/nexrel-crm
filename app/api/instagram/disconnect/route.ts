import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Disconnect Instagram Account
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find and delete the Instagram connection
    const deleted = await prisma.channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'No Instagram connection found' },
        { status: 404 }
      );
    }

    console.log('✅ Instagram disconnected for user:', session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Instagram account disconnected successfully',
    });
  } catch (error: any) {
    console.error('❌ Error disconnecting Instagram:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Instagram' },
      { status: 500 }
    );
  }
}
