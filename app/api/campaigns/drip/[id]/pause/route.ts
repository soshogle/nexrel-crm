import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// POST /api/campaigns/drip/[id]/pause - Pause campaign

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, context: RouteContext) {
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

    const { id } = await context.params;

    // Verify campaign ownership
    const campaign = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    if (campaign.status !== "ACTIVE") {
      return apiErrors.badRequest("Only active campaigns can be paused");
    }

    // Pause campaign
    const updated = await db.emailDripCampaign.update({
      where: { id },
      data: { status: "PAUSED" },
    });

    // Pause all active enrollments
    await db.emailDripEnrollment.updateMany({
      where: {
        campaignId: id,
        status: "ACTIVE",
      },
      data: {
        status: "PAUSED",
        pausedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      campaign: updated,
      message: "Campaign paused successfully",
    });
  } catch (error: unknown) {
    console.error("Error pausing campaign:", error);
    return apiErrors.internal("Failed to pause campaign");
  }
}
