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

export function assertNexrelAiBrainWriteAllowed(): void {
  if (isNexrelAiBrainReadOnlyMode()) {
    throw new Error(
      "Nexrel AI Brain is in read-only mode. Write actions are disabled in phase 1.",
    );
  }
}
