import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";
import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import {
  NEXREL_AI_BRAIN_TRACE_HEADER,
  buildPipedaEvidenceArtifact,
  resolveNexrelAiBrainTraceId,
} from "@/lib/nexrel-ai-brain/controls";
import {
  collectAIBrainOperationalMetrics,
  collectCrmOutcomeMetrics,
  correlateWithBaseline,
  evaluateGovernanceAlerts,
  getGovernanceThresholds,
  getLatestGovernanceBaselineSnapshot,
  parseMetricsWindowDays,
} from "@/lib/nexrel-ai-brain/governance-analytics";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runDigestCron(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) return apiErrors.unauthorized();

    const traceId = resolveNexrelAiBrainTraceId(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const days = parseMetricsWindowDays(url.searchParams.get("days"), 7);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const owners = await getMetaDb().user.findMany({
      where: { role: "BUSINESS_OWNER", deletedAt: null },
      select: { id: true, email: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    let processed = 0;
    let failed = 0;
    let totalAlerts = 0;
    const thresholds = getGovernanceThresholds();

    for (const owner of owners) {
      try {
        const ctx = await resolveDalContext(owner.id);
        const [operational, crm, baseline] = await Promise.all([
          collectAIBrainOperationalMetrics(ctx, since),
          collectCrmOutcomeMetrics(ctx, since),
          getLatestGovernanceBaselineSnapshot(ctx),
        ]);
        const correlation = correlateWithBaseline(
          { aiBrain: operational, crm },
          baseline,
        );
        const alerts = evaluateGovernanceAlerts({
          operational,
          correlation,
          thresholds,
        });
        totalAlerts += alerts.length;

        await getCrmDb(ctx).auditLog.create({
          data: {
            userId: owner.id,
            action: "SETTINGS_MODIFIED",
            severity: alerts.some((a) => a.severity === "critical")
              ? "HIGH"
              : alerts.length > 0
                ? "MEDIUM"
                : "LOW",
            entityType: "NEXREL_AI_BRAIN_DIGEST",
            entityId: crypto.randomUUID(),
            metadata: {
              route: "/api/cron/nexrel-ai-brain-digest",
              traceId,
              windowDays: days,
              aiBrain: operational,
              crm,
              correlation,
              alerts,
              pipedaEvidence: buildPipedaEvidenceArtifact({
                control: "operator_run",
                traceId,
                route: "/api/cron/nexrel-ai-brain-digest",
                surface: "cron",
              }),
            },
            success: true,
          },
        });

        processed += 1;
      } catch (error) {
        failed += 1;
        console.error("[nexrel-ai-brain] digest cron owner failure", {
          ownerId: owner.id,
          error,
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      windowDays: days,
      totalOwners: owners.length,
      processed,
      failed,
      totalAlerts,
    });
    response.headers.set(NEXREL_AI_BRAIN_TRACE_HEADER, traceId);
    return response;
  } catch (error: any) {
    console.error("[nexrel-ai-brain] digest cron error", error);
    return apiErrors.internal(
      error?.message || "Failed AI Brain digest cron run",
    );
  }
}

export async function GET(request: NextRequest) {
  return runDigestCron(request);
}

export async function POST(request: NextRequest) {
  return runDigestCron(request);
}
