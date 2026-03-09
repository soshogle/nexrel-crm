import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Check WhatsApp Business connection status
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
        channelType: "WHATSAPP",
        status: "CONNECTED",
      },
      select: {
        id: true,
        channelIdentifier: true,
        displayName: true,
        status: true,
        providerAccountId: true,
        createdAt: true,
        syncEnabled: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ isConnected: false });
    }

    return NextResponse.json({
      isConnected: true,
      connection: {
        ...connection,
        phoneNumber: connection.displayName || "WhatsApp Business",
      },
    });
  } catch (error: any) {
    console.error("WhatsApp status check error:", error);
    return apiErrors.internal(
      error.message || "Failed to check WhatsApp status",
    );
  }
}
