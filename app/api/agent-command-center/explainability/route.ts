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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const params = new URL(request.url).searchParams;
    const limit = Math.max(
      10,
      Math.min(200, Number(params.get("limit") || "50")),
    );
    const surfaceFilter = String(params.get("surface") || "")
      .trim()
      .toLowerCase();
    const allowedFilter = String(params.get("allowed") || "")
      .trim()
      .toLowerCase();
    const sinceDays = Math.max(
      1,
      Math.min(90, Number(params.get("days") || "14")),
    );
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const db = getCrmDb(ctx);

    const [decisionRows, outcomeRows] = await Promise.all([
      db.auditLog.findMany({
        where: {
          userId: ctx.userId,
          entityType: "NEXREL_AI_BRAIN_DECISION",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
          id: true,
          entityId: true,
          createdAt: true,
          metadata: true,
          success: true,
        },
      }),
      db.auditLog.findMany({
        where: {
          userId: ctx.userId,
          entityType: "NEXREL_AI_BRAIN_OUTCOME",
          createdAt: { gte: since },
        },
        orderBy: { createdAt: "desc" },
        take: limit * 2,
        select: {
          entityId: true,
          createdAt: true,
          metadata: true,
        },
      }),
    ]);

    const outcomeMap = new Map<string, any>();
    for (const row of outcomeRows) {
      const key = String(row.entityId || "").trim();
      if (!key || outcomeMap.has(key)) continue;
      outcomeMap.set(key, {
        createdAt: row.createdAt,
        metadata: row.metadata,
      });
    }

    const decisions = decisionRows
      .map((row) => {
        const meta = (row.metadata || {}) as any;
        const outcome = outcomeMap.get(String(row.entityId || ""));
        return {
          id: row.id,
          decisionEntityId: row.entityId,
          createdAt: row.createdAt,
          surface: String(meta?.surface || "unknown").toLowerCase(),
          objective: meta?.objective || "",
          mode: meta?.mode || "unknown",
          allowed: Boolean(meta?.allowed),
          why: Array.isArray(meta?.why) ? meta.why : [],
          deniedActions: Array.isArray(meta?.deniedActions)
            ? meta.deniedActions
            : [],
          pendingApprovals: Array.isArray(meta?.pendingApprovals)
            ? meta.pendingApprovals
            : [],
          predictedImpact: meta?.predictedImpact || null,
          businessProfileRef: meta?.businessProfileRef || null,
          memoryRef: meta?.memoryRef || null,
          outcome: outcome
            ? {
                createdAt: outcome.createdAt,
                actual: (outcome.metadata as any)?.actual || null,
              }
            : null,
        };
      })
      .filter((row) => {
        if (surfaceFilter && row.surface !== surfaceFilter) return false;
        if (allowedFilter === "allowed" && !row.allowed) return false;
        if (allowedFilter === "blocked" && row.allowed) return false;
        return true;
      });

    const summary = {
      total: decisions.length,
      allowed: decisions.filter((d) => d.allowed).length,
      blocked: decisions.filter((d) => !d.allowed).length,
      withOutcome: decisions.filter((d) => d.outcome !== null).length,
      avgRiskScore: decisions.length
        ? Number(
            (
              decisions.reduce(
                (sum, item) =>
                  sum + Number(item.predictedImpact?.riskScore || 0),
                0,
              ) / decisions.length
            ).toFixed(2),
          )
        : 0,
    };

    return NextResponse.json({
      success: true,
      windowDays: sinceDays,
      summary,
      decisions,
    });
  } catch (error: any) {
    console.error("[agent-command-center] explainability GET error", error);
    return apiErrors.internal(
      error?.message || "Failed to load explainability",
    );
  }
}
