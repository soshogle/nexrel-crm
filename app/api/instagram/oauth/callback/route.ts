import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Instagram OAuth Callback Handler
 * Exchanges authorization code for access token and stores connection
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=unauthorized', process.env.NEXTAUTH_URL!)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('Instagram OAuth error:', error);
      return NextResponse.redirect(
        new URL(
          `/dashboard/settings?instagram_error=${error}`,
          process.env.NEXTAUTH_URL!
        )
      );
    }

    // Validate state parameter
    if (state !== session.user.id) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=invalid_state',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=no_code',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/oauth/callback`;

    if (!facebookAppId || !facebookAppSecret) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=oauth_not_configured',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    // Exchange code for access token using Facebook OAuth
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', facebookAppId);
    tokenUrl.searchParams.set('client_secret', facebookAppSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Facebook token exchange error:', errorData);
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=token_exchange_failed',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get user's Facebook Pages (Instagram Business accounts are linked to Pages)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`
    );

    if (!pagesResponse.ok) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=no_pages_found',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=no_pages_found',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    // Get Instagram Business Account for the first page
    const page = pages[0];
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );

    if (!igResponse.ok) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=no_instagram_account',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const igData = await igResponse.json();

    if (!igData.instagram_business_account) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=no_instagram_account',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const igAccountId = igData.instagram_business_account.id;
    const pageAccessToken = page.access_token; // Long-lived page token

    // Get Instagram account info
    const userInfoResponse = await fetch(
      `https://graph.instagram.com/${igAccountId}?fields=id,username&access_token=${pageAccessToken}`
    );

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=failed_to_fetch_profile',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const userInfo = await userInfoResponse.json();
    const username = userInfo.username || 'Instagram Account';
    const longLivedToken = pageAccessToken; // Page token is already long-lived
    const expiresIn = 5184000; // 60 days (typical for page tokens)

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Check for existing connection
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        channelIdentifier: igAccountId,
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: longLivedToken,
          tokenExpiresAt: expiresAt,
          displayName: `@${username}`,
          status: 'CONNECTED',
          lastSyncedAt: new Date(),
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username,
          },
        },
      });
    } else {
      // Create new connection
      await prisma.channelConnection.create({
        data: {
          userId: session.user.id,
          providerType: 'FACEBOOK',
          channelType: 'INSTAGRAM',
          channelIdentifier: igAccountId,
          displayName: `@${username}`,
          accessToken: longLivedToken,
          tokenExpiresAt: expiresAt,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username,
          },
        },
      });
    }

    console.log('✅ Instagram connected for user:', session.user.id, '- @' + username);

    // Redirect to settings with success message
    return NextResponse.redirect(
      new URL('/dashboard/settings?instagram_success=true', process.env.NEXTAUTH_URL!)
    );
  } catch (error: any) {
    console.error('❌ Instagram OAuth callback error:', error);
    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?instagram_error=${encodeURIComponent(error.message)}`,
        process.env.NEXTAUTH_URL!
      )
    );
  }
}
