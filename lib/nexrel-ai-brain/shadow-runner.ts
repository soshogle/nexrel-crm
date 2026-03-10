import {
  NEXREL_AI_BRAIN_INTERNAL_NAME,
  isNexrelAiBrainEnabled,
  isNexrelAiBrainGlobalKillSwitchActive,
  isNexrelAiBrainReadOnlyMode,
  isTenantKilledForNexrelAiBrain,
  isTenantAllowedForNexrelAiBrain,
} from "@/lib/nexrel-ai-brain/config";
import { buildPipedaEvidenceArtifact } from "@/lib/nexrel-ai-brain/controls";

type ShadowRunInput = {
  tenantId: string;
  userId: string;
  route: string;
  message: string;
  conversationHistoryCount: number;
  contextKeys: string[];
  traceId?: string;
};

export type ShadowRunResult = {
  runId: string;
  traceId: string;
  executed: boolean;
  mode: "read_only" | "disabled" | "tenant_blocked";
  policyDecision: "allow" | "deny";
};

export async function runNexrelAiBrainShadow(
  input: ShadowRunInput,
): Promise<ShadowRunResult> {
  const runId = crypto.randomUUID();
  const traceId = input.traceId || crypto.randomUUID();

  if (!isNexrelAiBrainEnabled()) {
    return {
      runId,
      traceId,
      executed: false,
      mode: "disabled",
      policyDecision: "deny",
    };
  }

  if (isNexrelAiBrainGlobalKillSwitchActive()) {
    console.warn("[nexrel-ai-brain] global kill switch active", {
      runId,
      traceId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      traceId,
      executed: false,
      mode: "disabled",
      policyDecision: "deny",
    };
  }

  if (isTenantKilledForNexrelAiBrain(input.tenantId)) {
    console.warn("[nexrel-ai-brain] tenant kill switch active", {
      runId,
      traceId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      traceId,
      executed: false,
      mode: "tenant_blocked",
      policyDecision: "deny",
    };
  }

  if (!isTenantAllowedForNexrelAiBrain(input.tenantId)) {
    console.info("[nexrel-ai-brain] tenant blocked", {
      runId,
      traceId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      traceId,
      executed: false,
      mode: "tenant_blocked",
      policyDecision: "deny",
    };
  }

  const readOnlyMode = isNexrelAiBrainReadOnlyMode();
  if (!readOnlyMode) {
    console.warn("[nexrel-ai-brain] blocked non-read-only configuration", {
      runId,
      traceId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      traceId,
      executed: false,
      mode: "disabled",
      policyDecision: "deny",
    };
  }

  const mode: ShadowRunResult["mode"] = "read_only";

  console.info("[nexrel-ai-brain] shadow run", {
    runId,
    traceId,
    name: NEXREL_AI_BRAIN_INTERNAL_NAME,
    mode,
    policyDecision: "allow",
    tenantId: input.tenantId,
    userId: input.userId,
    route: input.route,
    messageLength: input.message.length,
    conversationHistoryCount: input.conversationHistoryCount,
    contextKeys: input.contextKeys,
    writeActionsAttempted: 0,
    pipedaEvidence: buildPipedaEvidenceArtifact({
      control: "shadow_run",
      traceId,
      runId,
      route: input.route,
    }),
  });

  return {
    runId,
    traceId,
    executed: true,
    mode,
    policyDecision: "allow",
  };
}
