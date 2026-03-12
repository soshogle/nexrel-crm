import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ENTITY_TYPES = [
  "AUTONOMY_CONTROL_POLICY",
  "OPENCLAW_OPERATION",
  "AUTONOMY_DRAFT_ACTION",
  "NEXREL_AI_BRAIN_OPERATOR_APPROVAL",
  "NEXREL_AI_BRAIN_OPERATOR_REJECTION",
  "NEXREL_AI_BRAIN_OPERATOR_RUN",
  "AUTONOMY_SCHEDULER_RUN",
] as const;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const limit = Math.max(
      20,
      Math.min(
        500,
        Number(new URL(request.url).searchParams.get("limit") || "150"),
      ),
    );

    const db = getCrmDb(ctx);
    const logs = await db.auditLog.findMany({
      where: {
        userId: ctx.userId,
        entityType: { in: [...ENTITY_TYPES] },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        userId: true,
        action: true,
        severity: true,
        entityType: true,
        entityId: true,
        metadata: true,
        success: true,
        errorMessage: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, timeline: logs });
  } catch (error: any) {
    console.error("[agent-command-center] audit GET error", error);
    return apiErrors.internal(
      error?.message || "Failed to load audit timeline",
    );
  }
}
