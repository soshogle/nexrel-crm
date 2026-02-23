/**
 * Google OAuth for Search Console
 * Handles OAuth flow for Google Search Console integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { googleSearchConsole } from '@/lib/website-builder/google-search-console';
import { websiteService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

/**
 * GET - Get authorization URL
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL}/api/website-builder/google-oauth/callback`;

    if (!googleClientId || !googleClientSecret) {
      return NextResponse.json(
        {
          error: 'Google OAuth not configured',
          message:
            'Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables',
        },
        { status: 500 }
      );
    }

    const authUrl = googleSearchConsole.getAuthorizationUrl(
      googleClientId,
      googleClientSecret,
      googleRedirectUri
    );

    // Store websiteId in session/state for callback
    // For simplicity, we'll include it in the redirect URI state parameter
    const state = websiteId
      ? Buffer.from(JSON.stringify({ websiteId, userId: session.user.id })).toString('base64')
      : undefined;

    return NextResponse.json({
      authUrl: state ? `${authUrl}&state=${state}` : authUrl,
      redirectUri: googleRedirectUri,
    });
  } catch (error: any) {
    console.error('Error generating OAuth URL:', error);
    return apiErrors.internal(error.message || 'Failed to generate OAuth URL');
  }
}

/**
 * POST - Handle OAuth callback (exchange code for tokens)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { code, state, websiteId } = body;

    if (!code) {
      return apiErrors.badRequest('Authorization code is required');
    }

    // Parse state if provided
    let parsedState: { websiteId?: string; userId?: string } = {};
    if (state) {
      try {
        parsedState = JSON.parse(Buffer.from(state, 'base64').toString());
      } catch (e) {
        // State parsing failed, use provided websiteId
      }
    }

    const targetWebsiteId = websiteId || parsedState.websiteId;
    if (!targetWebsiteId) {
      return apiErrors.badRequest('Website ID is required');
    }

    // Verify website belongs to user
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const website = await websiteService.findUnique(ctx, targetWebsiteId);

    if (!website) {
      return apiErrors.notFound('Website not found or access denied');
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const googleRedirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/website-builder/google-oauth/callback`;

    if (!googleClientId || !googleClientSecret) {
      return apiErrors.internal('Google OAuth not configured',);
    }

    // Exchange code for tokens
    const tokens = await googleSearchConsole.getTokensFromCode(
      code,
      googleClientId,
      googleClientSecret,
      googleRedirectUri
    );

    // Update website with tokens
    await websiteService.update(ctx, targetWebsiteId, {
      googleSearchConsoleAccessToken: tokens.accessToken,
      googleSearchConsoleRefreshToken: tokens.refreshToken,
      googleSearchConsoleTokenExpiry: tokens.expiryDate,
      googleSearchConsoleVerified: false, // Will be verified during build
    });

    return NextResponse.json({
      success: true,
      message: 'Google Search Console connected successfully',
    });
  } catch (error: any) {
    console.error('Error exchanging OAuth code:', error);
    return apiErrors.internal(error.message || 'Failed to exchange authorization code');
  }
}
