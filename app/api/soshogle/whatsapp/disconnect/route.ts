import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Disconnect WhatsApp Business account
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all WhatsApp connections for this user
    await prisma.channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: 'WHATSAPP',
      },
    });

    console.log(`🗑️ WhatsApp Business disconnected for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business account disconnected successfully',
    });
  } catch (error: any) {
    console.error('WhatsApp disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect WhatsApp Business' },
      { status: 500 }
    );
  }
}
