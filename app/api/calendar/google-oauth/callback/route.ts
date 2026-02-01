import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handle Google OAuth callback
 * GET /api/calendar/google-oauth/callback?code=XXX&state=userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const userId = searchParams.get('state');

    if (!code || !userId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=missing_params`
      );
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/calendar/google-oauth/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=token_exchange_failed`
      );
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Get user's calendar info
    const calendarResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList/primary',
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    let calendarName = 'Google Calendar';
    if (calendarResponse.ok) {
      const calendarData = await calendarResponse.json();
      calendarName = calendarData.summary || 'Google Calendar';
    }

    // Store or update connection in database
    await prisma.calendarConnection.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'GOOGLE',
        },
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token || undefined,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        calendarName,
        syncEnabled: true,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
      create: {
        userId,
        provider: 'GOOGLE',
        calendarName,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: expires_in ? new Date(Date.now() + expires_in * 1000) : undefined,
        syncEnabled: true,
        syncStatus: 'SYNCED',
      },
    });

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_success=true`
    );
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?calendar_error=callback_failed`
    );
  }
}
