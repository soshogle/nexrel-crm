import { AIJobStatus } from "@prisma/client";
import { getCrmDb } from "@/lib/dal";
import type { DalContext } from "@/lib/dal/types";
import {
  NEXREL_AI_BRAIN_INTERNAL_NAME,
  getNexrelAiBrainPhase,
  isNexrelAiBrainEnabled,
  isNexrelAiBrainGlobalKillSwitchActive,
  isNexrelAiBrainHighRiskApprovalEnabled,
  isNexrelAiBrainHighRiskAutoExecuteEnabled,
  isNexrelAiBrainLowRiskWritesEnabled,
  isTenantKilledForNexrelAiBrain,
  isTenantAllowedForNexrelAiBrain,
} from "@/lib/nexrel-ai-brain/config";
import { buildPipedaEvidenceArtifact } from "@/lib/nexrel-ai-brain/controls";

type RiskTier = "LOW" | "HIGH";
type OperatorRole =
  | "LEAD_RESEARCHER"
  | "CUSTOMER_ONBOARDING"
  | "BOOKING_COORDINATOR"
  | "PROJECT_MANAGER"
  | "COMMUNICATION_SPECIALIST";

export type OperatorActionType =
  | "CREATE_TASK"
  | "UPDATE_LEAD_STATUS"
  | "ADD_LEAD_TAG"
  | "DRAFT_CAMPAIGN_ARTIFACT"
  | "MASS_OUTREACH";

export type OperatorAction = {
  type: OperatorActionType;
  riskTier: RiskTier;
  reason: string;
  payload: Record<string, any>;
};

export type OperatorRunInput = {
  tenantId: string;
  userId: string;
  surface: string;
  objective: string;
  ctx: DalContext;
  actorRole?: OperatorRole;
  traceId?: string;
  requestedActions?: OperatorAction[];
  dryRun?: boolean;
};

export type OperatorRunResult = {
  runId: string;
  phase: 1 | 2 | 3;
  mode: "read_only" | "execute";
  executedActions: Array<{ type: OperatorActionType; result: any }>;
  pendingApprovals: Array<{ jobId: string; type: OperatorActionType }>;
  deniedActions: Array<{ type: OperatorActionType; reason: string }>;
  suggestedActions: OperatorAction[];
};

const SUPPORTED_SURFACES = new Set([
  "assistant",
  "leads",
  "deals",
  "tasks",
  "campaigns",
  "workflows",
  "appointments",
  "dental",
  "real_estate",
  "websites",
  "reviews",
  "billing",
  "cron",
]);

const ROLE_CAPABILITY_MATRIX: Record<OperatorRole, Set<OperatorActionType>> = {
  LEAD_RESEARCHER: new Set(["ADD_LEAD_TAG", "UPDATE_LEAD_STATUS"]),
  CUSTOMER_ONBOARDING: new Set(["CREATE_TASK", "DRAFT_CAMPAIGN_ARTIFACT"]),
  BOOKING_COORDINATOR: new Set(["CREATE_TASK"]),
  PROJECT_MANAGER: new Set([
    "CREATE_TASK",
    "UPDATE_LEAD_STATUS",
    "ADD_LEAD_TAG",
    "DRAFT_CAMPAIGN_ARTIFACT",
    "MASS_OUTREACH",
  ]),
  COMMUNICATION_SPECIALIST: new Set([
    "CREATE_TASK",
    "DRAFT_CAMPAIGN_ARTIFACT",
    "MASS_OUTREACH",
  ]),
};

function normalizeRole(role?: string): OperatorRole {
  const value = String(role || "PROJECT_MANAGER")
    .trim()
    .toUpperCase();
  switch (value) {
    case "LEAD_RESEARCHER":
    case "CUSTOMER_ONBOARDING":
    case "BOOKING_COORDINATOR":
    case "PROJECT_MANAGER":
    case "COMMUNICATION_SPECIALIST":
      return value;
    default:
      return "PROJECT_MANAGER";
  }
}

function normalizeSurface(surface: string): string {
  const normalized = String(surface || "assistant")
    .trim()
    .toLowerCase();
  return SUPPORTED_SURFACES.has(normalized) ? normalized : "assistant";
}

function parseLeadId(input: string): string | null {
  const match = input.match(/\b(c[a-z0-9]{20,})\b/i);
  return match ? match[1] : null;
}

