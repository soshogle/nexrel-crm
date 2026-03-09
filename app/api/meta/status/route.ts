import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Check Meta connection status
 * GET /api/meta/status
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Check for Meta credentials
    const metaSettings = await db.socialMediaSettings.findFirst({
      where: {
        userId: session.user.id,
        platform: "META",
      },
    });

    const hasCredentials = !!(metaSettings?.appId && metaSettings?.appSecret);

    // Check for active connection
    const connection = await db.channelConnection.findFirst({
      where: {
        userId: session.user.id,
        channelType: "INSTAGRAM",
        providerType: "META",
      },
      select: {
        id: true,
        displayName: true,
        channelIdentifier: true,
        status: true,
        expiresAt: true,
        metadata: true,
        createdAt: true,
      },
    });

    console.log("📊 Meta status check:", {
      hasCredentials,
      isConnected: !!connection,
    });

    return NextResponse.json({
      hasCredentials,
      isConnected: !!connection,
      connection: connection || null,
    });
  } catch (error: any) {
    console.error("❌ Meta status check error:", error);
    return apiErrors.internal(error.message || "Failed to check Meta status");
  }
}
