import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
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

    const sequence = await db.smsSequence.update({
      where: { id: sequenceId },
      data: body,
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    console.error("Error updating sequence:", error);
    return apiErrors.internal("Failed to update sequence");
  }
}

export async function DELETE(
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
    const campaign = await db.smsCampaign.findFirst({
      where: {
        id,
        userId: ctx.userId,
      },
    });

    if (!campaign) {
      return apiErrors.notFound("Campaign not found");
    }

    await db.smsSequence.delete({
      where: { id: sequenceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting sequence:", error);
    return apiErrors.internal("Failed to delete sequence");
  }
}
