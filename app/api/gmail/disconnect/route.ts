import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Disconnect Gmail account
 * DELETE /api/gmail/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Delete the Gmail connection
    const result = await prisma.channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: 'EMAIL',
        providerType: 'GMAIL',
      },
    });

    if (result.count === 0) {
      return apiErrors.notFound('No Gmail connection found');
    }

    console.log(`✅ Gmail disconnected for user: ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting Gmail:', error);
    return apiErrors.internal(error.message || 'Failed to disconnect Gmail');
  }
}
