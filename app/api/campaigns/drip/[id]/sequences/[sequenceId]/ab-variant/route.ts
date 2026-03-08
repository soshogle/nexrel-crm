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
  { params }: { params: Promise<{ id: string; sequenceId: string }> },
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

    const { id, sequenceId } = await params;
    const body = await request.json();
    const { variantA, variantB, splitPercentage } = body;

    // Verify campaign exists and belongs to user
    const campaign = await db.emailDripCampaign.findFirst({
      where: {
        id,
        userId: ctx.userId,
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    // Get the original sequence
    const originalSequence = await db.emailDripSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!originalSequence || originalSequence.campaignId !== id) {
      return apiErrors.notFound("Sequence not found");
    }

    // Update original sequence to be variant A
    await db.emailDripSequence.update({
      where: { id: sequenceId },
      data: {
        ...variantA,
        isAbTestVariant: true,
        abTestGroup: "A",
      },
    });

    // Check if variant B already exists
    const existingVariantB = await db.emailDripSequence.findFirst({
      where: {
        campaignId: id,
        variantOf: sequenceId,
        abTestGroup: "B",
      },
    });

    if (existingVariantB) {
      // Update existing variant B
      await db.emailDripSequence.update({
        where: { id: existingVariantB.id },
        data: variantB,
      });
    } else {
      // Create new variant B
      await db.emailDripSequence.create({
        data: {
          campaignId: id,
          sequenceOrder: originalSequence.sequenceOrder,
          name: `${originalSequence.name} (Variant B)`,
          ...variantB,
          delayDays: originalSequence.delayDays,
          delayHours: originalSequence.delayHours,
          sendTime: originalSequence.sendTime,
          isAbTestVariant: true,
          abTestGroup: "B",
          variantOf: sequenceId,
        },
      });
    }

    // Update campaign A/B test config
    await db.emailDripCampaign.update({
      where: { id },
      data: {
        abTestConfig: {
          splitPercentage,
          sequenceId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating A/B test variant:", error);
    return apiErrors.internal("Failed to create A/B test variant");
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sequenceId: string }> },
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

    const { id, sequenceId } = await params;

    // Verify campaign exists and belongs to user
    const campaign = await db.emailDripCampaign.findFirst({
      where: {
        id,
        userId: ctx.userId,
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    // Get variant A (original)
    const variantA = await db.emailDripSequence.findUnique({
      where: { id: sequenceId },
    });

    if (!variantA) {
      return apiErrors.notFound("Sequence not found");
    }

    // Get variant B
    const variantB = await db.emailDripSequence.findFirst({
      where: {
        campaignId: id,
        variantOf: sequenceId,
        abTestGroup: "B",
      },
    });

    return NextResponse.json({
      variantA,
      variantB,
      abTestConfig: campaign.abTestConfig,
    });
  } catch (error) {
    console.error("Error fetching A/B test variants:", error);
    return apiErrors.internal("Failed to fetch A/B test variants");
  }
}
