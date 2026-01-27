
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || 
      `${process.env.NEXTAUTH_URL}/api/integrations/quickbooks/callback`;

    if (!clientId) {
      return NextResponse.json(
        { error: 'QuickBooks not configured' },
        { status: 500 }
      );
    }

    const authUrl = `https://appcenter.intuit.com/connect/oauth2` +
      `?client_id=${clientId}` +
      `&scope=com.intuit.quickbooks.accounting` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${session.user.id}`;

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('QuickBooks connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