function planActionsFromObjective(objective: string): OperatorAction[] {
  const text = objective.toLowerCase();
  const leadId = parseLeadId(objective);
  const actions: OperatorAction[] = [];

  if (
    text.includes("task") ||
    text.includes("follow up") ||
    text.includes("follow-up")
  ) {
    actions.push({
      type: "CREATE_TASK",
      riskTier: "LOW",
      reason: "Follow-up request detected",
      payload: {
        title: "AI Brain Follow-up Task",
        description: objective.slice(0, 400),
        priority: "MEDIUM",
        ...(leadId ? { leadId } : {}),
      },
    });
  }

  if ((text.includes("lead status") || text.includes("set status")) && leadId) {
    actions.push({
      type: "UPDATE_LEAD_STATUS",
      riskTier: "LOW",
      reason: "Lead status update requested",
      payload: {
        leadId,
        status: text.includes("qualified") ? "QUALIFIED" : "CONTACTED",
      },
    });
  }

  if ((text.includes("tag") || text.includes("label")) && leadId) {
    actions.push({
      type: "ADD_LEAD_TAG",
      riskTier: "LOW",
      reason: "Lead tagging request detected",
      payload: {
        leadId,
        tag: "AI_BRAIN_TAGGED",
      },
    });
  }

  if (text.includes("campaign draft") || text.includes("draft campaign")) {
    actions.push({
      type: "DRAFT_CAMPAIGN_ARTIFACT",
      riskTier: "LOW",
      reason: "Campaign draft request detected",
      payload: {
        title: "AI Campaign Draft",
        summary: objective.slice(0, 500),
      },
    });
  }

  if (
    text.includes("mass sms") ||
    text.includes("mass email") ||
    text.includes("blast")
  ) {
    actions.push({
      type: "MASS_OUTREACH",
      riskTier: "HIGH",
      reason: "High-impact outbound action requested",
      payload: {
        channel: text.includes("sms") ? "sms" : "email",
        summary: objective.slice(0, 500),
      },
    });
  }

  return actions;
}

async function executeLowRiskAction(
  ctx: DalContext,
  action: OperatorAction,
): Promise<any> {
  const db = getCrmDb(ctx);

  if (action.type === "CREATE_TASK") {
    const created = await db.task.create({
      data: {
        userId: ctx.userId,
        title: String(action.payload.title || "AI Brain Task"),
        description: String(action.payload.description || ""),
        priority: String(action.payload.priority || "MEDIUM") as any,
        status: "TODO",
        leadId: action.payload.leadId || null,
        aiSuggested: true,
        tags: ["NEXREL_AI_BRAIN"],
      },
      select: { id: true, title: true, status: true, leadId: true },
    });
    return { task: created };
  }

  if (action.type === "UPDATE_LEAD_STATUS") {
    const leadId = String(action.payload.leadId || "");
    if (!leadId) throw new Error("leadId is required");
    const target = await db.lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
      select: { id: true },
    });
    if (!target) throw new Error("Lead not found");
    const updated = await db.lead.update({
      where: { id: leadId },
      data: { status: String(action.payload.status || "CONTACTED") as any },
      select: { id: true, status: true },
    });
    return { lead: updated };
  }

  if (action.type === "ADD_LEAD_TAG") {
    const leadId = String(action.payload.leadId || "");
    const tag = String(action.payload.tag || "AI_BRAIN_TAGGED");
    if (!leadId) throw new Error("leadId is required");
    const lead = await db.lead.findFirst({
      where: { id: leadId, userId: ctx.userId },
      select: { id: true, tags: true },
    });
    if (!lead) throw new Error("Lead not found");
    const existingTags = Array.isArray(lead.tags)
      ? lead.tags.map((v) => String(v))
      : [];
    const nextTags = Array.from(new Set([...existingTags, tag]));
    const updated = await db.lead.update({
      where: { id: leadId },
      data: { tags: nextTags as any },
      select: { id: true, tags: true },
    });
    return { lead: updated };
  }

  if (action.type === "DRAFT_CAMPAIGN_ARTIFACT") {
    const task = await db.task.create({
      data: {
        userId: ctx.userId,
        title: String(action.payload.title || "AI Campaign Draft"),
        description: String(action.payload.summary || ""),
        priority: "LOW",
        status: "TODO",
        aiSuggested: true,
        tags: ["NEXREL_AI_BRAIN", "CAMPAIGN_DRAFT"],
      },
      select: { id: true, title: true, tags: true },
    });
    return { draftTask: task };
  }

  throw new Error(`Unsupported low-risk action: ${action.type}`);
}

