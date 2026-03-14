export type WorkflowTier = "tier_1" | "tier_2" | "tier_3";

export type BlockerType =
  | "invalid_url"
  | "missing_app"
  | "login_wall"
  | "two_factor"
  | "captcha"
  | "selector_drift"
  | "modal_trap"
  | "permission_denied"
  | "network_timeout"
  | "unknown";

export function classifyWorkflowTier(input: {
  goal: string;
  targetApps?: string[];
}): WorkflowTier {
  const goal = String(input.goal || "").toLowerCase();
  const apps = (input.targetApps || []).map((v) =>
    String(v || "").toLowerCase(),
  );
  const corpus = `${goal} ${apps.join(" ")}`;

  const tier1Keywords = [
    "calendar",
    "gmail",
    "email",
    "google sheets",
    "sheets",
    "crm",
    "hubspot",
    "salesforce",
    "appointment",
    "meeting",
  ];
  if (tier1Keywords.some((kw) => corpus.includes(kw))) return "tier_1";

  const tier2Keywords = [
    "slack",
    "notion",
    "asana",
    "trello",
    "drive",
    "dropbox",
    "analytics",
    "ad manager",
  ];
  if (tier2Keywords.some((kw) => corpus.includes(kw))) return "tier_2";

  return "tier_3";
}

export function classifyBlocker(detail: string): BlockerType {
  const text = String(detail || "").toLowerCase();
  if (text.includes("invalid url") || text.includes("cannot navigate")) {
    return "invalid_url";
  }
  if (text.includes("unable to find application")) return "missing_app";
  if (
    text.includes("auth/signin") ||
    text.includes("login wall") ||
    text.includes("sign in")
  ) {
    return "login_wall";
  }
  if (
    text.includes("2fa") ||
    text.includes("two-factor") ||
    text.includes("otp")
  ) {
    return "two_factor";
  }
  if (text.includes("captcha")) return "captcha";
  if (text.includes("selector") || text.includes("strict mode violation")) {
    return "selector_drift";
  }
  if (
    text.includes("modal") ||
    text.includes("dialog") ||
    text.includes("popup")
  ) {
    return "modal_trap";
  }
  if (
    text.includes("permission") ||
    text.includes("not permitted") ||
    text.includes("access denied")
  ) {
    return "permission_denied";
  }
  if (
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("network")
  ) {
    return "network_timeout";
  }
  return "unknown";
}

export function shouldEscalateToHuman(blocker: BlockerType): boolean {
  return (
    blocker === "two_factor" ||
    blocker === "captcha" ||
    blocker === "permission_denied" ||
    blocker === "unknown"
  );
}

export function parseCommandEvidence(
  detail: string,
): Record<string, any> | null {
  const text = String(detail || "").trim();
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object")
      return parsed as Record<string, any>;
    return null;
  } catch {
    return null;
  }
}

export type RecoveryPlan = {
  strategy: "retry" | "replan" | "escalate";
  maxRetries: number;
  reason: string;
};

export function buildRecoveryPlan(
  blocker: BlockerType,
  tier: WorkflowTier,
): RecoveryPlan {
  if (shouldEscalateToHuman(blocker)) {
    return {
      strategy: "escalate",
      maxRetries: 0,
      reason: "Human-required blocker",
    };
  }

  if (blocker === "invalid_url" || blocker === "missing_app") {
    return {
      strategy: "replan",
      maxRetries: tier === "tier_1" ? 2 : 1,
      reason: "Input or environment mismatch",
    };
  }

  if (blocker === "selector_drift" || blocker === "modal_trap") {
    return {
      strategy: "retry",
      maxRetries: tier === "tier_1" ? 3 : 2,
      reason: "Likely transient UI variance",
    };
  }

  if (blocker === "network_timeout") {
    return {
      strategy: "retry",
      maxRetries: tier === "tier_3" ? 1 : 2,
      reason: "Likely transient network latency",
    };
  }

  if (blocker === "unknown") {
    return {
      strategy: "escalate",
      maxRetries: 0,
      reason: "Unknown blocker safety escalation",
    };
  }

  return {
    strategy: "replan",
    maxRetries: tier === "tier_1" ? 2 : 1,
    reason: "Unknown blocker fallback",
  };
}

export type ReliabilityMetrics = {
  successRate: number;
  silentCompletionRate: number;
  deterministicBlockerCoverage: number;
  unknownEscalationSafetyRate: number;
};

export function meetsReliabilityGate(metrics: ReliabilityMetrics) {
  return (
    metrics.successRate >= 0.95 &&
    metrics.silentCompletionRate <= 0 &&
    metrics.deterministicBlockerCoverage >= 0.98 &&
    metrics.unknownEscalationSafetyRate >= 0.99
  );
}

export type TierExecutionProfile = {
  commandTimeoutMs: number;
  retryBudget: number;
  verifyDepth: "standard" | "deep";
};

export function buildTierExecutionProfile(
  tier: WorkflowTier,
  successRate: number,
): TierExecutionProfile {
  if (tier === "tier_1") {
    return {
      commandTimeoutMs: successRate >= 0.9 ? 25000 : 35000,
      retryBudget: successRate >= 0.9 ? 3 : 4,
      verifyDepth: "deep",
    };
  }

  if (tier === "tier_2") {
    return {
      commandTimeoutMs: successRate >= 0.85 ? 28000 : 38000,
      retryBudget: successRate >= 0.85 ? 2 : 3,
      verifyDepth: "standard",
    };
  }

  return {
    commandTimeoutMs: successRate >= 0.8 ? 22000 : 30000,
    retryBudget: successRate >= 0.8 ? 1 : 2,
    verifyDepth: "standard",
  };
}
