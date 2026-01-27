import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Facebook Messenger OAuth Initiation Endpoint
 * Redirects to Facebook OAuth authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.FACEBOOK_APP_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured' },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com'}/api/soshogle/facebook/oauth/callback`;
    
    // Facebook permissions for Messenger
    const scopes = [
      'pages_manage_metadata',
      'pages_messaging',
      'pages_read_engagement',
      'pages_manage_engagement'
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', session.user.id); // Pass userId for callback

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Facebook OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Facebook OAuth' },
      { status: 500 }
    );
  }
}
