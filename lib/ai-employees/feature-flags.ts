export type AgentRolloutMode = "off" | "shadow" | "enforce";

type AgentFeatureFlags = {
  rolloutMode: AgentRolloutMode;
  globalKillSwitch: boolean;
  tenantAllowlist: Set<string>;
  tenantCanaryList: Set<string>;
  tenantKillSwitchList: Set<string>;
  agentWidget: boolean;
  commandBus: boolean;
  visionFallback: boolean;
  voiceDuplex: boolean;
};

const CONTRACT_VERSION = "2026-03-14" as const;

function isTrue(value: string | undefined): boolean {
  return value === "true";
}

function parseRolloutMode(value: string | undefined): AgentRolloutMode {
  if (value === "shadow") return "shadow";
  if (value === "enforce") return "enforce";
  return "off";
}

function parseList(value: string | undefined): Set<string> {
  if (!value || !value.trim()) return new Set<string>();
  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

export function getAgentContractVersion(): string {
  return CONTRACT_VERSION;
}

export function getAgentFeatureFlags(): AgentFeatureFlags {
  return {
    rolloutMode: parseRolloutMode(process.env.NEXREL_AGENT_ROLLOUT_MODE),
    globalKillSwitch: isTrue(process.env.NEXREL_AGENT_KILL_SWITCH),
    tenantAllowlist: parseList(process.env.NEXREL_AGENT_TENANT_ALLOWLIST),
    tenantCanaryList: parseList(process.env.NEXREL_AGENT_TENANT_CANARY_LIST),
    tenantKillSwitchList: parseList(
      process.env.NEXREL_AGENT_TENANT_KILL_SWITCH,
    ),
    agentWidget: isTrue(process.env.NEXREL_AGENT_WIDGET_ENABLED),
    commandBus: isTrue(process.env.NEXREL_AGENT_COMMAND_BUS_ENABLED),
    visionFallback: isTrue(process.env.NEXREL_AGENT_VISION_FALLBACK_ENABLED),
    voiceDuplex: isTrue(process.env.NEXREL_AGENT_VOICE_DUPLEX_ENABLED),
  };
}

export function getAgentFeatureFlagsForApi() {
  const flags = getAgentFeatureFlags();
  return {
    rolloutMode: flags.rolloutMode,
    globalKillSwitch: flags.globalKillSwitch,
    tenantAllowlistSize: flags.tenantAllowlist.size,
    tenantCanarySize: flags.tenantCanaryList.size,
    tenantKillSwitchSize: flags.tenantKillSwitchList.size,
    agentWidget: flags.agentWidget,
    commandBus: flags.commandBus,
    visionFallback: flags.visionFallback,
    voiceDuplex: flags.voiceDuplex,
  };
}

export function evaluateAgentTenantRollout(tenantId: string | undefined): {
  allowed: boolean;
  mode: AgentRolloutMode;
  canary: boolean;
  reason?: string;
} {
  const flags = getAgentFeatureFlags();
  const id = String(tenantId || "").trim();

  if (flags.globalKillSwitch) {
    return {
      allowed: false,
      mode: flags.rolloutMode,
      canary: false,
      reason: "Agent operations disabled by global kill switch.",
    };
  }

  if (id && flags.tenantKillSwitchList.has(id)) {
    return {
      allowed: false,
      mode: flags.rolloutMode,
      canary: false,
      reason: "Agent operations disabled for this tenant.",
    };
  }

  if (
    flags.tenantAllowlist.size > 0 &&
    (!id || !flags.tenantAllowlist.has(id))
  ) {
    return {
      allowed: false,
      mode: flags.rolloutMode,
      canary: false,
      reason: "Tenant is not in Agent OS rollout allowlist.",
    };
  }

  if (flags.rolloutMode === "off") {
    return {
      allowed: false,
      mode: "off",
      canary: false,
      reason: "Agent rollout mode is off.",
    };
  }

  const canary = id ? flags.tenantCanaryList.has(id) : false;
  return {
    allowed: true,
    mode: flags.rolloutMode,
    canary,
  };
}

export function isAgentSystemWriteEnabled(): boolean {
  const flags = getAgentFeatureFlags();
  if (flags.globalKillSwitch) return false;
  return flags.rolloutMode === "enforce";
}

export function isAgentVisionFallbackEnabled(): boolean {
  return getAgentFeatureFlags().visionFallback;
}

export function isAgentVoiceDuplexEnabled(): boolean {
  return getAgentFeatureFlags().voiceDuplex;
}

export function assertAgentRunAllowed(tenantId?: string): void {
  const gate = evaluateAgentTenantRollout(tenantId);
  if (!gate.allowed) {
    throw new Error(gate.reason || "Agent run is currently disabled.");
  }
}

export function getAgentRolloutSnapshot(tenantId?: string) {
  const gate = evaluateAgentTenantRollout(tenantId);
  return {
    mode: gate.mode,
    allowed: gate.allowed,
    canary: gate.canary,
    reason: gate.reason || null,
  };
}
