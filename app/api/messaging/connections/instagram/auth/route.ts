
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Instagram uses Facebook's OAuth (Instagram Business accounts are linked to Facebook Pages)
    const facebookAppId = process.env.FACEBOOK_APP_ID || 'YOUR_FACEBOOK_APP_ID'
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/instagram/callback`
    
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${facebookAppId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=instagram_basic,instagram_manage_messages,pages_show_list,pages_read_engagement` +
      `&response_type=code`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Instagram auth init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize Instagram auth' },
      { status: 500 }
    )
  }
}
