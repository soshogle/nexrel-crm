import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/soshogle/oauth/facebook - Initiate Facebook OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Facebook App credentials (should be in environment variables)
    // Support both FACEBOOK_CLIENT_ID and FACEBOOK_APP_ID for compatibility
    const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID;
    const baseUrl = process.env.NEXTAUTH_URL;
    
    if (!baseUrl) {
      console.error('NEXTAUTH_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'NEXTAUTH_URL environment variable is required'
        },
        { status: 500 }
      );
    }
    
    const redirectUri = `${baseUrl}/api/soshogle/oauth/facebook/callback`;
    
    if (!clientId) {
      console.error('Facebook OAuth configuration missing. Required env vars: FACEBOOK_CLIENT_ID or FACEBOOK_APP_ID');
      return NextResponse.json(
        { 
          error: 'Facebook OAuth not configured',
          details: 'Please set FACEBOOK_CLIENT_ID or FACEBOOK_APP_ID in your environment variables'
        },
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
