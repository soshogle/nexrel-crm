import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Initialize Google OAuth flow
 * GET /api/calendar/google-oauth
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      // Return OAuth URL for client to open
      const clientId = process.env.GOOGLE_CLIENT_ID || '';
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/calendar/google-oauth/callback`;
      
      const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('https://www.googleapis.com/auth/calendar')}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${session.user.id}`;

      return NextResponse.json({ url: oauthUrl });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in Google OAuth flow:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize OAuth' },
      { status: 500 }
    );
  }
}
