
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getMessagingProvider } from '@/lib/messaging';

// GET /api/messaging/channels - Get all connected channels

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const channels = await prisma.channelConnection.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return NextResponse.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channels' },
      { status: 500 }
    );
  }
}

// POST /api/messaging/channels - Connect a new channel
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { channelType, credentials } = body;
    
    if (!channelType) {
      return NextResponse.json({ error: 'Channel type is required' }, { status: 400 });
    }
    
    const provider = getMessagingProvider(session.user.id);
    const result = await provider.connectChannel({
      channelType,
      credentials,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to connect channel' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true,
      channelId: result.channelId,
    });
  } catch (error) {
    console.error('Error connecting channel:', error);
    return NextResponse.json(
      { error: 'Failed to connect channel' },
      { status: 500 }
    );
  }
}
