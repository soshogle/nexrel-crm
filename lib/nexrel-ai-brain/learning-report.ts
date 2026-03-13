import { getCrmDb } from "@/lib/dal";

type LearningContext = {
  userId: string;
  industry: any;
};

type Bucket = {
  surface: string;
  objective: string;
  decisions: number;
  allowed: number;
  denied: number;
  outcomes: number;
  processed: number;
  sent: number;
  failed: number;
  blocked: number;
};

function keyOf(surface: string, objective: string) {
  return `${surface}::${objective}`;
}

export async function buildLearningReport(
  ctx: LearningContext,
  days: number,
): Promise<{
  windowDays: number;
  totals: {
    decisions: number;
    allowed: number;
    denied: number;
    outcomes: number;
    processed: number;
    sent: number;
    failed: number;
    blocked: number;
    allowRate: number;
  };
  mandate: {
    scans: number;
    dueDetected: number;
    tasksCreated: number;
  };
  bySurface: Bucket[];
}> {
  const normalizedDays = Math.max(1, Math.min(90, Number(days || 14)));
  const since = new Date(Date.now() - normalizedDays * 24 * 60 * 60 * 1000);
  const db = getCrmDb(ctx);

  const logs = await db.auditLog.findMany({
    where: {
      userId: ctx.userId,
      createdAt: { gte: since },
      entityType: {
        in: [
          "NEXREL_AI_BRAIN_DECISION",
          "NEXREL_AI_BRAIN_OUTCOME",
          "NEXREL_AI_BRAIN_MANDATE_SCAN",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    take: 3000,
    select: {
      entityType: true,
      metadata: true,
      createdAt: true,
    },
  });

  const map = new Map<string, Bucket>();
  let mandateScans = 0;
  let mandatesDue = 0;
  let mandateTasksCreated = 0;

  for (const log of logs) {
    const meta = (log.metadata || {}) as any;

    if (log.entityType === "NEXREL_AI_BRAIN_MANDATE_SCAN") {
      mandateScans += 1;
      const due = Array.isArray(meta?.dueMandates)
        ? meta.dueMandates.length
        : 0;
      mandatesDue += due;
      mandateTasksCreated += Number(meta?.tasksCreated || 0);
      continue;
    }

    const surface = String(meta?.surface || "unknown");
    const objective = String(meta?.objective || "unknown");
    const k = keyOf(surface, objective);
    if (!map.has(k)) {
      map.set(k, {
        surface,
        objective,
        decisions: 0,
        allowed: 0,
        denied: 0,
        outcomes: 0,
        processed: 0,
        sent: 0,
        failed: 0,
        blocked: 0,
      });
    }

    const bucket = map.get(k)!;
    if (log.entityType === "NEXREL_AI_BRAIN_DECISION") {
      bucket.decisions += 1;
      if (meta?.allowed) bucket.allowed += 1;
      else bucket.denied += 1;
      continue;
    }

    if (log.entityType === "NEXREL_AI_BRAIN_OUTCOME") {
      const actual = (meta?.actual || {}) as any;
      bucket.outcomes += 1;
      bucket.processed += Number(actual?.processed || 0);
      bucket.sent += Number(actual?.sent || 0);
      bucket.failed += Number(actual?.failed || 0);
      bucket.blocked += Number(actual?.blocked || 0);
    }
  }

  const bySurface = Array.from(map.values()).sort((a, b) => {
    const scoreA = a.sent - a.failed - a.blocked;
    const scoreB = b.sent - b.failed - b.blocked;
    return scoreB - scoreA;
  });

  const totals = bySurface.reduce(
    (acc, item) => {
      acc.decisions += item.decisions;
      acc.allowed += item.allowed;
      acc.denied += item.denied;
      acc.outcomes += item.outcomes;
      acc.processed += item.processed;
      acc.sent += item.sent;
      acc.failed += item.failed;
      acc.blocked += item.blocked;
      return acc;
    },
    {
      decisions: 0,
      allowed: 0,
      denied: 0,
      outcomes: 0,
      processed: 0,
      sent: 0,
      failed: 0,
      blocked: 0,
    },
  );

  const allowRate = totals.decisions
    ? Math.round((totals.allowed / totals.decisions) * 100)
    : 100;

  return {
    windowDays: normalizedDays,
    totals: { ...totals, allowRate },
    mandate: {
      scans: mandateScans,
      dueDetected: mandatesDue,
      tasksCreated: mandateTasksCreated,
    },
    bySurface,
  };
}
