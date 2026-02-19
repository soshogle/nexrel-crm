export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { cookies } from 'next/headers';

/**
 * GET /api/integrations/quickbooks/callback
 * Handles QuickBooks OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=unauthorized&section=quickbooks', request.url)
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${encodeURIComponent(error)}&section=quickbooks`, request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=missing_code&section=quickbooks', request.url)
      );
    }

    // Verify state token
    const cookieStore = await cookies();
    const storedState = cookieStore.get('qb_oauth_state')?.value;
    
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=invalid_state&section=quickbooks', request.url)
      );
    }

    // Exchange authorization code for access token
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/integrations/quickbooks/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=config_missing&section=quickbooks', request.url)
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('QuickBooks token exchange error:', errorData);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=${encodeURIComponent(errorData.error || 'token_exchange_failed')}&section=quickbooks`, request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    
    // Calculate expiration
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    // Save QuickBooks credentials to user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        quickbooksConfig: JSON.stringify({
          realmId,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: expiresAt.toISOString(),
        }),
      },
    });

    // Clear state cookie
    const response = NextResponse.redirect(
      new URL('/dashboard/settings?success=quickbooks_connected&section=quickbooks', request.url)
    );
    response.cookies.delete('qb_oauth_state');

    return response;

  } catch (error: any) {
    console.error('QuickBooks OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(error.message)}&section=quickbooks`, request.url)
    );
  }
}
