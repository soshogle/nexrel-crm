import { resolveDalContext } from "@/lib/context/industry-context";
import {
  runNexrelAiBrainOperator,
  type OperatorAction,
} from "@/lib/nexrel-ai-brain/operator";
import { logNexrelAIDecision } from "@/lib/nexrel-ai-brain/decision-log";

function isTrue(value: string | undefined): boolean {
  return value === "true";
}

export function isMasterConductorEnforced(): boolean {
  return isTrue(process.env.NEXREL_AI_BRAIN_ENFORCE_ORCHESTRATION);
}

export function isMasterConductorShadowMode(): boolean {
  return isTrue(process.env.NEXREL_AI_BRAIN_SHADOW_ORCHESTRATION);
}

export function isMasterConductorActive(): boolean {
  return isMasterConductorEnforced() || isMasterConductorShadowMode();
}

const WRITE_ACTIONS = new Set<string>([
  "create_lead",
  "update_lead",
  "delete_lead",
  "create_deal",
  "update_deal",
  "delete_deal",
  "create_campaign",
  "update_campaign",
  "send_sms",
  "schedule_sms",
  "send_email",
  "schedule_email",
  "sms_leads",
  "email_leads",
  "create_task",
  "create_bulk_tasks",
  "update_task",
  "cancel_task",
  "add_note",
  "add_lead_tag",
  "update_lead_status",
  "bulk_update_lead_status",
  "bulk_add_tag",
]);

function mapActionToOperatorActions(
  action: string,
  parameters: Record<string, any>,
): OperatorAction[] {
  const normalized = String(action || "")
    .trim()
    .toLowerCase();

  if (normalized === "create_task") {
    return [
      {
        type: "CREATE_TASK",
        riskTier: "LOW",
        reason: "Assistant action create_task preflight",
        payload: {
          title: String(parameters?.title || "AI Brain Task"),
          description: String(parameters?.description || ""),
          priority: String(parameters?.priority || "MEDIUM"),
          leadId: parameters?.leadId || null,
        },
      },
    ];
  }

  if (normalized === "update_lead_status") {
    return [
      {
        type: "UPDATE_LEAD_STATUS",
        riskTier: "LOW",
        reason: "Assistant action update_lead_status preflight",
        payload: {
          leadId: String(parameters?.leadId || ""),
          status: String(parameters?.status || "CONTACTED"),
        },
      },
    ];
  }

  if (normalized === "add_lead_tag") {
    return [
      {
        type: "ADD_LEAD_TAG",
        riskTier: "LOW",
        reason: "Assistant action add_lead_tag preflight",
        payload: {
          leadId: String(parameters?.leadId || ""),
          tag: String(parameters?.tag || "AI_BRAIN_TAGGED"),
        },
      },
    ];
  }

  if (
    normalized === "send_sms" ||
    normalized === "send_email" ||
    normalized === "sms_leads" ||
    normalized === "email_leads"
  ) {
    return [
      {
        type: "MASS_OUTREACH",
        riskTier: "HIGH",
        reason: `Assistant action ${normalized} preflight`,
        payload: {
          channel: normalized.includes("sms") ? "sms" : "email",
          summary: JSON.stringify(parameters || {}).slice(0, 500),
        },
      },
    ];
  }

  if (normalized === "create_campaign" || normalized === "update_campaign") {
    return [
      {
        type: "DRAFT_CAMPAIGN_ARTIFACT",
        riskTier: "LOW",
        reason: `Assistant action ${normalized} preflight`,
        payload: {
          title: String(parameters?.name || "Campaign Draft"),
          summary: JSON.stringify(parameters || {}).slice(0, 500),
        },
      },
    ];
  }

  return [];
}

export async function runMasterConductorPreflight(input: {
  userId: string;
  action: string;
  parameters?: Record<string, any>;
  surface?: string;
}) {
  const normalizedAction = String(input.action || "").toLowerCase();
  const shouldEvaluate =
    isMasterConductorEnforced() ||
    isMasterConductorShadowMode() ||
    WRITE_ACTIONS.has(normalizedAction);

  if (!shouldEvaluate) {
    return { enforced: false, allowed: true, skipped: true };
  }

  const ctx = await resolveDalContext(input.userId);
  const requestedActions = mapActionToOperatorActions(
    normalizedAction,
    input.parameters || {},
  );

  const operatorResult = await runNexrelAiBrainOperator({
    tenantId: ctx.userId,
    userId: ctx.userId,
    surface: input.surface || "assistant",
    objective: `assistant_action:${normalizedAction}`,
    requestedActions,
    ctx,
    dryRun: !isMasterConductorEnforced(),
  });

  if (!isMasterConductorEnforced()) {
    await logNexrelAIDecision({
      userId: input.userId,
      surface: input.surface || "assistant",
      objective: `assistant_action:${normalizedAction}`,
      enforced: false,
      allowed: true,
      mode: operatorResult.mode,
      deniedActions: operatorResult.deniedActions,
      pendingApprovals: operatorResult.pendingApprovals,
    });
    return {
      enforced: false,
      allowed: true,
      skipped: false,
      operatorResult,
    };
  }

  const blocked =
    operatorResult.mode === "read_only" ||
    operatorResult.deniedActions.length > 0;

  await logNexrelAIDecision({
    userId: input.userId,
    surface: input.surface || "assistant",
    objective: `assistant_action:${normalizedAction}`,
    enforced: true,
    allowed: !blocked,
    mode: operatorResult.mode,
    deniedActions: operatorResult.deniedActions,
    pendingApprovals: operatorResult.pendingApprovals,
  });

  return {
    enforced: true,
    allowed: !blocked,
    skipped: false,
    operatorResult,
  };
}

export async function runMasterConductorOperatorPreflight(input: {
  userId: string;
  surface: string;
  objective: string;
  requestedActions: OperatorAction[];
}) {
  if (!isMasterConductorActive()) {
    return { enforced: false, allowed: true, skipped: true };
  }

  const ctx = await resolveDalContext(input.userId);
  const operatorResult = await runNexrelAiBrainOperator({
    tenantId: ctx.userId,
    userId: ctx.userId,
    surface: input.surface,
    objective: input.objective,
    requestedActions: input.requestedActions,
    ctx,
    dryRun: !isMasterConductorEnforced(),
  });

  if (!isMasterConductorEnforced()) {
    await logNexrelAIDecision({
      userId: input.userId,
      surface: input.surface,
      objective: input.objective,
      enforced: false,
      allowed: true,
      mode: operatorResult.mode,
      deniedActions: operatorResult.deniedActions,
      pendingApprovals: operatorResult.pendingApprovals,
    });
    return {
      enforced: false,
      allowed: true,
      skipped: false,
      operatorResult,
    };
  }

  const blocked =
    operatorResult.mode === "read_only" ||
    operatorResult.deniedActions.length > 0;

  await logNexrelAIDecision({
    userId: input.userId,
    surface: input.surface,
    objective: input.objective,
    enforced: true,
    allowed: !blocked,
    mode: operatorResult.mode,
    deniedActions: operatorResult.deniedActions,
    pendingApprovals: operatorResult.pendingApprovals,
  });

  return {
    enforced: true,
    allowed: !blocked,
    skipped: false,
    operatorResult,
  };
}
