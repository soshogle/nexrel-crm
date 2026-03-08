/**
 * GET /api/workflows/active-draft - Get current active draft
 * POST /api/workflows/active-draft - Set or clear the user's active workflow draft
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCrmDb } from "@/lib/dal";
import { getDalContextFromSession } from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
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

    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { activeWorkflowDraftId: true },
    });
    return NextResponse.json({
      success: true,
      draftId: user?.activeWorkflowDraftId || null,
    });
  } catch (error: any) {
    console.error("[workflows/active-draft] Error:", error);
    return apiErrors.internal(error?.message || "Failed to get active draft");
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));
    const { draftId } = body;

    await db.user.update({
      where: { id: ctx.userId },
      data: { activeWorkflowDraftId: draftId || null },
    });

    return NextResponse.json({ success: true, draftId: draftId || null });
  } catch (error: any) {
    console.error("[workflows/active-draft] Error:", error);
    return apiErrors.internal(error?.message || "Failed to set active draft");
  }
}
