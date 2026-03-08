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
    const body = await request.json();
    const {
      sequenceOrder,
      name,
      message,
      delayDays,
      delayHours,
      sendTime,
      skipIfReplied,
      sendConditions,
    } = body;

    // Verify campaign exists and belongs to user
    const campaign = await db.smsCampaign.findFirst({
      where: {
        id,
        userId: ctx.userId,
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    const sequence = await db.smsSequence.create({
      data: {
        campaignId: id,
        sequenceOrder,
        name,
        message,
        delayDays: delayDays || 0,
        delayHours: delayHours || 0,
        sendTime,
        skipIfReplied: skipIfReplied || false,
        sendConditions: sendConditions ?? undefined,
      },
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error("Error creating sequence:", error);
    return apiErrors.internal("Failed to create sequence");
  }
}
