import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.AZURE_CLIENT_ID || '';
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/outlook/callback`;
    const scopes = [
      'Mail.Read',
      'Mail.Send',
      'User.Read',
      'offline_access',
    ].join(' ');

    const authUrl =
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${clientId}` +
      `&response_type=code` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=query` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&prompt=consent`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Outlook auth init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize Outlook auth' },
      { status: 500 }
    );
  }
}
