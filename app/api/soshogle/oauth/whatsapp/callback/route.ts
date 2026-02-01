import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/soshogle/oauth/whatsapp/callback - Handle WhatsApp Business OAuth callback
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

    // Exchange code for access token (using Facebook OAuth for WhatsApp Business)
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token';
    const redirectUri = `${baseUrl}/api/soshogle/oauth/whatsapp/callback`;

    const clientId = process.env.WHATSAPP_CLIENT_ID;
    const clientSecret = process.env.WHATSAPP_CLIENT_SECRET;

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
      console.error('WhatsApp OAuth error:', tokenData);
      return NextResponse.redirect(
        `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=token_exchange_failed`
      );
    }

    // Get business info
    const businessResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${tokenData.access_token}`
    );
    const businessData = await businessResponse.json();

    // Store connection in database
    // Check if connection already exists
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: state,
        providerType: 'WHATSAPP',
        channelType: 'WHATSAPP',
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
          displayName: businessData.name || 'WhatsApp Business',
          channelIdentifier: businessData.id || null,
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
          channelType: 'WHATSAPP',
          providerType: 'WHATSAPP',
          accessToken: tokenData.access_token,
          refreshToken: null,
          tokenExpiresAt: tokenData.expires_in
            ? new Date(Date.now() + tokenData.expires_in * 1000)
            : null,
          displayName: businessData.name || 'WhatsApp Business',
          channelIdentifier: businessData.id || null,
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
    console.error('WhatsApp OAuth callback error:', error);
    const baseUrl = process.env.NEXTAUTH_URL || 'https://nexrel.soshogleagents.com';
    return NextResponse.redirect(
      `${baseUrl}/dashboard/soshogle?soshogle_connected=error&error=callback_failed`
    );
  }
}
