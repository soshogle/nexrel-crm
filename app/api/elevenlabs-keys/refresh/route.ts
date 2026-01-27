
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

// POST /api/elevenlabs-keys/refresh - Refresh all API key statuses
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await elevenLabsKeyManager.refreshAllKeys(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'API keys refreshed successfully',
    });
  } catch (error: any) {
    console.error('Error refreshing API keys:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh API keys' },
      { status: 500 }
    );
  }
}
