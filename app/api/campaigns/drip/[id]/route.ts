import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/drip/[id] - Get specific campaign

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, context: RouteContext) {
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

    const campaign = await db.emailDripCampaign.findFirst({
      where: {
        id,
        userId: ctx.userId,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: "asc" },
          include: {
            _count: {
              select: { messages: true },
            },
          },
        },
        enrollments: {
          include: {
            messages: {
              select: {
                id: true,
                status: true,
                sentAt: true,
                openedAt: true,
                clickedAt: true,
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
          take: 100,
        },
        _count: {
          select: { enrollments: true, sequences: true },
        },
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    return NextResponse.json({ campaign });
  } catch (error: unknown) {
    console.error("Error fetching campaign:", error);
    return apiErrors.internal("Failed to fetch campaign");
  }
}

// PUT /api/campaigns/drip/[id] - Update campaign
export async function PUT(req: NextRequest, context: RouteContext) {
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
    const body = await req.json();

    // Verify ownership
    const existing = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
    });

    if (!existing) {
      return apiErrors.notFound("Campaign not found");
    }

    // Don't allow updating active campaigns
    if (existing.status === "ACTIVE" && body.status !== "PAUSED") {
      return apiErrors.badRequest(
        "Cannot update active campaign. Pause it first.",
      );
    }

    const {
      name,
      description,
      triggerType,
      triggerConfig,
      fromName,
      fromEmail,
      replyTo,
      enableAbTesting,
      abTestConfig,
      tags,
      status,
    } = body;

    const campaign = await db.emailDripCampaign.update({
      where: { id },
      data: {
        name,
        description,
        triggerType,
        triggerConfig,
        fromName,
        fromEmail,
        replyTo,
        enableAbTesting,
        abTestConfig,
        tags,
        status,
      },
      include: {
        sequences: {
          orderBy: { sequenceOrder: "asc" },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });

    return NextResponse.json({ campaign });
  } catch (error: unknown) {
    console.error("Error updating campaign:", error);
    return apiErrors.internal("Failed to update campaign");
  }
}

// DELETE /api/campaigns/drip/[id] - Delete campaign
export async function DELETE(req: NextRequest, context: RouteContext) {
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

    // Verify ownership
    const campaign = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    // Don't allow deleting active campaigns
    if (campaign.status === "ACTIVE") {
      return apiErrors.badRequest(
        "Cannot delete active campaign. Pause or complete it first.",
      );
    }

    await db.emailDripCampaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting campaign:", error);
    return apiErrors.internal("Failed to delete campaign");
  }
}
