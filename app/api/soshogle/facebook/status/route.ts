import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Check Facebook Messenger connection status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const connection = await getCrmDb(ctx).channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: "FACEBOOK_MESSENGER",
        status: "CONNECTED",
      },
      select: {
        id: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        syncEnabled: true,
        providerData: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    // Check if token is expired
    const isExpired =
      connection.expiresAt && new Date(connection.expiresAt) < new Date();

    return NextResponse.json({
      isConnected: !isExpired,
      connection: {
        ...connection,
        pageName: connection.displayName || "Facebook Page",
      },
      needsRefresh: isExpired,
    });
  } catch (error: any) {
    console.error("Facebook status check error:", error);
    return apiErrors.internal(
      error.message || "Failed to check Facebook status",
    );
  }
}
