type IndustryLike = string | null | undefined;

const HEALTHCARE_INDUSTRY_KEYS = new Set([
  "DENTIST",
  "ORTHODONTIST",
  "MEDICAL",
  "MEDICAL_SPA",
  "HOSPITAL",
  "HEALTH_CLINIC",
  "OPTOMETRIST",
]);

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toIndustryEnvKey(industry: IndustryLike): string | null {
  if (!industry || typeof industry !== "string") return null;

  const raw = industry.trim();
  if (!raw) return null;

  const key = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!key) return null;
  if (key === "DENTAL") return "DENTIST";
  if (key === "HEALTHCLINIC") return "HEALTH_CLINIC";

  return key;
}

export function resolveIndustryFailoverNumber(
  industry: IndustryLike,
): string | null {
  const key = toIndustryEnvKey(industry);
  if (!key) return null;

  const candidates = [
    process.env[`TWILIO_${key}_FAILOVER_NUMBER`],
    process.env[`TWILIO_FAILOVER_NUMBER_${key}`],
    process.env[`${key}_FAILOVER_NUMBER`],
    process.env[`FAILOVER_NUMBER_${key}`],
  ];

  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }

  if (
    HEALTHCARE_INDUSTRY_KEYS.has(key) &&
    normalizePhone(process.env.CLINIC_FAILOVER_NUMBER)
  ) {
    return normalizePhone(process.env.CLINIC_FAILOVER_NUMBER);
  }

  return null;
}

export function resolveGlobalFailoverNumber(options?: {
  industry?: IndustryLike;
}): string | null {
  const industryFallback = resolveIndustryFailoverNumber(options?.industry);
  if (industryFallback) return industryFallback;

  const generic = normalizePhone(process.env.TWILIO_FAILOVER_NUMBER);
  if (generic) return generic;

  return normalizePhone(process.env.CLINIC_FAILOVER_NUMBER);
}
