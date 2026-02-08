import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/soshogle/oauth/instagram - Initiate Instagram OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/soshogle/oauth/instagram/callback`;
    
    if (!facebookAppId) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured. Please set FACEBOOK_APP_ID in environment variables.' },
        { status: 500 }
      );
    }

    // Build OAuth authorization URL using Facebook OAuth with Instagram scopes
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.append('client_id', facebookAppId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', session.user.id);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Error initiating Instagram OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
