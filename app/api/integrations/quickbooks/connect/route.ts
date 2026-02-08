import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/integrations/quickbooks/connect
 * Initiates QuickBooks OAuth flow
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/quickbooks/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'QuickBooks credentials not configured. Please set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in environment variables.' },
        { status: 500 }
      );
    }

    // Generate state token for CSRF protection
    const state = Buffer.from(`${session.user.id}:${Date.now()}`).toString('base64');
    
    // Store state in session/cookie (simplified - in production use secure session storage)
    const response = NextResponse.json({
      authUrl: `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&scope=com.intuit.quickbooks.accounting&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${encodeURIComponent(state)}&access_type=offline`,
      state,
    });

    // Store state in httpOnly cookie
    response.cookies.set('qb_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;

  } catch (error: any) {
    console.error('QuickBooks OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate QuickBooks connection', details: error.message },
      { status: 500 }
    );
  }
}
