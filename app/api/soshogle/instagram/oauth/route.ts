import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Instagram OAuth Initiation Endpoint
 * Redirects to Instagram OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    if (!facebookAppId) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured. Please set FACEBOOK_APP_ID in environment variables.' },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com'}/api/soshogle/instagram/oauth/callback`;
    
    // Instagram OAuth scopes for messaging (via Facebook)
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata'
    ].join(',');

    // Use Facebook OAuth endpoint with Instagram scopes
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', facebookAppId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', session.user.id); // Pass userId for callback

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Instagram OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Instagram OAuth' },
      { status: 500 }
    );
  }
}
