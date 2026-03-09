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

    const connections = await getCrmDb(ctx).channelConnection.findMany({
      where: {
        userId: session.user.id,
        providerType: "FACEBOOK",
        channelType: "FACEBOOK_MESSENGER",
        status: "CONNECTED",
      },
      select: {
        id: true,
        displayName: true,
        channelIdentifier: true,
        status: true,
        lastSyncedAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      isConnected: connections.length > 0,
      pages: connections,
    });
  } catch (error: any) {
    console.error("Error checking Facebook status:", error);
    return apiErrors.internal(error.message || "Failed to check status");
  }
}
