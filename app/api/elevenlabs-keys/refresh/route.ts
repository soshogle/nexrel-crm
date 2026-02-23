
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { apiErrors } from '@/lib/api-error';

// POST /api/elevenlabs-keys/refresh - Refresh all API key statuses

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    await elevenLabsKeyManager.refreshAllKeys(session.user.id);

    return NextResponse.json({
      success: true,
      message: 'API keys refreshed successfully',
    });
  } catch (error: any) {
    console.error('Error refreshing API keys:', error);
    return apiErrors.internal(error.message || 'Failed to refresh API keys');
  }
}
