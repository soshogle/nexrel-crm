import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getDalContextFromSession,
  resolveDalContext,
} from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";
import { apiErrors } from "@/lib/api-error";
import { WORK_AI_PHASES } from "@/lib/work-ai-marketing";
import { VIRAL_LOOP_PHASES } from "@/lib/viral-loop";
import { SALES_SQUAD_PHASES } from "@/lib/sales-squad";
import {
  buildSalesReadiness,
  buildViralReadiness,
  buildWorkAiReadiness,
} from "@/lib/openclaw-readiness";

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

    const [
      recentOps,
      autonomyPolicy,
      pendingApprovals,
      workAiLaunch,
      viralLaunch,
      salesLaunch,
      connectedNativeSocialChannels,
    ] = await Promise.all([
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
      db.auditLog.findFirst({
        where: {
          userId: session.user.id,
          entityType: "WORK_AI_OFFER_LAUNCH",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      }),
      db.auditLog.findFirst({
        where: {
          userId: session.user.id,
          entityType: "VIRAL_LOOP_PROJECT",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      }),
      db.auditLog.findFirst({
        where: {
          userId: session.user.id,
          entityType: "SALES_SQUAD_PROJECT",
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      }),
      db.channelConnection.count({
        where: {
          userId: session.user.id,
          status: "CONNECTED",
          isActive: true,
          channelType: { in: ["INSTAGRAM", "FACEBOOK_MESSENGER"] },
          accessToken: { not: null },
        },
      }),
    ]);

    const successCount = recentOps.filter((r) => r.success).length;
    const failureCount = recentOps.length - successCount;
    const healthScore = recentOps.length
      ? Math.max(0, Math.round((successCount / recentOps.length) * 100))
      : 100;

    const workAi = workAiLaunch?.metadata as any;
    const completedPhases = workAi?.phaseStatus
      ? Object.values(workAi.phaseStatus).filter((v: any) => v === "completed")
          .length
      : 0;
    const currentPhaseName =
      WORK_AI_PHASES.find((p) => p.id === Number(workAi?.currentPhase || 1))
        ?.name || null;

    const viral = viralLaunch?.metadata as any;
    const viralCompletedPhases = viral?.phaseStatus
      ? Object.values(viral.phaseStatus).filter((v: any) => v === "completed")
          .length
      : 0;
    const viralCurrentPhaseName =
      VIRAL_LOOP_PHASES.find((p) => p.id === Number(viral?.currentPhase || 1))
        ?.name || null;

    const sales = salesLaunch?.metadata as any;
    const salesCompletedPhases = sales?.phaseStatus
      ? Object.values(sales.phaseStatus).filter((v: any) => v === "completed")
          .length
      : 0;
    const salesCurrentPhaseName =
      SALES_SQUAD_PHASES.find((p) => p.id === Number(sales?.currentPhase || 1))
        ?.name || null;

    const hunterConfigured = Boolean(
      process.env.HUNTER_API_KEY || process.env.HUNTER_IO_API_KEY,
    );
    const clearbitConfigured = Boolean(process.env.CLEARBIT_API_KEY);

    const readiness = {
      socialNativeDraftingReady: connectedNativeSocialChannels > 0,
      connectedNativeSocialChannels,
      enrichmentKeys: {
        hunterConfigured,
        clearbitConfigured,
        anyConfigured: hunterConfigured || clearbitConfigured,
      },
      workAi: buildWorkAiReadiness((workAi as any) || null),
      viralLoop: buildViralReadiness((viral as any) || null),
      salesSquad: buildSalesReadiness((sales as any) || null),
    };

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
      workAi: workAi
        ? {
            launchId: workAi.launchId,
            offerName: workAi.offerName,
            selectedNiche: workAi.selectedNiche,
            currentPhase: workAi.currentPhase,
            currentPhaseName,
            completedPhases,
            totalPhases: WORK_AI_PHASES.length,
          }
        : null,
      viralLoop: viral
        ? {
            projectId: viral.projectId,
            projectName: viral.projectName,
            niche: viral.niche,
            conversionGoal: viral.conversionGoal,
            currentPhase: viral.currentPhase,
            currentPhaseName: viralCurrentPhaseName,
            completedPhases: viralCompletedPhases,
            totalPhases: VIRAL_LOOP_PHASES.length,
            trustStage: viral.trustStage,
          }
        : null,
      salesSquad: sales
        ? {
            squadId: sales.squadId,
            squadName: sales.squadName,
            primaryGoal: sales.primaryGoal,
            currentPhase: sales.currentPhase,
            currentPhaseName: salesCurrentPhaseName,
            completedPhases: salesCompletedPhases,
            totalPhases: SALES_SQUAD_PHASES.length,
            trustStage: sales.trustStage,
          }
        : null,
      readiness,
    });
  } catch (error: any) {
    console.error("[openclaw] health route error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch OpenClaw health",
    );
  }
}
