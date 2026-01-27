
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');
    const state = searchParams.get('state'); // userId

    if (!code || !realmId || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=missing_params', req.url)
      );
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=config_missing', req.url)
      );
    }

    // Exchange code for tokens
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    const data = await response.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    // Save tokens to user
    await prisma.user.update({
      where: { id: state },
      data: {
        quickbooksConfig: JSON.stringify({
          realmId,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: expiresAt.toISOString()
        }),
        quickbooksConfigured: true
      }
    });

    return NextResponse.redirect(
      new URL('/dashboard/settings?quickbooks=connected', req.url)
    );

  } catch (error) {
    console.error('QuickBooks callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=auth_failed', req.url)
    );
  }
}
