
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMessagingProvider } from '@/lib/messaging';
import { apiErrors } from '@/lib/api-error';

// DELETE /api/messaging/channels/[id] - Disconnect a channel

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return apiErrors.unauthorized();
    }
    
    const provider = getMessagingProvider(session.user.id, (session.user as { industry?: string }).industry);
    await provider.disconnectChannel({ channelId: params.id });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting channel:', error);
    return apiErrors.internal('Failed to disconnect channel');
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
      return apiErrors.unauthorized();
    }
    
    const provider = getMessagingProvider(session.user.id, (session.user as { industry?: string }).industry);
    const status = await provider.getChannelStatus({ channelId: params.id });
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error fetching channel status:', error);
    return apiErrors.internal('Failed to fetch channel status');
  }
}
