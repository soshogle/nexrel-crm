import { getCrmDb } from "@/lib/dal";
import type { DalContext } from "@/lib/dal/types";

export type BusinessBrainProfile = {
  profileId: string;
  updatedAt: string;
  source: "derived" | "owner_update" | "mixed";
  offers: string[];
  icp: {
    audience: string;
    location: string;
    channels: string[];
    demographics?: string;
  };
  constraints: {
    budget: string;
    compliance: string[];
    allowedChannels: string[];
  };
  economics: {
    averageDealValue: number | null;
    currency: string;
    monthlyMarketingBudget: string;
    activeLeads: number;
    activeDeals: number;
  };
  goals: {
    primary: string[];
    horizon: "30d" | "90d" | "180d";
  };
  evidence: {
    knowledgeBaseCount: number;
    onboardingCompleted: boolean;
  };
};

type BusinessBrainPatch = Partial<
  Omit<BusinessBrainProfile, "profileId" | "updatedAt" | "source">
>;

function parseCsv(input: string | null | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeProfile(value: any): BusinessBrainProfile | null {
  if (!value || typeof value !== "object") return null;
  if (!value.profileId || !value.updatedAt) return null;
  return value as BusinessBrainProfile;
}

export async function getLatestBusinessBrainProfile(
  ctx: DalContext,
): Promise<BusinessBrainProfile | null> {
  const db = getCrmDb(ctx);
  const row = await db.auditLog.findFirst({
    where: {
      userId: ctx.userId,
      entityType: "NEXREL_AI_BRAIN_PROFILE",
    },
    select: { metadata: true },
    orderBy: { createdAt: "desc" },
  });
  return normalizeProfile(row?.metadata);
}

export async function deriveBusinessBrainProfile(
  ctx: DalContext,
): Promise<BusinessBrainProfile> {
  const db = getCrmDb(ctx);
  const [
    user,
    activeLeads,
    activeDeals,
    knowledgeBaseCount,
    recentGoals,
    control,
  ] = await Promise.all([
    db.user.findUnique({
      where: { id: ctx.userId },
      select: {
        onboardingCompleted: true,
        productsServices: true,
        targetAudience: true,
        operatingLocation: true,
        leadSources: true,
        demographics: true,
        monthlyMarketingBudget: true,
        averageDealValue: true,
        currency: true,
        businessDescription: true,
      },
    }),
    db.lead.count({ where: { userId: ctx.userId } }),
    db.deal.count({ where: { userId: ctx.userId } as any }),
    db.knowledgeBase.count({ where: { userId: ctx.userId, isActive: true } }),
    db.auditLog.findMany({
      where: {
        userId: ctx.userId,
        entityType: "NEXREL_AI_BRAIN_DECISION",
      },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    db.auditLog.findFirst({
      where: {
        userId: ctx.userId,
        entityType: "AUTONOMY_CONTROL_POLICY",
      },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const goals = Array.from(
    new Set(
      recentGoals
        .map((row) => String((row.metadata as any)?.objective || "").trim())
        .filter(Boolean)
        .slice(0, 5),
    ),
  );

  const channels = control?.metadata
    ? Object.entries(
        ((control.metadata as any)?.channels || {}) as Record<string, boolean>,
      )
        .filter(([, enabled]) => Boolean(enabled))
        .map(([name]) => name)
    : parseCsv(user?.leadSources || "");

  return {
    profileId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    source: "derived",
    offers: parseCsv(user?.productsServices || user?.businessDescription || ""),
    icp: {
      audience: String(user?.targetAudience || "General market").slice(0, 280),
      location: String(user?.operatingLocation || "unspecified").slice(0, 120),
      channels,
      demographics: user?.demographics || undefined,
    },
    constraints: {
      budget: String(user?.monthlyMarketingBudget || "unknown").slice(0, 120),
      compliance: [],
      allowedChannels: channels,
    },
    economics: {
      averageDealValue:
        typeof user?.averageDealValue === "number"
          ? user.averageDealValue
          : null,
      currency: String(user?.currency || "USD"),
      monthlyMarketingBudget: String(user?.monthlyMarketingBudget || "unknown"),
      activeLeads,
      activeDeals,
    },
    goals: {
      primary:
        goals.length > 0
          ? goals
          : ["Increase qualified lead flow", "Improve conversion rate"],
      horizon: "90d",
    },
    evidence: {
      knowledgeBaseCount,
      onboardingCompleted: Boolean(user?.onboardingCompleted),
    },
  };
}

function mergeProfile(
  base: BusinessBrainProfile,
  patch: BusinessBrainPatch,
): BusinessBrainProfile {
  return {
    ...base,
    ...patch,
    icp: { ...base.icp, ...(patch.icp || {}) },
    constraints: { ...base.constraints, ...(patch.constraints || {}) },
    economics: { ...base.economics, ...(patch.economics || {}) },
    goals: { ...base.goals, ...(patch.goals || {}) },
    evidence: { ...base.evidence, ...(patch.evidence || {}) },
  };
}

export async function saveBusinessBrainProfile(input: {
  ctx: DalContext;
  actorUserId: string;
  patch?: BusinessBrainPatch;
  reason?: string;
}): Promise<BusinessBrainProfile> {
  const db = getCrmDb(input.ctx);
  const latest = await getLatestBusinessBrainProfile(input.ctx);
  const derived = await deriveBusinessBrainProfile(input.ctx);
  const base = latest || derived;
  const merged = input.patch ? mergeProfile(base, input.patch) : base;
  const profile: BusinessBrainProfile = {
    ...merged,
    profileId: crypto.randomUUID(),
    updatedAt: new Date().toISOString(),
    source: input.patch ? (latest ? "mixed" : "owner_update") : "derived",
  };

  await db.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_BRAIN_PROFILE",
      entityId: profile.profileId,
      metadata: {
        ...profile,
        reason:
          input.reason || (input.patch ? "owner_profile_update" : "refresh"),
      } as any,
      success: true,
    },
  });

  return profile;
}

export async function ensureBusinessBrainProfile(input: {
  ctx: DalContext;
  actorUserId: string;
  maxAgeHours?: number;
}): Promise<BusinessBrainProfile> {
  const latest = await getLatestBusinessBrainProfile(input.ctx);
  const maxAgeMs = (input.maxAgeHours || 24) * 60 * 60 * 1000;
  if (latest) {
    const ageMs = Date.now() - new Date(latest.updatedAt).getTime();
    if (ageMs <= maxAgeMs) return latest;
  }
  return saveBusinessBrainProfile({
    ctx: input.ctx,
    actorUserId: input.actorUserId,
    reason: "stale_profile_refresh",
  });
}
