import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Facebook OAuth Flow - Initiate
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    // If no code, return the OAuth URL for the client to redirect to
    if (!code) {
      const clientId = process.env.FACEBOOK_APP_ID;
      const redirectUri = `${process.env.NEXTAUTH_URL}/api/facebook/oauth/callback`;
      
      if (!clientId) {
        return apiErrors.internal('Facebook App ID not configured');
      }

      const scope = 'pages_messaging,pages_manage_metadata,pages_read_engagement,pages_show_list';
      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${session.user.id}`;

      return NextResponse.json({ authUrl });
    }

    return apiErrors.badRequest('Invalid request');
  } catch (error: any) {
    console.error('Facebook OAuth error:', error);
    return apiErrors.internal(error.message || 'OAuth failed');
  }
}
