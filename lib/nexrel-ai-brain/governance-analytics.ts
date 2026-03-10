import { AIJobStatus } from "@prisma/client";
import { getCrmDb } from "@/lib/dal";
import type { DalContext } from "@/lib/dal/types";

export type AIBrainOperationalMetrics = {
  operatorRuns: number;
  operatorChatRuns: number;
  shadowRuns: number;
  deniedActions: number;
  pendingApprovals: number;
  completedApprovals: number;
  approvalSlaAvgHours: number;
};

export type CrmOutcomeMetrics = {
  leadsCreated: number;
  contactedLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRatePct: number;
  tasksCreated: number;
  tasksCompleted: number;
  taskCompletionRatePct: number;
};

export type GovernanceBaselineSnapshot = {
  baselineId: string;
  createdAt: string;
  windowDays: number;
  aiBrain: AIBrainOperationalMetrics;
  crm: CrmOutcomeMetrics;
};

export type GovernanceCorrelation = {
  aiBrain: {
    operatorRunsDelta: number;
    deniedActionsDelta: number;
    pendingApprovalsDelta: number;
    approvalSlaAvgHoursDelta: number;
  };
  crm: {
    leadsCreatedDelta: number;
    convertedLeadsDelta: number;
    conversionRatePctDelta: number;
    taskCompletionRatePctDelta: number;
  };
};

export type GovernanceThresholds = {
  maxApprovalSlaHours: number;
  maxPendingApprovals: number;
  maxDeniedActions: number;
  maxConversionDropPct: number;
};

