import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/campaigns/drip/[id]/sequences - List sequences

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

    // Verify campaign ownership
    const campaign = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    const sequences = await db.emailDripSequence.findMany({
      where: { campaignId: id },
      orderBy: { sequenceOrder: "asc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json(sequences);
  } catch (error: unknown) {
    console.error("Error fetching sequences:", error);
    return apiErrors.internal("Failed to fetch sequences");
  }
}

// POST /api/campaigns/drip/[id]/sequences - Create sequence
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
    const body = await req.json();

    // Verify campaign ownership
    const campaign = await db.emailDripCampaign.findFirst({
      where: { id, userId: ctx.userId },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    // Don't allow adding sequences to active campaigns
    if (campaign.status === "ACTIVE") {
      return apiErrors.badRequest(
        "Cannot add sequences to active campaign. Pause it first.",
      );
    }

    const {
      name,
      subject,
      previewText,
      htmlContent,
      textContent,
      sequenceOrder,
      delayDays = 0,
      delayHours = 0,
      sendTime,
      sendConditions,
      skipIfEngaged = false,
      isAbTestVariant = false,
      abTestGroup,
      variantOf,
    } = body;

    // Validate required fields
    if (!name || !subject || !htmlContent) {
      return apiErrors.badRequest("Name, subject, and content are required");
    }

    // Determine sequence order if not provided
    let order = sequenceOrder;
    if (!order) {
      const lastSequence = await db.emailDripSequence.findFirst({
        where: { campaignId: id },
        orderBy: { sequenceOrder: "desc" },
      });
      order = (lastSequence?.sequenceOrder || 0) + 1;
    }

    const sequence = await db.emailDripSequence.create({
      data: {
        campaignId: id,
        name,
        subject,
        previewText,
        htmlContent,
        textContent,
        sequenceOrder: order,
        delayDays,
        delayHours,
        sendTime,
        sendConditions,
        skipIfEngaged,
        isAbTestVariant,
        abTestGroup,
        variantOf,
      },
    });

    return NextResponse.json(sequence, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating sequence:", error);
    return apiErrors.internal("Failed to create sequence");
  }
}
