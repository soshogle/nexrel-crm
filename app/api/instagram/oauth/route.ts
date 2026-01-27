import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Instagram OAuth Flow Initiation
 * Redirects user to Instagram OAuth consent screen
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instagramAppId = process.env.INSTAGRAM_APP_ID;
    const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/oauth/callback`;

    if (!instagramAppId || !instagramAppSecret) {
      return NextResponse.json(
        { error: 'Instagram credentials not configured' },
        { status: 500 }
      );
    }

    // Instagram OAuth authorization URL
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', instagramAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'instagram_basic,instagram_manage_messages');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', session.user.id); // Pass user ID for validation

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('❌ Instagram OAuth init error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Instagram OAuth' },
      { status: 500 }
    );
  }
}
