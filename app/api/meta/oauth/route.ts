import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Initiates Meta (Facebook/Instagram/WhatsApp) OAuth flow
 * GET /api/meta/oauth
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Meta credentials from user settings
    const metaSettings = await prisma.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: 'META',
      },
    });

    if (!metaSettings?.appId || !metaSettings?.appSecret) {
      return NextResponse.json(
        { error: 'Meta App credentials not configured. Please add your App ID and App Secret first.' },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/meta/oauth/callback`;

    // Meta OAuth scopes for Instagram, Facebook Pages, and WhatsApp
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_metadata',
      'pages_messaging',
      'instagram_basic',
      'instagram_manage_messages',
      'instagram_manage_comments',
      'whatsapp_business_management',
      'whatsapp_business_messaging',
    ].join(',');

    const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    authUrl.searchParams.set('client_id', metaSettings.appId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', session.user.id);
    authUrl.searchParams.set('response_type', 'code');

    console.log('🔐 Initiating Meta OAuth for user:', session.user.id);

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error: any) {
    console.error('❌ Meta OAuth error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate Meta OAuth' },
      { status: 500 }
    );
  }
}
