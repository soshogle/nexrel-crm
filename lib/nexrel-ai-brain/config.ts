export const NEXREL_AI_BRAIN_INTERNAL_NAME = "nexrel-ai-brain" as const;

function isTrue(value: string | undefined): boolean {
  return value === "true";
}

export function isNexrelAiBrainEnabled(): boolean {
  return isTrue(process.env.NEXREL_AI_BRAIN_ENABLED);
}

export function isNexrelAiBrainReadOnlyMode(): boolean {
  const explicit = process.env.NEXREL_AI_BRAIN_READ_ONLY;
  if (explicit === undefined) return true;
  return isTrue(explicit);
}

export type NexrelAiBrainPhase = 1 | 2 | 3;

export function getNexrelAiBrainPhase(): NexrelAiBrainPhase {
  const raw = Number(process.env.NEXREL_AI_BRAIN_PHASE || "1");
  if (raw >= 3) return 3;
  if (raw === 2) return 2;
  return 1;
}

export function isNexrelAiBrainLowRiskWritesEnabled(): boolean {
  if (!isNexrelAiBrainEnabled()) return false;
  if (isNexrelAiBrainReadOnlyMode()) return false;
  if (getNexrelAiBrainPhase() < 2) return false;
  return isTrue(process.env.NEXREL_AI_BRAIN_ENABLE_LOW_RISK_WRITES);
}

export function isNexrelAiBrainHighRiskApprovalEnabled(): boolean {
  if (!isNexrelAiBrainEnabled()) return false;
  if (getNexrelAiBrainPhase() < 3) return false;
  return isTrue(process.env.NEXREL_AI_BRAIN_ENABLE_HIGH_RISK_APPROVALS);
}

export function isNexrelAiBrainHighRiskAutoExecuteEnabled(): boolean {
  if (!isNexrelAiBrainHighRiskApprovalEnabled()) return false;
  return isTrue(process.env.NEXREL_AI_BRAIN_ENABLE_HIGH_RISK_AUTO_EXECUTE);
}

export function getNexrelAiBrainTenantAllowlist(): Set<string> {
  const raw = process.env.NEXREL_AI_BRAIN_TENANT_ALLOWLIST;
  if (!raw || !raw.trim()) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isTenantAllowedForNexrelAiBrain(tenantId: string): boolean {
  const allowlist = getNexrelAiBrainTenantAllowlist();
  if (allowlist.size === 0) return true;
  return allowlist.has(tenantId);
}

export function isNexrelAiBrainGlobalKillSwitchActive(): boolean {
  return isTrue(process.env.NEXREL_AI_BRAIN_KILL_SWITCH);
}

export function getNexrelAiBrainTenantKillSwitchList(): Set<string> {
  const raw = process.env.NEXREL_AI_BRAIN_TENANT_KILL_SWITCH;
  if (!raw || !raw.trim()) return new Set<string>();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isTenantKilledForNexrelAiBrain(tenantId: string): boolean {
  const killedTenants = getNexrelAiBrainTenantKillSwitchList();
  return killedTenants.has(tenantId);
}

export function assertNexrelAiBrainWriteAllowed(): void {
  if (!isNexrelAiBrainLowRiskWritesEnabled()) {
    throw new Error(
      "Nexrel AI Brain write path disabled. Enable phase 2+ low-risk writes.",
    );
  }
}
