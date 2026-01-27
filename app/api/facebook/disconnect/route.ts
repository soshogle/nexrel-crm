import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Disconnects Facebook Messenger
 * DELETE /api/facebook/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete Facebook connection
    await prisma.channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: 'FACEBOOK_MESSENGER',
        providerType: 'FACEBOOK',
      },
    });

    console.log('📤 Facebook Messenger disconnected for user:', session.user.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Facebook Messenger disconnected successfully' 
    });
  } catch (error: any) {
    console.error('Error disconnecting Facebook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect Facebook' },
      { status: 500 }
    );
  }
}
