import {
  NEXREL_AI_BRAIN_INTERNAL_NAME,
  isNexrelAiBrainEnabled,
  isNexrelAiBrainReadOnlyMode,
  isTenantAllowedForNexrelAiBrain,
} from "@/lib/nexrel-ai-brain/config";

type ShadowRunInput = {
  tenantId: string;
  userId: string;
  route: string;
  message: string;
  conversationHistoryCount: number;
  contextKeys: string[];
};

export type ShadowRunResult = {
  runId: string;
  executed: boolean;
  mode: "read_only" | "disabled" | "tenant_blocked";
  policyDecision: "allow" | "deny";
};

export async function runNexrelAiBrainShadow(
  input: ShadowRunInput,
): Promise<ShadowRunResult> {
  const runId = crypto.randomUUID();

  if (!isNexrelAiBrainEnabled()) {
    return {
      runId,
      executed: false,
      mode: "disabled",
      policyDecision: "deny",
    };
  }

  if (!isTenantAllowedForNexrelAiBrain(input.tenantId)) {
    console.info("[nexrel-ai-brain] tenant blocked", {
      runId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      executed: false,
      mode: "tenant_blocked",
      policyDecision: "deny",
    };
  }

  const readOnlyMode = isNexrelAiBrainReadOnlyMode();
  if (!readOnlyMode) {
    console.warn("[nexrel-ai-brain] blocked non-read-only configuration", {
      runId,
      tenantId: input.tenantId,
      route: input.route,
    });
    return {
      runId,
      executed: false,
      mode: "disabled",
      policyDecision: "deny",
    };
  }

  const mode: ShadowRunResult["mode"] = "read_only";

  console.info("[nexrel-ai-brain] shadow run", {
    runId,
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
  });

  return {
    runId,
    executed: true,
    mode,
    policyDecision: "allow",
  };
}
