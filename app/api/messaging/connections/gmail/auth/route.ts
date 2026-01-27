
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Replace with your Google OAuth credentials
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID || ''
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/gmail/callback`
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${googleClientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent('https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send')}` +
      `&access_type=offline` +
      `&prompt=consent`

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Gmail auth init error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize Gmail auth' },
      { status: 500 }
    )
  }
}
