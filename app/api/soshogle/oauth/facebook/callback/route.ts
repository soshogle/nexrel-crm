import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/soshogle/oauth/facebook/callback - Handle Facebook OAuth callback
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

    // Exchange code for access token
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const redirectUri = `${baseUrl}/api/soshogle/oauth/facebook/callback`;

    const clientId = process.env.FACEBOOK_CLIENT_ID;
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=oauth_not_configured`
      );
    }

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch(`${tokenUrl}?${tokenParams.toString()}`);
    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Facebook OAuth error:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=token_exchange_failed`
      );
    }

    // Get user info
    const userResponse = await fetch(
      `https://graph.facebook.com/me?fields=id,name&access_token=${tokenData.access_token}`
    );
    const userData = await userResponse.json();

    // Store connection in database
    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        providerType: 'FACEBOOK',
        channelType: 'FACEBOOK_MESSENGER',
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: null,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          displayName: userData.name || 'Facebook Account',
          channelIdentifier: userData.id || null,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });
    } else {
      // Create new connection
      await prisma.channelConnection.create({
        data: {
          userId: state,
          channelType: 'FACEBOOK_MESSENGER',
          providerType: 'FACEBOOK',
          accessToken: tokenData.access_token,
          refreshToken: null,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          displayName: userData.name || 'Facebook Account',
          channelIdentifier: userData.id || null,
          status: 'CONNECTED',
          isActive: true,
          lastSyncedAt: new Date(),
        },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=success`
    );
  } catch (error: any) {
    console.error('Facebook OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=callback_failed`
    );
  }
}
