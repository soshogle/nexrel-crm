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

    const instagramAppId = process.env.INSTAGRAM_APP_ID!;
    const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET!;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/instagram/oauth/callback`;

    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: instagramAppId,
        client_secret: instagramAppSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Instagram token exchange error:', errorData);
      return NextResponse.redirect(
        new URL(
          '/dashboard/settings?instagram_error=token_exchange_failed',
          process.env.NEXTAUTH_URL!
        )
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, user_id } = tokenData;

    // Get long-lived access token
    const longLivedTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${instagramAppSecret}&access_token=${access_token}`
    );

    const longLivedData = await longLivedTokenResponse.json();
    const longLivedToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in; // Usually 60 days

    // Get Instagram account info
    const userInfoResponse = await fetch(
      `https://graph.instagram.com/${user_id}?fields=id,username&access_token=${longLivedToken}`
    );

    const userInfo = await userInfoResponse.json();
    const username = userInfo.username;

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Check for existing connection
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        channelIdentifier: user_id,
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
        },
      });
    } else {
      // Create new connection
      await prisma.channelConnection.create({
        data: {
          userId: session.user.id,
          providerType: 'INSTAGRAM',
          channelType: 'INSTAGRAM',
          channelIdentifier: user_id,
          displayName: `@${username}`,
          accessToken: longLivedToken,
          tokenExpiresAt: expiresAt,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
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
