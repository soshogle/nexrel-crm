
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagingProvider } from '@/lib/messaging';

// DELETE /api/messaging/channels/[id] - Disconnect a channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const provider = getMessagingProvider(session.user.id);
    await provider.disconnectChannel({ channelId: params.id });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting channel:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect channel' },
      { status: 500 }
    );
  }
}

// GET /api/messaging/channels/[id]/status - Get channel status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const provider = getMessagingProvider(session.user.id);
    const status = await provider.getChannelStatus({ channelId: params.id });
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching channel status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch channel status' },
      { status: 500 }
    );
  }
}
