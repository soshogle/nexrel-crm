
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return apiErrors.unauthorized()
    }

    const facebookAppId = process.env.FACEBOOK_APP_ID;
    if (!facebookAppId) {
      return apiErrors.internal('Facebook App ID not configured');
    }
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/facebook/callback`
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${facebookAppId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=pages_messaging,pages_manage_metadata,pages_read_engagement` +
      `&response_type=code`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Facebook auth init error:', error)
    return apiErrors.internal('Failed to initialize Facebook auth')
  }
}
