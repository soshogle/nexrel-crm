import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'Instagram OAuth not configured' },
        { status: 500 }
      );
    }

    const redirectUri = `${process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com'}/api/soshogle/instagram/oauth/callback`;
    
    // Instagram OAuth scopes for messaging
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'pages_manage_metadata',
      'pages_read_engagement'
    ].join(',');

    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
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