async function enqueueHighRiskApproval(
  ctx: DalContext,
  runId: string,
  action: OperatorAction,
): Promise<{ jobId: string; type: OperatorActionType }> {
  const db = getCrmDb(ctx);
  let employee = await db.aIEmployee.findFirst({
    where: {
      userId: ctx.userId,
      type: "PROJECT_MANAGER",
      isActive: true,
    },
    select: { id: true },
  });
  if (!employee) {
    employee = await db.aIEmployee.create({
      data: {
        userId: ctx.userId,
        name: "Nexrel AI Brain Operator",
        type: "PROJECT_MANAGER",
        description: "Coordinates guarded high-risk operator approvals",
        capabilities: { approvals: true, orchestration: true },
        isActive: true,
      },
      select: { id: true },
    });
  }

  const job = await db.aIJob.create({
    data: {
      userId: ctx.userId,
      employeeId: employee.id,
      workflowId: runId,
      jobType: `nexrel_ai_brain_${action.type.toLowerCase()}`,
      priority: "HIGH",
      status: AIJobStatus.PENDING,
      input: {
        approvalRequired: true,
        action,
      },
      progress: 0,
    },
    select: { id: true },
  });

  await db.hITLNotification.create({
    data: {
      userId: ctx.userId,
      executionId: job.id,
      taskName: `Nexrel AI Brain ${action.type}`,
      message: `Approval required for ${action.type}`,
      metadata: {
        runId,
        source: NEXREL_AI_BRAIN_INTERNAL_NAME,
        action,
      },
      urgency: "HIGH",
    },
  });

  return { jobId: job.id, type: action.type };
}

export async function runNexrelAiBrainOperator(
  input: OperatorRunInput,
): Promise<OperatorRunResult> {
  const runId = crypto.randomUUID();
  const phase = getNexrelAiBrainPhase();
  const mode: OperatorRunResult["mode"] =
    phase === 1 || input.dryRun ? "read_only" : "execute";

  const deniedActions: OperatorRunResult["deniedActions"] = [];
  const executedActions: OperatorRunResult["executedActions"] = [];
  const pendingApprovals: OperatorRunResult["pendingApprovals"] = [];
  const actorRole = normalizeRole(input.actorRole);
  const traceId = input.traceId || crypto.randomUUID();

  if (
    !isNexrelAiBrainEnabled() ||
    isNexrelAiBrainGlobalKillSwitchActive() ||
    isTenantKilledForNexrelAiBrain(input.tenantId) ||
    !isTenantAllowedForNexrelAiBrain(input.tenantId)
  ) {
    const reason = !isNexrelAiBrainEnabled()
      ? "Nexrel AI Brain disabled"
      : isNexrelAiBrainGlobalKillSwitchActive()
        ? "Global kill switch active"
        : isTenantKilledForNexrelAiBrain(input.tenantId)
          ? "Tenant kill switch active"
          : "Nexrel AI Brain not allowlisted for tenant";
    return {
      runId,
      phase,
      mode: "read_only",
      suggestedActions: [],
      executedActions,
      pendingApprovals,
      deniedActions: [{ type: "CREATE_TASK", reason }],
    };
  }

  const surface = normalizeSurface(input.surface);
  const suggestedActions =
    input.requestedActions && input.requestedActions.length > 0
      ? input.requestedActions
      : planActionsFromObjective(input.objective);

  const db = getCrmDb(input.ctx);

  for (const action of suggestedActions) {
    try {
      if (!ROLE_CAPABILITY_MATRIX[actorRole].has(action.type)) {
        deniedActions.push({
          type: action.type,
          reason: `Action not allowed for role ${actorRole}`,
        });
        continue;
      }

      if (mode === "read_only") {
        deniedActions.push({ type: action.type, reason: "Read-only mode" });
        continue;
      }

      if (action.riskTier === "LOW") {
        if (!isNexrelAiBrainLowRiskWritesEnabled()) {
          deniedActions.push({
            type: action.type,
            reason: "Low-risk writes disabled",
          });
          continue;
        }
        const result = await executeLowRiskAction(input.ctx, action);
        executedActions.push({ type: action.type, result });
        continue;
      }

      if (!isNexrelAiBrainHighRiskApprovalEnabled()) {
        deniedActions.push({
          type: action.type,
          reason: "High-risk approvals disabled",
        });
        continue;
      }

      if (isNexrelAiBrainHighRiskAutoExecuteEnabled()) {
        const result = {
          autoExecuted: false,
          reason: "Auto execution intentionally blocked by policy",
        };
        deniedActions.push({ type: action.type, reason: result.reason });
        continue;
      }

      const approval = await enqueueHighRiskApproval(input.ctx, runId, action);
      pendingApprovals.push(approval);
    } catch (error: any) {
      deniedActions.push({
        type: action.type,
        reason: error?.message || "Action failed",
      });
    }
  }

  await db.auditLog.create({
    data: {
      userId: input.userId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_BRAIN_OPERATOR_RUN",
      entityId: runId,
      metadata: {
        traceId,
        phase,
        surface,
        objective: input.objective.slice(0, 400),
        mode,
        suggestedActionCount: suggestedActions.length,
        executedActionCount: executedActions.length,
        pendingApprovalCount: pendingApprovals.length,
        deniedActionCount: deniedActions.length,
        actorRole,
        pipedaEvidence: buildPipedaEvidenceArtifact({
          control: "operator_run",
          runId,
          traceId,
          surface,
        }),
      },
      success: true,
    },
  });

  return {
    runId,
    phase,
    mode,
    suggestedActions,
    executedActions,
    pendingApprovals,
    deniedActions,
  };
}

