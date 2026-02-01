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

    // Exchange code for access token
    const tokenUrl = 'https://api.instagram.com/oauth/access_token';
    const redirectUri = `${baseUrl}/api/soshogle/oauth/instagram/callback`;

    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=oauth_not_configured`
      );
    }

    const formData = new URLSearchParams();
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('grant_type', 'authorization_code');
    formData.append('redirect_uri', redirectUri);
    formData.append('code', code);

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Instagram OAuth error:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=token_exchange_failed`
      );
    }

    // Get user info
    const userResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username&access_token=${tokenData.access_token}`
    );
    const userData = await userResponse.json();

    // Store connection in database
    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        providerType: 'INSTAGRAM',
        channelType: 'INSTAGRAM',
      },
    });

    if (existingConnection) {
      // Update existing connection
      await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          displayName: userData.username || 'Instagram Account',
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
          channelType: 'INSTAGRAM',
          providerType: 'INSTAGRAM',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          displayName: userData.username || 'Instagram Account',
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
    console.error('Instagram OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=callback_failed`
    );
  }
}
