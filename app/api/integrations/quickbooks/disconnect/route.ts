import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";

/**
 * POST /api/integrations/quickbooks/disconnect
 * Disconnects QuickBooks integration
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Clear QuickBooks config
    await getMetaDb().user.update({
      where: { id: session.user.id },
      data: {
        quickbooksConfig: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("QuickBooks disconnect error:", error);
    return apiErrors.internal("Failed to disconnect QuickBooks", error.message);
  }
}