export async function approveNexrelAiBrainJob(
  ctx: DalContext,
  approverUserId: string,
  jobId: string,
  notes?: string,
  traceId?: string,
) {
  const db = getCrmDb(ctx);
  const effectiveTraceId = traceId || crypto.randomUUID();
  const job = await db.aIJob.findFirst({
    where: {
      id: jobId,
      userId: ctx.userId,
      status: AIJobStatus.PENDING,
    },
    select: {
      id: true,
      input: true,
      jobType: true,
    },
  });
  if (!job) {
    throw new Error("Pending AI job not found");
  }

  const input = (job.input || {}) as Record<string, any>;
  if (!input.approvalRequired || !input.action) {
    throw new Error("Job is not approval-gated");
  }

  const action = input.action as OperatorAction;
  let output: Record<string, any> = {
    approved: true,
    approvedBy: approverUserId,
    notes: notes || null,
  };

  if (action.type === "MASS_OUTREACH") {
    output = {
      ...output,
      executed: false,
      safetyBlock: true,
      reason:
        "High-risk outbound execution remains manual-only. Approval recorded for operator workflow evidence.",
      action,
    };
  }

  await db.aIJob.update({
    where: { id: jobId },
    data: {
      status: AIJobStatus.COMPLETED,
      progress: 100,
      completedAt: new Date(),
      output,
    },
  });

  await db.hITLNotification.updateMany({
    where: { executionId: jobId, userId: ctx.userId },
    data: { isActioned: true, isRead: true },
  });

  await db.auditLog.create({
    data: {
      userId: approverUserId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_BRAIN_OPERATOR_APPROVAL",
      entityId: jobId,
      metadata: {
        traceId: effectiveTraceId,
        jobType: job.jobType,
        decision: "approved",
        pipedaEvidence: buildPipedaEvidenceArtifact({
          control: "operator_approval",
          traceId: effectiveTraceId,
          jobId,
        }),
      },
      success: true,
    },
  });

  return { jobId, output };
}

export async function rejectNexrelAiBrainJob(
  ctx: DalContext,
  reviewerUserId: string,
  jobId: string,
  notes?: string,
  traceId?: string,
) {
  const db = getCrmDb(ctx);
  const effectiveTraceId = traceId || crypto.randomUUID();
  const job = await db.aIJob.findFirst({
    where: {
      id: jobId,
      userId: ctx.userId,
      status: AIJobStatus.PENDING,
    },
    select: { id: true },
  });
  if (!job) {
    throw new Error("Pending AI job not found");
  }

  await db.aIJob.update({
    where: { id: jobId },
    data: {
      status: AIJobStatus.FAILED,
      progress: 100,
      completedAt: new Date(),
      error: `Rejected by ${reviewerUserId}${notes ? `: ${notes}` : ""}`,
      output: {
        rejected: true,
        reviewedBy: reviewerUserId,
        notes: notes || null,
      },
    },
  });

  await db.hITLNotification.updateMany({
    where: { executionId: jobId, userId: ctx.userId },
    data: { isActioned: true, isRead: true },
  });

  await db.auditLog.create({
    data: {
      userId: reviewerUserId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_BRAIN_OPERATOR_REJECTION",
      entityId: jobId,
      metadata: {
        traceId: effectiveTraceId,
        decision: "rejected",
        notes: notes || null,
        pipedaEvidence: buildPipedaEvidenceArtifact({
          control: "operator_rejection",
          traceId: effectiveTraceId,
          jobId,
        }),
      },
      success: true,
    },
  });

  return { jobId, rejected: true };
}
