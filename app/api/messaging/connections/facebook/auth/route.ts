
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Replace with your Facebook App ID
    const facebookAppId = process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID'
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/facebook/callback`
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${facebookAppId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=pages_messaging,pages_manage_metadata,pages_read_engagement` +
      `&response_type=code`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Facebook auth init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize Facebook auth' },
      { status: 500 }
    )
  }
}
