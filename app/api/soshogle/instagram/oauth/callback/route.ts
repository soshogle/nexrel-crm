import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Instagram OAuth Callback Handler
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
      `${baseUrl}/dashboard/settings?instagram_error=${error || 'missing_code'}`
    );
  }

  try {
    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;

    if (!facebookAppId || !facebookAppSecret) {
      throw new Error('Facebook OAuth credentials not configured');
    }

    const redirectUri = `${baseUrl}/api/soshogle/instagram/oauth/callback`;

    // Exchange code for access token using Facebook OAuth
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', facebookAppId);
    tokenUrl.searchParams.set('client_secret', facebookAppSecret);
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

    // Get user's Facebook Pages (Instagram Business accounts are linked to Pages)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`
    );

    if (!pagesResponse.ok) {
      throw new Error('Failed to fetch Facebook pages');
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      throw new Error('No Facebook Pages found. Please create a Page and link your Instagram Business account.');
    }

    // Get Instagram Business Account for the first page
    const page = pages[0];
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );

    if (!igResponse.ok) {
      throw new Error('Failed to fetch Instagram Business account');
    }

    const igData = await igResponse.json();

    if (!igData.instagram_business_account) {
      throw new Error('No Instagram Business account found linked to your Facebook Page.');
    }

    const igAccountId = igData.instagram_business_account.id;
    const pageAccessToken = page.access_token; // Long-lived page token

    // Get Instagram account info
    const profileResponse = await fetch(
      `https://graph.instagram.com/${igAccountId}?fields=id,username,account_type&access_token=${pageAccessToken}`
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Instagram profile');
    }

    const profileData = await profileResponse.json();
    const username = profileData.username || 'Instagram Account';
    const longLivedToken = pageAccessToken; // Page token is already long-lived
    const expiresIn = 5184000; // 60 days (typical for page tokens)
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store connection in database
    const existingConn = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        channelType: 'INSTAGRAM',
        channelIdentifier: igAccountId,
      },
    });
    
    if (existingConn) {
      await prisma.channelConnection.update({
        where: { id: existingConn.id },
        data: {
          accessToken: longLivedToken,
          expiresAt,
          displayName: `@${username}`,
          status: 'CONNECTED',
          providerType: 'FACEBOOK',
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username,
            ...profileData,
          },
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: state,
          channelType: 'INSTAGRAM',
          channelIdentifier: igAccountId,
          accessToken: longLivedToken,
          expiresAt,
          displayName: `@${username}`,
          status: 'CONNECTED',
          providerType: 'FACEBOOK',
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username,
            ...profileData,
          },
          syncEnabled: true,
        },
      });
    }

    console.log(`✅ Instagram connected: @${username} (${user_id})`);

    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?instagram_success=true&username=${username}`
    );
  } catch (error: any) {
    console.error('Instagram callback error:', error);
    return NextResponse.redirect(
      `${baseUrl}/dashboard/settings?instagram_error=${encodeURIComponent(error.message)}`
    );
  }
}
