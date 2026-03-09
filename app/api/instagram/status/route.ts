import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Check Instagram Connection Status
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
        channelType: "INSTAGRAM",
        status: "CONNECTED",
      },
      select: {
        id: true,
        displayName: true,
        channelIdentifier: true,
        tokenExpiresAt: true,
        lastSyncedAt: true,
        isActive: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    return NextResponse.json({
      isConnected: true,
      ...connection,
    });
  } catch (error: any) {
    console.error("❌ Error checking Instagram status:", error);
    return apiErrors.internal(
      error.message || "Failed to check Instagram status",
    );
  }
}
