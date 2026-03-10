import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { apiErrors } from "@/lib/api-error";
import { resolveDalContext } from "@/lib/context/industry-context";
import { runNexrelAiBrainOperator } from "@/lib/nexrel-ai-brain/operator";
import {
  NEXREL_AI_BRAIN_TRACE_HEADER,
  buildPipedaEvidenceArtifact,
  resolveNexrelAiBrainTraceId,
} from "@/lib/nexrel-ai-brain/controls";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runOperatorCron(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    const traceId = resolveNexrelAiBrainTraceId(request);

    const limit = Number(
      new URL(request.url).searchParams.get("limit") || "50",
    );
    const owners = await getMetaDb().user.findMany({
      where: { role: "BUSINESS_OWNER", deletedAt: null },
      select: { id: true, email: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    let executed = 0;
    let failed = 0;
    const runIds: string[] = [];

    for (const owner of owners) {
      try {
        const ctx = await resolveDalContext(owner.id);
        const result = await runNexrelAiBrainOperator({
          tenantId: owner.id,
          userId: owner.id,
          surface: "cron",
          objective:
            "Daily operator sweep: create follow-up task when opportunities require manual review.",
          ctx,
          requestedActions: [
            {
              type: "CREATE_TASK",
              riskTier: "LOW",
              reason: "Daily operator housekeeping",
              payload: {
                title: "Daily AI Brain Operations Check",
                description:
                  "Review pending approvals, overdue follow-ups, and campaign draft queue.",
                priority: "LOW",
              },
            },
          ],
          traceId,
        });
        await getMetaDb().auditLog.create({
          data: {
            userId: owner.id,
            action: "SETTINGS_MODIFIED",
            severity: "LOW",
            entityType: "NEXREL_AI_BRAIN_OPERATOR_CRON",
            entityId: result.runId,
            metadata: {
              traceId,
              surface: "cron",
              pipedaEvidence: buildPipedaEvidenceArtifact({
                control: "operator_run",
                traceId,
                runId: result.runId,
                route: "/api/cron/nexrel-ai-brain-operator",
                surface: "cron",
              }),
            },
            success: true,
          },
        });
        runIds.push(result.runId);
        executed += 1;
      } catch (error) {
        failed += 1;
        console.error("[nexrel-ai-brain] operator cron owner failure", {
          ownerId: owner.id,
          error,
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      totalOwners: owners.length,
      executed,
      failed,
      runIds,
    });
    response.headers.set(NEXREL_AI_BRAIN_TRACE_HEADER, traceId);
    return response;
  } catch (error: any) {
    console.error("[nexrel-ai-brain] operator cron error", error);
    return apiErrors.internal(error.message || "Failed operator cron run");
  }
}

export async function GET(request: NextRequest) {
  return runOperatorCron(request);
}

export async function POST(request: NextRequest) {
  return runOperatorCron(request);
}
