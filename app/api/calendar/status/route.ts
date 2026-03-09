import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Get calendar connection status
 * GET /api/calendar/status
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const connection = await getCrmDb(ctx).calendarConnection.findFirst({
      where: {
        userId: session.user.id,
        provider: "GOOGLE",
      },
      select: {
        id: true,
        provider: true,
        calendarName: true,
        syncEnabled: true,
        syncStatus: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      isConnected: !!connection,
      connection: connection || null,
    });
  } catch (error: any) {
    console.error("Error checking calendar status:", error);
    return apiErrors.internal(
      error.message || "Failed to check calendar status",
    );
  }
}
