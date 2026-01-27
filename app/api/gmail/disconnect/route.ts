import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Disconnect Gmail account
 * DELETE /api/gmail/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      return NextResponse.json(
        { error: 'No Gmail connection found' },
        { status: 404 }
      );
    }

    console.log(`✅ Gmail disconnected for user: ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Gmail disconnected successfully',
    });
  } catch (error: any) {
    console.error('Error disconnecting Gmail:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Gmail' },
      { status: 500 }
    );
  }
}
