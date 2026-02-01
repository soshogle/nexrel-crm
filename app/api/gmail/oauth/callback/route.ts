import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handles Gmail OAuth callback
 * GET /api/gmail/oauth/callback
 */
export async function GET(request: NextRequest) {
  try {
    // Use NEXTAUTH_URL for all redirects to avoid internal Docker hostname issues
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=unauthorized', baseUrl)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('Gmail OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?gmail_error=${error}`, baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail_error=missing_code', baseUrl)
      );
    }

    // Verify state matches user ID
    if (state !== session.user.id) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail_error=invalid_state', baseUrl)
      );
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/oauth/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId!,
        client_secret: clientSecret!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail_error=token_exchange_failed', baseUrl)
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    if (!access_token) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?gmail_error=no_access_token', baseUrl)
      );
    }

    // Get user's Gmail profile
    const profileResponse = await fetch(
      'https://www.googleapis.com/gmail/v1/users/me/profile',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    let emailAddress = 'Gmail Account';
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      emailAddress = profile.emailAddress || emailAddress;
    }

    // Store Gmail connection in ChannelConnection
    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const existing = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'EMAIL',
        channelIdentifier: emailAddress,
      },
    });

    if (existing) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token || undefined,
          expiresAt,
          status: 'CONNECTED',
          providerType: 'GMAIL',
          displayName: emailAddress,
          providerData: {
            scopes: [
              'gmail.readonly',
              'gmail.send',
              'gmail.modify',
              'mail.google.com',
            ],
          },
        },
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: session.user.id,
          channelType: 'EMAIL',
          channelIdentifier: emailAddress,
          accessToken: access_token,
          refreshToken: refresh_token || undefined,
          expiresAt,
          status: 'CONNECTED',
          providerType: 'GMAIL',
          displayName: emailAddress,
          providerData: {
            scopes: [
              'gmail.readonly',
              'gmail.send',
              'gmail.modify',
              'mail.google.com',
            ],
          },
        },
      });
    }

    console.log('✅ Gmail connected successfully for user:', session.user.id);

    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail_success=true', baseUrl)
    );
  } catch (error: any) {
    console.error('Error in Gmail OAuth callback:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';
    return NextResponse.redirect(
      new URL('/dashboard/settings?gmail_error=callback_failed', baseUrl)
    );
  }
}