export type GovernanceAlert = {
  severity: "warning" | "critical";
  code:
    | "APPROVAL_SLA_BREACH"
    | "PENDING_APPROVAL_BACKLOG"
    | "DENIED_ACTION_SPIKE"
    | "CONVERSION_DROP";
  message: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function calculateAverageHours(
  rows: Array<{ createdAt: Date; completedAt: Date }>,
): number {
  if (rows.length === 0) return 0;
  const totalMs = rows.reduce(
    (sum, row) => sum + (row.completedAt.getTime() - row.createdAt.getTime()),
    0,
  );
  return Number((totalMs / rows.length / (1000 * 60 * 60)).toFixed(2));
}

export function parseMetricsWindowDays(
  rawValue: unknown,
  fallback = 7,
): number {
  const raw = Number(rawValue ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(90, Math.floor(raw)));
}

export function getGovernanceThresholds(): GovernanceThresholds {
  return {
    maxApprovalSlaHours: toNumber(
      process.env.NEXREL_AI_BRAIN_ALERT_MAX_APPROVAL_SLA_HOURS,
      24,
    ),
    maxPendingApprovals: toNumber(
      process.env.NEXREL_AI_BRAIN_ALERT_MAX_PENDING_APPROVALS,
      10,
    ),
    maxDeniedActions: toNumber(
      process.env.NEXREL_AI_BRAIN_ALERT_MAX_DENIED_ACTIONS,
      25,
    ),
    maxConversionDropPct: toNumber(
      process.env.NEXREL_AI_BRAIN_ALERT_MAX_CONVERSION_DROP_PCT,
      5,
    ),
  };
}

export async function collectAIBrainOperationalMetrics(
  ctx: DalContext,
  since: Date,
): Promise<AIBrainOperationalMetrics> {
  const db = getCrmDb(ctx);
  const [
    operatorRuns,
    operatorChatRuns,
    shadowRuns,
    pendingApprovals,
    approvalJobs,
    deniedMetadata,
  ] = await Promise.all([
    db.auditLog.count({
      where: {
        createdAt: { gte: since },
        entityType: "NEXREL_AI_BRAIN_OPERATOR_RUN",
      },
    }),
    db.auditLog.count({
      where: {
        createdAt: { gte: since },
        entityType: "NEXREL_AI_BRAIN_OPERATOR_CHAT",
      },
    }),
    db.auditLog.count({
      where: {
        createdAt: { gte: since },
        entityType: {
          in: ["NEXREL_AI_BRAIN_SHADOW", "NEXREL_AI_BRAIN_SHADOW_CRON"],
        },
      },
    }),
    db.aIJob.count({
      where: {
        createdAt: { gte: since },
        status: AIJobStatus.PENDING,
        input: { path: ["approvalRequired"], equals: true },
        jobType: { startsWith: "nexrel_ai_brain_" },
      },
    }),
    db.aIJob.findMany({
      where: {
        createdAt: { gte: since },
        status: AIJobStatus.COMPLETED,
        completedAt: { not: null },
        input: { path: ["approvalRequired"], equals: true },
        jobType: { startsWith: "nexrel_ai_brain_" },
      },
      select: { createdAt: true, completedAt: true },
    }),
    db.auditLog.findMany({
      where: {
        createdAt: { gte: since },
        entityType: "NEXREL_AI_BRAIN_OPERATOR_RUN",
      },
      select: { metadata: true },
      take: 5000,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const approvalsWithDuration = approvalJobs
    .filter(
      (job): job is { createdAt: Date; completedAt: Date } => !!job.completedAt,
    )
    .map((job) => ({ createdAt: job.createdAt, completedAt: job.completedAt }));

  const deniedActions = deniedMetadata.reduce((sum, row) => {
    const deniedCount = Number((row.metadata as any)?.deniedActionCount || 0);
    return sum + (Number.isFinite(deniedCount) ? deniedCount : 0);
  }, 0);

  return {
    operatorRuns,
    operatorChatRuns,
    shadowRuns,
    deniedActions,
    pendingApprovals,
    completedApprovals: approvalsWithDuration.length,
    approvalSlaAvgHours: calculateAverageHours(approvalsWithDuration),
  };
}

export async function collectCrmOutcomeMetrics(
  ctx: DalContext,
  since: Date,
): Promise<CrmOutcomeMetrics> {
  const db = getCrmDb(ctx);
  const [
    leadsCreated,
    contactedLeads,
    qualifiedLeads,
    convertedLeads,
    tasksCreated,
    tasksCompleted,
  ] = await Promise.all([
    db.lead.count({ where: { createdAt: { gte: since } } }),
    db.lead.count({
      where: { createdAt: { gte: since }, status: "CONTACTED" as any },
    }),
    db.lead.count({
      where: { createdAt: { gte: since }, status: "QUALIFIED" as any },
    }),
    db.lead.count({
      where: { createdAt: { gte: since }, status: "CONVERTED" as any },
    }),
    db.task.count({ where: { createdAt: { gte: since } } }),
    db.task.count({
      where: { createdAt: { gte: since }, status: "COMPLETED" as any },
    }),
  ]);

  return {
    leadsCreated,
    contactedLeads,
    qualifiedLeads,
    convertedLeads,
    conversionRatePct: toPct(convertedLeads, leadsCreated),
    tasksCreated,
    tasksCompleted,
    taskCompletionRatePct: toPct(tasksCompleted, tasksCreated),
  };
}

export function correlateWithBaseline(
  current: { aiBrain: AIBrainOperationalMetrics; crm: CrmOutcomeMetrics },
  baseline?: GovernanceBaselineSnapshot | null,
): GovernanceCorrelation {
  const baseAI = baseline?.aiBrain;
  const baseCRM = baseline?.crm;
  return {
    aiBrain: {
      operatorRunsDelta:
        current.aiBrain.operatorRuns - (baseAI?.operatorRuns || 0),
      deniedActionsDelta:
        current.aiBrain.deniedActions - (baseAI?.deniedActions || 0),
      pendingApprovalsDelta:
        current.aiBrain.pendingApprovals - (baseAI?.pendingApprovals || 0),
      approvalSlaAvgHoursDelta: Number(
        (
          current.aiBrain.approvalSlaAvgHours -
          (baseAI?.approvalSlaAvgHours || 0)
        ).toFixed(2),
      ),
    },
    crm: {
      leadsCreatedDelta:
        current.crm.leadsCreated - (baseCRM?.leadsCreated || 0),
      convertedLeadsDelta:
        current.crm.convertedLeads - (baseCRM?.convertedLeads || 0),
      conversionRatePctDelta: Number(
        (
          current.crm.conversionRatePct - (baseCRM?.conversionRatePct || 0)
        ).toFixed(2),
      ),
      taskCompletionRatePctDelta: Number(
        (
          current.crm.taskCompletionRatePct -
          (baseCRM?.taskCompletionRatePct || 0)
        ).toFixed(2),
      ),
    },
  };
}

export function evaluateGovernanceAlerts(input: {
  operational: AIBrainOperationalMetrics;
  correlation: GovernanceCorrelation;
  thresholds: GovernanceThresholds;
}): GovernanceAlert[] {
  const alerts: GovernanceAlert[] = [];

  if (
    input.operational.approvalSlaAvgHours > input.thresholds.maxApprovalSlaHours
  ) {
    alerts.push({
      severity: "critical",
      code: "APPROVAL_SLA_BREACH",
      message: `Approval SLA average ${input.operational.approvalSlaAvgHours}h exceeds ${input.thresholds.maxApprovalSlaHours}h`,
    });
  }

  if (
    input.operational.pendingApprovals > input.thresholds.maxPendingApprovals
  ) {
    alerts.push({
      severity: "warning",
      code: "PENDING_APPROVAL_BACKLOG",
      message: `Pending approvals ${input.operational.pendingApprovals} exceeds ${input.thresholds.maxPendingApprovals}`,
    });
  }

  if (input.operational.deniedActions > input.thresholds.maxDeniedActions) {
    alerts.push({
      severity: "warning",
      code: "DENIED_ACTION_SPIKE",
      message: `Denied actions ${input.operational.deniedActions} exceeds ${input.thresholds.maxDeniedActions}`,
    });
  }

  if (
    input.correlation.crm.conversionRatePctDelta <
    -Math.abs(input.thresholds.maxConversionDropPct)
  ) {
    alerts.push({
      severity: "critical",
      code: "CONVERSION_DROP",
      message: `Conversion rate dropped ${Math.abs(input.correlation.crm.conversionRatePctDelta)} points vs baseline`,
    });
  }

  return alerts;
}

export async function writeGovernanceBaselineSnapshot(input: {
  ctx: DalContext;
  actorUserId: string;
  windowDays: number;
}): Promise<GovernanceBaselineSnapshot> {
  const since = new Date(Date.now() - input.windowDays * 24 * 60 * 60 * 1000);
  const [aiBrain, crm] = await Promise.all([
    collectAIBrainOperationalMetrics(input.ctx, since),
    collectCrmOutcomeMetrics(input.ctx, since),
  ]);

  const snapshot: GovernanceBaselineSnapshot = {
    baselineId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    windowDays: input.windowDays,
    aiBrain,
    crm,
  };

  const db = getCrmDb(input.ctx);
  await db.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_BRAIN_KPI_BASELINE",
      entityId: snapshot.baselineId,
      metadata: snapshot as any,
      success: true,
    },
  });

  return snapshot;
}

export async function getLatestGovernanceBaselineSnapshot(
  ctx: DalContext,
): Promise<GovernanceBaselineSnapshot | null> {
  const db = getCrmDb(ctx);
  const row = await db.auditLog.findFirst({
    where: { entityType: "NEXREL_AI_BRAIN_KPI_BASELINE" },
    select: { metadata: true },
    orderBy: { createdAt: "desc" },
  });
  if (!row?.metadata) return null;
  const data = row.metadata as any;
  if (!data?.baselineId || !data?.aiBrain || !data?.crm) return null;
  return data as GovernanceBaselineSnapshot;
}
