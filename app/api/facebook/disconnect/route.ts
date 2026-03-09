import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Disconnects Facebook Messenger
 * DELETE /api/facebook/disconnect
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    // Delete Facebook connection
    await getCrmDb(ctx).channelConnection.deleteMany({
      where: {
        userId: session.user.id,
        channelType: "FACEBOOK_MESSENGER",
        providerType: "FACEBOOK",
      },
    });

    console.log(
      "📤 Facebook Messenger disconnected for user:",
      session.user.id,
    );

    return NextResponse.json({
      success: true,
      message: "Facebook Messenger disconnected successfully",
    });
  } catch (error: any) {
    console.error("Error disconnecting Facebook:", error);
    return apiErrors.internal(error.message || "Failed to disconnect Facebook");
  }
}
