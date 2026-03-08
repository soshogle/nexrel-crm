import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }
    const db = getCrmDb(ctx);

    const { id } = await params;

    await db.smsCampaign.updateMany({
      where: {
        id,
        userId: ctx.userId,
      },
      data: {
        status: "PAUSED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return apiErrors.internal("Failed to pause campaign");
  }
}
