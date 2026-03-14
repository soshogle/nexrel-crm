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
  WORK_AI_PHASES,
  canRunWorkAiPhase,
  getNextPendingWorkAiPhase,
} from "@/lib/work-ai-marketing";
import {
  getAgentContractVersion,
  getAgentFeatureFlagsForApi,
  getAgentRolloutSnapshot,
  isAgentSystemWriteEnabled,
} from "@/lib/ai-employees/feature-flags";

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

    const [recentOps, autonomyPolicy, pendingApprovals, workAiLaunch] =
      await Promise.all([
        db.auditLog.findMany({
          where: {
            userId: session.user.id,
            entityType: "NEXREL_AI_OPERATION",
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
            entityType: "NEXREL_AI_AUTONOMY_POLICY",
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

    const nextWorkAiPhase = workAi ? getNextPendingWorkAiPhase(workAi) : null;
    const workAiGate =
      workAi && nextWorkAiPhase
        ? canRunWorkAiPhase(workAi, nextWorkAiPhase)
        : null;

    const readiness = {
      workAi: workAi
        ? {
            nextPhase: nextWorkAiPhase,
            runnable: workAiGate ? workAiGate.ok : true,
            reason: workAiGate && !workAiGate.ok ? workAiGate.reason : null,
          }
        : null,
      agentSystem: {
        contractVersion: getAgentContractVersion(),
        writeModeEnabled: isAgentSystemWriteEnabled(),
        flags: getAgentFeatureFlagsForApi(),
        rollout: getAgentRolloutSnapshot(ctx.userId),
      },
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
      readiness,
    });
  } catch (error: any) {
    console.error("[nexrel-ai] health route error", error);
    return apiErrors.internal(
      error?.message || "Failed to fetch Nexrel AI health",
    );
  }
}
