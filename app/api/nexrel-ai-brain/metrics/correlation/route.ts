import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { apiErrors } from "@/lib/api-error";
import {
  collectAIBrainOperationalMetrics,
  collectCrmOutcomeMetrics,
  correlateWithBaseline,
  evaluateGovernanceAlerts,
  getGovernanceThresholds,
  getLatestGovernanceBaselineSnapshot,
  parseMetricsWindowDays,
} from "@/lib/nexrel-ai-brain/governance-analytics";

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

    const days = parseMetricsWindowDays(
      new URL(request.url).searchParams.get("days"),
      30,
    );
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [operational, crm, baseline] = await Promise.all([
      collectAIBrainOperationalMetrics(ctx, since),
      collectCrmOutcomeMetrics(ctx, since),
      getLatestGovernanceBaselineSnapshot(ctx),
    ]);

    const correlation = correlateWithBaseline(
      { aiBrain: operational, crm },
      baseline,
    );
    const thresholds = getGovernanceThresholds();
    const alerts = evaluateGovernanceAlerts({
      operational,
      correlation,
      thresholds,
    });

    return NextResponse.json({
      success: true,
      windowDays: days,
      since: since.toISOString(),
      baseline,
      metrics: {
        aiBrain: operational,
        crm,
      },
      correlation,
      alerts,
    });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] correlation metrics error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch KPI correlation",
    );
  }
}
