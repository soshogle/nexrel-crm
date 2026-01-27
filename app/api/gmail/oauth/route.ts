import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Initiates Gmail OAuth 2.0 flow
 * GET /api/gmail/oauth
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // If no code, return the OAuth URL
    if (!code) {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/oauth/callback`;
      
      // Gmail scopes - full access to Gmail
      const scope = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://mail.google.com/',
      ].join(' ');

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${session.user.id}`;

      return NextResponse.json({ authUrl });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in Gmail OAuth:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Gmail OAuth' },
      { status: 500 }
    );
  }
}
