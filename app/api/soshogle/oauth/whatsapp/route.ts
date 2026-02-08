import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/soshogle/oauth/whatsapp - Initiate WhatsApp Business OAuth flow
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // WhatsApp Business API credentials (should be in environment variables)
    // WhatsApp uses Facebook App credentials, so check both
    const clientId = process.env.WHATSAPP_CLIENT_ID || process.env.FACEBOOK_APP_ID || process.env.FACEBOOK_CLIENT_ID;
    const baseUrl = process.env.NEXTAUTH_URL;
    
    if (!baseUrl) {
      console.error('NEXTAUTH_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'NEXTAUTH_URL environment variable is required'
        },
        { status: 500 }
      );
    }
    
    const redirectUri = `${baseUrl}/api/soshogle/oauth/whatsapp/callback`;
    
    if (!clientId) {
      console.error('WhatsApp OAuth configuration missing. Required env vars: WHATSAPP_CLIENT_ID or FACEBOOK_APP_ID');
      return NextResponse.json(
        { 
          error: 'WhatsApp OAuth not configured',
          details: 'Please set WHATSAPP_CLIENT_ID or FACEBOOK_APP_ID in your environment variables'
        },
        { status: 500 }
      );
    }

    // Build OAuth authorization URL for WhatsApp Business API
    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', 'whatsapp_business_messaging,whatsapp_business_management');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('state', session.user.id);

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error: any) {
    console.error('Error initiating WhatsApp OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
