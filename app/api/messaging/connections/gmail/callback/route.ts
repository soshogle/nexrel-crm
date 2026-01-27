
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'gmail-oauth-error', error: 'unauthorized' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'gmail-oauth-error', error: 'no_code' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'gmail-oauth-error', error: 'user_not_found' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for tokens
    const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID || ''
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET || ''
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/gmail/callback`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Gmail token exchange failed:', tokenData)
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'gmail-oauth-error', error: 'token_exchange_failed' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get user's Gmail email address
    const profileResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`
        }
      }
    )
    const profileData = await profileResponse.json()
    
    // Calculate token expiry
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000)
      : null

    const existing = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'EMAIL',
        channelIdentifier: profileData.email
      }
    });
    
    if (existing) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          displayName: profileData.email,
          providerData: {
            email: profileData.email,
            name: profileData.name
          }
        }
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: user.id,
          channelType: 'EMAIL',
          channelIdentifier: profileData.email,
          displayName: profileData.email,
          status: 'CONNECTED',
          providerType: 'gmail',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt,
          providerData: {
            email: profileData.email,
            name: profileData.name
          }
        }
      });
    }

    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'gmail-oauth-success' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Gmail callback error:', error)
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'gmail-oauth-error', error: 'callback_failed' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
