import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DELETE /api/soshogle/connections/[id] - Disconnect a social media channel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();
    const db = getCrmDb(ctx);

    // Verify ownership
    const connection = await db.channelConnection.findUnique({
      where: { id: params.id },
    });

    if (!connection) {
      return apiErrors.notFound("Connection not found");
    }

    if (connection.userId !== session.user.id) {
      return apiErrors.forbidden();
    }

    // Delete the connection
    await db.channelConnection.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting connection:", error);
    return apiErrors.internal("Failed to delete connection");
  }
}
