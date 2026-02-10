/**
 * Google OAuth Callback Handler
 * Handles OAuth callback and stores tokens in localStorage via postMessage
 */

import { NextRequest, NextResponse } from 'next/server';
import { googleSearchConsole } from '@/lib/website-builder/google-search-console';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      // Return error page that posts message to parent
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Error</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              error: '${error}'
            }, '*');
            window.close();
          </script>
          <p>Authorization failed. Please close this window and try again.</p>
        </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    if (!code) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Error</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              error: 'No authorization code received'
            }, '*');
            window.close();
          </script>
          <p>No authorization code received. Please close this window and try again.</p>
        </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/website-builder/google-oauth/callback`;

    if (!googleClientId || !googleClientSecret) {
      return new NextResponse(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google OAuth Error</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'GOOGLE_OAUTH_ERROR',
              error: 'Google OAuth not configured'
            }, '*');
            window.close();
          </script>
          <p>Google OAuth is not configured. Please contact support.</p>
        </body>
        </html>
        `,
        {
          headers: { 'Content-Type': 'text/html' },
        }
      );
    }

    // Exchange code for tokens
    const tokens = await googleSearchConsole.getTokensFromCode(
      code,
      googleClientId,
      googleClientSecret,
      googleRedirectUri
    );

    // Return success page that stores tokens in localStorage via postMessage
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google OAuth Success</title>
      </head>
      <body>
        <script>
          const tokens = ${JSON.stringify({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiryDate: tokens.expiryDate.toISOString(),
          })};
          
          // Store tokens in localStorage via postMessage to parent window
          window.opener.postMessage({
            type: 'GOOGLE_OAUTH_SUCCESS',
            tokens: tokens
          }, '*');
          
          // Also try to store directly if same origin
          try {
            localStorage.setItem('google-search-console-tokens', JSON.stringify(tokens));
          } catch (e) {
            // Cross-origin, rely on postMessage
          }
          
          window.close();
        </script>
        <p>Authorization successful! You can close this window.</p>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  } catch (error: any) {
    console.error('OAuth callback error:', error);
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google OAuth Error</title>
      </head>
      <body>
        <script>
          window.opener.postMessage({
            type: 'GOOGLE_OAUTH_ERROR',
            error: '${error.message || 'Failed to exchange authorization code'}'
          }, '*');
          window.close();
        </script>
        <p>An error occurred. Please close this window and try again.</p>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}
