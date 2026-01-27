import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Instagram OAuth credentials not configured');
    }

    const redirectUri = `${baseUrl}/api/soshogle/instagram/oauth/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Instagram token error:', errorData);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user_id } = tokenData;

    // Get Instagram account info
    const profileResponse = await fetch(
      `https://graph.instagram.com/${user_id}?fields=id,username,account_type&access_token=${access_token}`
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch Instagram profile');
    }

    const profileData = await profileResponse.json();
    const username = profileData.username || 'Instagram Account';

    // Exchange for long-lived token (60 days)
    const longLivedResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${access_token}`
    );

    const longLivedData = await longLivedResponse.json();
    const longLivedToken = longLivedData.access_token || access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // 60 days default

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store connection in database
    const existingConn = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        channelType: 'INSTAGRAM',
        channelIdentifier: user_id,
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
          providerType: 'instagram',
          providerAccountId: user_id,
          providerData: profileData,
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: state,
          channelType: 'INSTAGRAM',
          channelIdentifier: user_id,
          accessToken: longLivedToken,
          expiresAt,
          displayName: `@${username}`,
          status: 'CONNECTED',
          providerType: 'instagram',
          providerAccountId: user_id,
          providerData: profileData,
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
