
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
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'unauthorized' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) {
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'no_code' }, '*');
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
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'user_not_found' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Exchange code for access token
    const facebookAppId = process.env.FACEBOOK_APP_ID || ''
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET || ''
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/messaging/connections/instagram/callback`

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${facebookAppId}` +
      `&client_secret=${facebookAppSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    )

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      console.error('Instagram token exchange failed:', tokenData)
      return new NextResponse(
        `<html><body><script>
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'token_exchange_failed' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get Facebook Pages (Instagram Business accounts are linked to Pages)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      return new NextResponse(
        `<html><body><script>
          alert('No Facebook Pages found. Please make sure your Instagram Business account is linked to a Facebook Page.');
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'no_pages' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Get Instagram Business Account for the first page
    const page = pagesData.data[0]
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igResponse.json()

    if (!igData.instagram_business_account) {
      return new NextResponse(
        `<html><body><script>
          alert('No Instagram Business account found linked to your Facebook Page. Please link an Instagram Business account first.');
          window.opener.postMessage({ type: 'instagram-oauth-error', error: 'no_instagram_account' }, '*');
          window.close();
        </script></body></html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const igAccountId = igData.instagram_business_account.id

    // Get Instagram account details
    const igDetailsResponse = await fetch(
      `https://placehold.co/1200x600/e2e8f0/1e293b?text=Profile_picture_of_the_Instagram_business_account_`
    )
    const igDetails = await igDetailsResponse.json()
    
    const existing = await prisma.channelConnection.findFirst({
      where: {
        userId: user.id,
        channelType: 'INSTAGRAM',
        channelIdentifier: igAccountId
      }
    });
    
    const encryptedToken = encrypt(page.access_token);

    if (existing) {
      await prisma.channelConnection.update({
        where: { id: existing.id },
        data: {
          status: 'CONNECTED',
          accessToken: encryptedToken,
          displayName: igDetails.username || 'Instagram',
          providerData: {
            igAccountId,
            username: igDetails.username,
            pageId: page.id,
            pageName: page.name
          }
        }
      });
    } else {
      await prisma.channelConnection.create({
        data: {
          userId: user.id,
          channelType: 'INSTAGRAM',
          channelIdentifier: igAccountId,
          displayName: igDetails.username || 'Instagram',
          status: 'CONNECTED',
          providerType: 'instagram',
          accessToken: encryptedToken,
          providerAccountId: igAccountId,
          providerData: {
            igAccountId,
            username: igDetails.username,
            pageId: page.id,
            pageName: page.name
          }
        }
      });
    }

    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'instagram-oauth-success' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (error) {
    console.error('Instagram callback error:', error)
    return new NextResponse(
      `<html><body><script>
        window.opener.postMessage({ type: 'instagram-oauth-error', error: 'callback_failed' }, '*');
        window.close();
      </script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
