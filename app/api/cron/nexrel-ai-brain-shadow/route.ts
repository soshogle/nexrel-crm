import { NextRequest, NextResponse } from "next/server";
import { getMetaDb } from "@/lib/db/meta-db";
import { createDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { runNexrelAiBrainShadow } from "@/lib/nexrel-ai-brain/shadow-runner";
import { apiErrors } from "@/lib/api-error";

function isAuthorizedCron(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function runShadowCron(request: NextRequest) {
  try {
    if (!isAuthorizedCron(request)) {
      return apiErrors.unauthorized();
    }

    const limit = Number(
      new URL(request.url).searchParams.get("limit") || "100",
    );
    const owners = await getMetaDb().user.findMany({
      where: { role: "BUSINESS_OWNER", deletedAt: null },
      select: { id: true, industry: true },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    let executed = 0;
    let blocked = 0;
    let failed = 0;

    for (const owner of owners) {
      try {
        const ctx = createDalContext(owner.id, owner.industry);
        const shadow = await runNexrelAiBrainShadow({
          tenantId: ctx.userId,
          userId: owner.id,
          route: "/api/cron/nexrel-ai-brain-shadow",
          message: "daily ai brain shadow check",
          conversationHistoryCount: 0,
          contextKeys: ["cron", "shadow"],
        });

        if (shadow.executed) executed += 1;
        else blocked += 1;

        await getCrmDb(ctx).auditLog.create({
          data: {
            userId: owner.id,
            action: "SETTINGS_MODIFIED",
            severity: "LOW",
            entityType: "NEXREL_AI_BRAIN_SHADOW_CRON",
            entityId: shadow.runId,
            metadata: {
              route: "/api/cron/nexrel-ai-brain-shadow",
              mode: shadow.mode,
              executed: shadow.executed,
              policyDecision: shadow.policyDecision,
            },
            success: true,
          },
        });
      } catch (error) {
        failed += 1;
        console.error("[nexrel-ai-brain] shadow cron owner failure", {
          ownerId: owner.id,
          error,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalOwners: owners.length,
      executed,
      blocked,
      failed,
    });
  } catch (error: any) {
    console.error("[nexrel-ai-brain] shadow cron error", error);
    return apiErrors.internal(error.message || "Failed shadow cron run");
  }
}

export async function GET(request: NextRequest) {
  return runShadowCron(request);
}

export async function POST(request: NextRequest) {
  return runShadowCron(request);
}
