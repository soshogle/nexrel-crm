import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Disconnect Instagram Account
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Find and delete the Instagram connection
    const deleted = await prisma.channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
      },
    });

    if (deleted.count === 0) {
      return apiErrors.notFound('No Instagram connection found');
    }

    console.log('✅ Instagram disconnected for user:', session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Instagram account disconnected successfully',
    });
  } catch (error: any) {
    console.error('❌ Error disconnecting Instagram:', error);
    return apiErrors.internal(error.message || 'Failed to disconnect Instagram');
  }
}
