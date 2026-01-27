import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/soshogle/oauth/facebook - Initiate Facebook OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Facebook App credentials (should be in environment variables)
    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/soshogle/oauth/facebook/callback`;
    
    if (!clientId) {
      return NextResponse.json(
        { error: 'Facebook OAuth not configured' },
        { status: 500 }
      );
    }

    // Build OAuth authorization URL
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'pages_messaging,pages_manage_metadata,pages_read_engagement');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', session.user.id);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Error initiating Facebook OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
