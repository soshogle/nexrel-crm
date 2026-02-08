import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/oauth/callback`;

    if (!facebookAppId) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured. Please set FACEBOOK_APP_ID in environment variables.' },
        { status: 500 }
      );
    }

    // Use Facebook OAuth with Instagram scopes
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', facebookAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement');
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
