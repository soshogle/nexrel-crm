import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/soshogle/oauth/instagram/callback - Handle Instagram OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // userId
    const error = searchParams.get('error');

    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';

    if (error) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=missing_parameters`
      );
    }

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/soshogle/oauth/instagram/callback`;

    if (!facebookAppId || !facebookAppSecret) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=oauth_not_configured`
      );
    }

    // Exchange code for access token using Facebook OAuth
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', facebookAppId);
    tokenUrl.searchParams.set('client_secret', facebookAppSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Facebook OAuth error:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=token_exchange_failed`
      );
    }

    // Get user's Facebook Pages (Instagram Business accounts are linked to Pages)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    );

    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json().catch(() => ({}));
      console.error('Failed to fetch pages:', errorData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=no_pages_found`
      );
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=no_pages_found`
      );
    }

    // Get Instagram Business Account for the first page
    const page = pages[0];
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    );

    if (!igResponse.ok) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=no_instagram_account`
      );
    }

    const igData = await igResponse.json();

    if (!igData.instagram_business_account) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=no_instagram_account`
      );
    }

    const igAccountId = igData.instagram_business_account.id;

    // Get Instagram account info
    const userResponse = await fetch(
      `https://graph.instagram.com/${igAccountId}?fields=id,username&access_token=${page.access_token}`
    );
    const userData = await userResponse.json();

    // Store connection in database
    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
        where: {
          userId: state,
          channelType: 'INSTAGRAM',
          channelIdentifier: igAccountId,
        },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: page.access_token, // Use page token (long-lived)
          refreshToken: tokenData.access_token, // User token for refresh
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : new Date(Date.now() + 5184000 * 1000), // 60 days default
          displayName: userData.username || 'Instagram Account',
          channelIdentifier: igAccountId,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username: userData.username,
          },
        },
      });
    } else {
      // Create new connection
      await prisma.channelConnection.create({
        data: {
          userId: state,
          channelType: 'INSTAGRAM',
          providerType: 'FACEBOOK',
          accessToken: page.access_token, // Use page token (long-lived)
          refreshToken: tokenData.access_token, // User token for refresh
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : new Date(Date.now() + 5184000 * 1000), // 60 days default
          displayName: userData.username || 'Instagram Account',
          channelIdentifier: igAccountId,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name,
            igAccountId,
            username: userData.username,
          },
        },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=success`
    );
  } catch (error: any) {
    console.error('Instagram OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=callback_failed`
    );
  }
}
