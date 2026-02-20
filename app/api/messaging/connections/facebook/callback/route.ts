
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encryption'

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      // Return HTML that will close the popup and notify parent
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'facebook-oauth-error', error: 'unauthorized' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'facebook-oauth-error', error: 'no_code' }, '*');
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
          window.opener.postMessage({ type: 'facebook-oauth-error', error: 'user_not_found' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for access token
    const facebookAppId = process.env.FACEBOOK_APP_ID || ''
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || ''
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/facebook/callback`

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${facebookAppId}` +
      `&client_secret=${facebookAppSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    )

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Facebook token exchange failed:', tokenData)
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'facebook-oauth-error', error: 'token_exchange_failed' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get user's Facebook Pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return new NextResponse(
        `<html><body><script>
          alert('No Facebook Pages found. Please make sure you have a Facebook Business Page.');
          window.opener.postMessage({ type: 'facebook-oauth-error', error: 'no_pages' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Store connection for the first page (or let user choose later)
    const page = pagesData.data[0]
    
    const existing = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'FACEBOOK_MESSENGER',
        channelIdentifier: page.id
      }
    });
    
    const encryptedToken = encrypt(page.access_token);

    if (existing) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          accessToken: encryptedToken,
          displayName: page.name,
          providerData: {
            pageId: page.id,
            pageName: page.name
          }
        }
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: user.id,
          channelType: 'FACEBOOK_MESSENGER',
          channelIdentifier: page.id,
          displayName: page.name,
          status: 'CONNECTED',
          providerType: 'facebook',
          accessToken: encryptedToken,
          providerAccountId: page.id,
          providerData: {
            pageId: page.id,
            pageName: page.name
          }
        }
      });
    }

    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'facebook-oauth-success' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Facebook callback error:', error)
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'facebook-oauth-error', error: 'callback_failed' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
