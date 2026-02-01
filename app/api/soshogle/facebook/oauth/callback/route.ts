import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Facebook Messenger OAuth Callback Handler
 * Exchanges code for access token and stores connection
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // userId
  const error = searchParams.get('error');

  const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?facebook_error=${error || 'missing_code'}`
    );
  }

  try {
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Facebook OAuth credentials not configured');
    }

    const redirectUri = `${baseUrl}/api/soshogle/facebook/oauth/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', clientId);
    tokenUrl.searchParams.set('client_secret', clientSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Facebook token error:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Exchange for long-lived token (60 days)
    const longLivedUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', clientId);
    longLivedUrl.searchParams.set('client_secret', clientSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', access_token);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();
    const longLivedToken = longLivedData.access_token || access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // 60 days default

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Get user's pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
    );

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. Please create a page first.');
    }

    // Use the first page
    const page = pages[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;

    // Store connection in database
    const existingConn = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        channelType: 'FACEBOOK_MESSENGER',
        channelIdentifier: pageId,
      },
    });
    
    if (existingConn) {
      await prisma.channelConnection.update({
        where: { id: existingConn.id },
        data: {
          accessToken: pageAccessToken,
          expiresAt,
          displayName: pageName,
          status: 'CONNECTED',
          providerType: 'facebook',
          providerAccountId: pageId,
          providerData: { page, pages },
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: state,
          channelType: 'FACEBOOK_MESSENGER',
          channelIdentifier: pageId,
          accessToken: pageAccessToken,
          expiresAt,
          displayName: pageName,
          status: 'CONNECTED',
          providerType: 'facebook',
          providerAccountId: pageId,
          providerData: { page, pages },
          syncEnabled: true,
        },
      });
    }

    console.log(`✅ Facebook Messenger connected: ${pageName} (${pageId})`);

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?facebook_success=true&page=${encodeURIComponent(pageName)}`
    );
  } catch (error: any) {
    console.error('Facebook callback error:', error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?facebook_error=${encodeURIComponent(error.message)}`
    );
  }
}
