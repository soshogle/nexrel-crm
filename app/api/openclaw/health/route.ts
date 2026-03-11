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

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const db = getCrmDb(ctx);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentOps, autonomyPolicy, pendingApprovals] = await Promise.all([
      db.auditLog.findMany({
        where: {
          userId: session.user.id,
          entityType: "OPENCLAW_OPERATION",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          createdAt: true,
          success: true,
          metadata: true,
        },
      }),
      db.auditLog.findFirst({
        where: {
          userId: session.user.id,
          entityType: "OPENCLAW_AUTONOMY_POLICY",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true, createdAt: true },
      }),
      (db as any).aIJob.count({
        where: {
          status: "PENDING",
          input: { path: ["approvalRequired"], equals: true },
          jobType: { startsWith: "nexrel_ai_brain_" },
        },
      }),
    ]);

    const successCount = recentOps.filter((r) => r.success).length;
    const failureCount = recentOps.length - successCount;
    const healthScore = recentOps.length
      ? Math.max(0, Math.round((successCount / recentOps.length) * 100))
      : 100;

    return NextResponse.json({
      success: true,
      window: "24h",
      metrics: {
        operations: recentOps.length,
        successCount,
        failureCount,
        healthScore,
        pendingApprovals,
      },
      autonomyPolicy: autonomyPolicy?.metadata || null,
      recentModes: recentOps.map((row) => ({
        mode: (row.metadata as any)?.mode || "unknown",
        success: row.success,
        at: row.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("[openclaw] health route error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch OpenClaw health",
    );
  }
}
