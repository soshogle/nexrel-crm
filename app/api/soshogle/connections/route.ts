import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/soshogle/connections - List all social media connections
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connections = await prisma.channelConnection.findMany({
      where: {
        userId: session.user.id,
        channelType: {
          in: ['INSTAGRAM', 'FACEBOOK_MESSENGER', 'WHATSAPP'],
        },
        providerType: {
          in: ['INSTAGRAM', 'FACEBOOK', 'WHATSAPP'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ connections });
  } catch (error: any) {
    console.error('Error fetching social media connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
