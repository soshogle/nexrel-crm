import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";
import {
  getLatestTrustMode,
  setTrustMode,
  type AutonomyTrustMode,
} from "@/lib/agent-command-center";
import { getAutonomyControlPolicy } from "@/lib/agent-command-center-control";
import { runAgentCommandCenterCycle } from "@/lib/agent-command-center-runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isTrustMode(value: string): value is AutonomyTrustMode {
  return value === "crawl" || value === "walk" || value === "run";
}

export async function GET() {
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

    const [
      leadCount,
      dealCount,
      pipelineCount,
      kbCount,
      apiKeys,
      channels,
      workflows,
      executions,
      pendingApprovals,
      trust,
      control,
    ] = await Promise.all([
      db.lead.count({ where: { userId: ctx.userId } }),
      db.deal.count({ where: { userId: ctx.userId } } as any),
      db.pipeline.count({ where: { userId: ctx.userId } }),
      db.knowledgeBase.count({ where: { userId: ctx.userId } }),
      db.apiKey.findMany({
        where: { userId: ctx.userId, isActive: true },
        select: { service: true },
      }),
      db.channelConnection.findMany({
        where: { userId: ctx.userId, isActive: true },
        select: { channelType: true, providerType: true },
      }),
      (db as any).workflowInstance.count({
        where: { userId: ctx.userId, status: "ACTIVE" },
      }),
      (db as any).taskExecution.findMany({
        where: {
          instance: { userId: ctx.userId },
          createdAt: { gte: since },
        },
        select: { status: true },
      }),
      (db as any).hITLNotification.count({
        where: { userId: ctx.userId, isActioned: false },
      }),
      getLatestTrustMode(ctx),
      getAutonomyControlPolicy(ctx),
    ]);

    const keySet = new Set(apiKeys.map((k) => String(k.service).toLowerCase()));
    const channelSet = new Set(
      channels.map(
        (c) =>
          `${String(c.providerType).toLowerCase()}:${String(c.channelType).toLowerCase()}`,
      ),
    );

    const completedExecutions = executions.filter(
      (e: any) => e.status === "COMPLETED",
    ).length;
    const successRate = executions.length
      ? Math.round((completedExecutions / executions.length) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      brain: {
        contactsAndLeads: leadCount,
        deals: dealCount,
        pipelineStages: pipelineCount,
        knowledgeBaseEntries: kbCount,
        selfLearningSignals: completedExecutions,
      },
      integrations: {
        apollo: keySet.has("apollo"),
        hunter: keySet.has("hunter") || keySet.has("hunter.io"),
        nexrelVoiceAi: true,
        nexrelMessaging: true,
        metaAds:
          keySet.has("meta") ||
          keySet.has("facebook_ads") ||
          channelSet.has("meta:facebook"),
        tiktok:
          keySet.has("tiktok") ||
          channelSet.has("social:tiktok") ||
          channelSet.has("tiktok:tiktok"),
        instagram:
          channelSet.has("social:instagram") ||
          channelSet.has("meta:instagram"),
        linkedin: keySet.has("linkedin") || channelSet.has("social:linkedin"),
      },
      workflowEngine: {
        activeWorkflowInstances: workflows,
        executionsLast24h: executions.length,
        successRateLast24h: successRate,
      },
      trustFramework: {
        mode: trust.mode,
        pendingApprovals,
        lastUpdatedAt: trust.updatedAt,
      },
      ownerControl: {
        status: control.policy.status,
        modules: control.policy.modules,
        channels: control.policy.channels,
        windows: control.policy.windows,
        caps: control.policy.caps,
        updatedAt: control.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("[agent-command-center] GET autonomy error", error);
    return apiErrors.internal(error?.message || "Failed to load autonomy data");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const resolvedCtx = await resolveDalContext(session.user.id).catch(
      () => null,
    );
    const ctx = getDalContextFromSession(session) ?? resolvedCtx;
    if (!ctx) return apiErrors.unauthorized();

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    if (action === "set_mode") {
      const mode = String(body?.mode || "crawl").toLowerCase();
      if (!isTrustMode(mode)) {
        return NextResponse.json(
          { success: false, error: "mode must be crawl, walk, or run" },
          { status: 400 },
        );
      }

      await setTrustMode(ctx, mode);
      return NextResponse.json({ success: true, mode });
    }

    if (action === "run_cycle") {
      const result = await runAgentCommandCenterCycle(ctx, {
        enableExternal: Boolean(body?.enableExternal),
        allowPaidLaunch: Boolean(body?.allowPaidLaunch),
        apolloQuery:
          typeof body?.apolloQuery === "string" ? body.apolloQuery : undefined,
        socialMessage:
          typeof body?.socialMessage === "string"
            ? body.socialMessage
            : undefined,
        source: "manual",
      });
      return NextResponse.json(result, { status: result.success ? 200 : 409 });
    }

    return NextResponse.json(
      { success: false, error: "Unsupported action" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[agent-command-center] POST autonomy error", error);
    return apiErrors.internal(
      error?.message || "Failed to execute autonomy action",
    );
  }
}
