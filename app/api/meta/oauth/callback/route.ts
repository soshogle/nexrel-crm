import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Handles Meta OAuth callback
 * GET /api/meta/oauth/callback
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL('/auth/signin?error=unauthorized', request.url)
      );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('❌ Meta OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard/settings?error=meta_oauth_${error}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=no_code', request.url)
      );
    }

    // Verify state matches user ID
    if (state !== session.user.id) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=state_mismatch', request.url)
      );
    }

    // Get Meta credentials
    const metaSettings = await prisma.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: 'META',
      },
    });

    if (!metaSettings?.appId || !metaSettings?.appSecret) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=missing_credentials', request.url)
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/meta/oauth/callback`;

    // Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', metaSettings.appId);
    tokenUrl.searchParams.set('client_secret', metaSettings.appSecret);
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    console.log('🔄 Exchanging Meta OAuth code for tokens...');

    const tokenResponse = await fetch(tokenUrl.toString());
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('❌ Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=token_exchange_failed', request.url)
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token, expires_in } = tokenData;

    if (!access_token) {
      return NextResponse.redirect(
        new URL('/dashboard/settings?error=no_access_token', request.url)
      );
    }

    console.log('✅ Meta access token received');

    // Get user's Facebook Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${access_token}`
    );

    let pageInfo = null;
    if (pagesResponse.ok) {
      const pagesData = await pagesResponse.json();
      if (pagesData.data && pagesData.data.length > 0) {
        pageInfo = pagesData.data[0]; // Use first page
        console.log('📄 Found Facebook Page:', pageInfo.name);
      }
    }

    // Get Instagram Business Account connected to the page
    let instagramInfo = null;
    if (pageInfo?.id) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v18.0/${pageInfo.id}?fields=instagram_business_account&access_token=${access_token}`
      );

      if (igResponse.ok) {
        const igData = await igResponse.json();
        if (igData.instagram_business_account) {
          instagramInfo = igData.instagram_business_account;
          console.log('📸 Found Instagram Business Account:', instagramInfo.id);
        }
      }
    }

    // Calculate token expiry
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 5183999)); // ~60 days default

    // Store or update the connection
    const displayName = pageInfo?.name || 'Meta Account';
    const channelIdentifier = pageInfo?.id || `meta_${session.user.id}`;

    // Check for existing connection
    const existingConnection = await prisma.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: 'INSTAGRAM',
        providerType: 'META',
      },
    });

    if (existingConnection) {
      // Update existing
      await prisma.channelConnection.update({
        where: { id: existingConnection.id },
        data: {
          channelIdentifier,
          displayName,
          accessToken: access_token,
          expiresAt,
          status: 'CONNECTED',
          metadata: {
            facebookPageId: pageInfo?.id,
            facebookPageName: pageInfo?.name,
            instagramAccountId: instagramInfo?.id,
            connectedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      // Create new
      await prisma.channelConnection.create({
        data: {
          userId: session.user.id,
          channelType: 'INSTAGRAM',
          providerType: 'META',
          channelIdentifier,
          displayName,
          accessToken: access_token,
          expiresAt,
          status: 'CONNECTED',
          metadata: {
            facebookPageId: pageInfo?.id,
            facebookPageName: pageInfo?.name,
            instagramAccountId: instagramInfo?.id,
            connectedAt: new Date().toISOString(),
          },
        },
      });
    }

    console.log('✅ Meta connection saved successfully');

    return NextResponse.redirect(
      new URL('/dashboard/settings?success=meta_connected', request.url)
    );
  } catch (error: any) {
    console.error('❌ Meta OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings?error=callback_failed', request.url)
    );
  }
}
