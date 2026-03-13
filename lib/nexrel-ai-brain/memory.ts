import { getCrmDb } from "@/lib/dal";
import type { DalContext } from "@/lib/dal/types";

export type MemorySnippet = {
  kind: "strategy" | "risk" | "event" | "profile";
  title: string;
  detail: string;
  score: number;
};

export type NexrelAIMemoryContext = {
  memoryId: string;
  generatedAt: string;
  windowDays: number;
  snippets: MemorySnippet[];
  sourceCounts: {
    decisions: number;
    outcomes: number;
    crmEvents: number;
    profiles: number;
  };
};

function toNumber(input: unknown): number {
  const n = Number(input || 0);
  return Number.isFinite(n) ? n : 0;
}

function clamp(input: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, input));
}

export function scoreOutcome(actual: any): number {
  const sent = toNumber(actual?.sent);
  const processed = toNumber(actual?.processed);
  const failed = toNumber(actual?.failed);
  const blocked = toNumber(actual?.blocked);
  const base = sent + Math.max(0, processed - failed - blocked);
  return clamp(base - failed * 2 - blocked * 2, -1000, 1000);
}

export async function buildNexrelAIMemoryContext(input: {
  ctx: DalContext;
  windowDays?: number;
}): Promise<NexrelAIMemoryContext> {
  const windowDays = clamp(Math.floor(Number(input.windowDays || 30)), 7, 180);
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const db = getCrmDb(input.ctx);

  const [decisions, outcomes, profiles, crmEvents] = await Promise.all([
    db.auditLog.findMany({
      where: {
        userId: input.ctx.userId,
        entityType: "NEXREL_AI_BRAIN_DECISION",
        createdAt: { gte: since },
      },
      select: { metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    db.auditLog.findMany({
      where: {
        userId: input.ctx.userId,
        entityType: "NEXREL_AI_BRAIN_OUTCOME",
        createdAt: { gte: since },
      },
      select: { metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
    db.auditLog.findMany({
      where: {
        userId: input.ctx.userId,
        entityType: "NEXREL_AI_BRAIN_PROFILE",
        createdAt: { gte: since },
      },
      select: { metadata: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.auditLog.findMany({
      where: {
        userId: input.ctx.userId,
        entityType: "CRM_EVENT",
        createdAt: { gte: since },
      },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: 2000,
    }),
  ]);

  const objectiveScores = new Map<
    string,
    { objective: string; surface: string; score: number; count: number }
  >();
  for (const row of outcomes) {
    const meta = (row.metadata || {}) as any;
    const objective = String(meta?.objective || "unknown");
    const surface = String(meta?.surface || "unknown");
    const key = `${surface}::${objective}`;
    const score = scoreOutcome(meta?.actual || {});
    const current = objectiveScores.get(key) || {
      objective,
      surface,
      score: 0,
      count: 0,
    };
    current.score += score;
    current.count += 1;
    objectiveScores.set(key, current);
  }

  const deniedByObjective = new Map<string, number>();
  for (const row of decisions) {
    const meta = (row.metadata || {}) as any;
    const objective = String(meta?.objective || "unknown");
    const denied = Array.isArray(meta?.deniedActions)
      ? meta.deniedActions.length
      : 0;
    deniedByObjective.set(
      objective,
      (deniedByObjective.get(objective) || 0) + denied,
    );
  }

  const eventCounts = new Map<string, number>();
  for (const row of crmEvents) {
    const type = String((row.metadata as any)?.type || "unknown");
    eventCounts.set(type, (eventCounts.get(type) || 0) + 1);
  }

  const strategySnippets: MemorySnippet[] = Array.from(objectiveScores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => ({
      kind: "strategy",
      title: `Top objective: ${item.objective}`,
      detail: `${item.surface} produced net score ${item.score} across ${item.count} outcomes`,
      score: item.score,
    }));

  const riskSnippets: MemorySnippet[] = Array.from(deniedByObjective.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([objective, deniedCount]) => ({
      kind: "risk",
      title: `Frequent policy friction: ${objective}`,
      detail: `${deniedCount} denied actions in recent window`,
      score: deniedCount,
    }));

  const eventSnippets: MemorySnippet[] = Array.from(eventCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([eventType, count]) => ({
      kind: "event",
      title: `CRM signal: ${eventType}`,
      detail: `${count} events over ${windowDays} days`,
      score: count,
    }));

  const latestProfile = profiles[0]?.metadata as any;
  const profileSnippet: MemorySnippet[] = latestProfile
    ? [
        {
          kind: "profile",
          title: "Latest business profile",
          detail: `Offers: ${(latestProfile?.offers || []).slice(0, 3).join(", ") || "n/a"} | ICP: ${latestProfile?.icp?.audience || "n/a"}`,
          score: 1,
        },
      ]
    : [];

  return {
    memoryId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    windowDays,
    snippets: [
      ...strategySnippets,
      ...riskSnippets,
      ...eventSnippets,
      ...profileSnippet,
    ].slice(0, 10),
    sourceCounts: {
      decisions: decisions.length,
      outcomes: outcomes.length,
      crmEvents: crmEvents.length,
      profiles: profiles.length,
    },
  };
}
