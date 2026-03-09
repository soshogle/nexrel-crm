import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Facebook OAuth Callback
 * Exchanges authorization code for access token and saves connection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      console.error("Facebook OAuth error:", error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?facebook_error=${error}`,
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?error=missing_params`,
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.id !== state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?error=unauthorized`,
      );
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/dashboard/settings?error=unauthorized`,
      );
    }
    const db = getCrmDb(ctx);

    // Exchange code for access token
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/facebook/oauth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error("Facebook credentials not configured");
    }

    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${clientId}&` +
        `client_secret=${clientSecret}&` +
        `code=${code}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}`,
    );

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    console.log("✅ Received Facebook access token");

    // Get user's Facebook pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`,
    );

    if (!pagesResponse.ok) {
      throw new Error("Failed to fetch Facebook pages");
    }

    const pagesData = await pagesResponse.json();
    const pages = pagesData.data || [];

    console.log(`📄 Found ${pages.length} Facebook pages`);

    // Save each page as a separate channel connection
    for (const page of pages) {
      const pageId = page.id;
      const pageName = page.name;
      const pageAccessToken = page.access_token; // Long-lived page token

      // Check if connection already exists
      const existingConnection = await db.channelConnection.findFirst({
        where: {
          userId: session.user.id,
          providerType: "FACEBOOK",
          channelIdentifier: pageId,
        },
      });

      if (existingConnection) {
        // Update existing connection
        await db.channelConnection.update({
          where: { id: existingConnection.id },
          data: {
            accessToken: pageAccessToken,
            refreshToken: accessToken, // User token for refresh
            displayName: pageName,
            status: "CONNECTED",
            lastSyncedAt: new Date(),
          },
        });
        console.log(
          `✅ Updated existing Messenger connection for page: ${pageName}`,
        );
      } else {
        // Create new connection
        await db.channelConnection.create({
          data: {
            userId: session.user.id,
            providerType: "FACEBOOK",
            channelType: "FACEBOOK_MESSENGER",
            channelIdentifier: pageId,
            accessToken: pageAccessToken,
            refreshToken: accessToken,
            displayName: pageName,
            status: "CONNECTED",
            lastSyncedAt: new Date(),
          },
        });
        console.log(
          `✅ Created new Messenger connection for page: ${pageName}`,
        );
      }
    }

    // Redirect back to settings with success
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?facebook_connected=true&pages=${pages.length}`,
    );
  } catch (error: any) {
    console.error("❌ Facebook OAuth callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/dashboard/settings?error=${encodeURIComponent(error.message)}`,
    );
  }
}
