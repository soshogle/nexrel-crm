import { resolveDalContext } from "@/lib/context/industry-context";
import { getCrmDb } from "@/lib/dal";

type DecisionLogInput = {
  userId: string;
  surface: string;
  objective: string;
  enforced: boolean;
  allowed: boolean;
  mode?: string;
  deniedActions?: Array<{ type: string; reason: string }>;
  pendingApprovals?: Array<{ jobId: string; type: string }>;
  predictedImpact?: {
    leadVelocity?: number;
    conversionLift?: number;
    riskScore?: number;
  };
};

export async function logNexrelAIDecision(input: DecisionLogInput) {
  try {
    const ctx = await resolveDalContext(input.userId);
    const db = getCrmDb(ctx);
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: "SETTINGS_MODIFIED",
        severity: input.allowed ? "LOW" : "MEDIUM",
        entityType: "NEXREL_AI_BRAIN_DECISION",
        entityId: crypto.randomUUID(),
        metadata: {
          surface: input.surface,
          objective: input.objective.slice(0, 400),
          enforced: input.enforced,
          allowed: input.allowed,
          mode: input.mode || null,
          deniedActions: input.deniedActions || [],
          pendingApprovals: input.pendingApprovals || [],
          predictedImpact: input.predictedImpact || {
            leadVelocity: 0,
            conversionLift: 0,
            riskScore: input.allowed ? 0.2 : 0.8,
          },
          recordedAt: new Date().toISOString(),
        },
        success: true,
      },
    });
  } catch (error) {
    console.error("[nexrel-ai-brain] decision log failed", error);
  }
}

export async function logNexrelAIOutcome(input: {
  userId: string;
  decisionEntityId: string;
  actual: {
    leadsDelta?: number;
    conversionDelta?: number;
    revenueDelta?: number;
    notes?: string;
  };
}) {
  try {
    const ctx = await resolveDalContext(input.userId);
    const db = getCrmDb(ctx);
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: "SETTINGS_MODIFIED",
        severity: "LOW",
        entityType: "NEXREL_AI_BRAIN_OUTCOME",
        entityId: input.decisionEntityId,
        metadata: {
          actual: input.actual,
          recordedAt: new Date().toISOString(),
        },
        success: true,
      },
    });
  } catch (error) {
    console.error("[nexrel-ai-brain] outcome log failed", error);
  }
}

export async function logNexrelAIExecutionOutcome(input: {
  userId: string;
  surface: string;
  objective: string;
  actual: {
    processed?: number;
    sent?: number;
    failed?: number;
    blocked?: number;
    notes?: string;
    [key: string]: any;
  };
}) {
  try {
    const ctx = await resolveDalContext(input.userId);
    const db = getCrmDb(ctx);
    await db.auditLog.create({
      data: {
        userId: input.userId,
        action: "SETTINGS_MODIFIED",
        severity: "LOW",
        entityType: "NEXREL_AI_BRAIN_OUTCOME",
        entityId: crypto.randomUUID(),
        metadata: {
          surface: input.surface,
          objective: input.objective,
          actual: input.actual,
          recordedAt: new Date().toISOString(),
        },
        success: true,
      },
    });
  } catch (error) {
    console.error("[nexrel-ai-brain] execution outcome log failed", error);
  }
}
