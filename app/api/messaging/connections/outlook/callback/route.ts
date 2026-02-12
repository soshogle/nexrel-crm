import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'outlook-oauth-error', error: 'unauthorized' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'outlook-oauth-error', error: 'no_code' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'outlook-oauth-error', error: 'user_not_found' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID || '';
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || process.env.AZURE_CLIENT_SECRET || '';
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/outlook/callback`;

    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      console.error('Outlook token exchange failed:', tokenData);
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'outlook-oauth-error', error: 'token_exchange_failed' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }

    const profileResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName,displayName', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();
    const email = profileData.mail || profileData.userPrincipalName || '';

    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null;

    const existing = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'EMAIL',
        channelIdentifier: email,
        providerType: 'outlook',
      },
    });

    const connData = {
      status: 'CONNECTED' as const,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || undefined,
      expiresAt,
      displayName: email,
      providerData: {
        email,
        name: profileData.displayName,
      },
    };

    if (existing) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: connData,
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: user.id,
          channelType: 'EMAIL',
          channelIdentifier: email,
          displayName: email,
          providerType: 'outlook',
          syncEnabled: true,
          ...connData,
        },
      });
    }

    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'outlook-oauth-success' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  } catch (error) {
    console.error('Outlook callback error:', error);
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'outlook-oauth-error', error: 'callback_failed' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}
