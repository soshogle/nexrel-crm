import { getCrmDb } from "@/lib/dal";

type MandateContext = {
  userId: string;
  industry: any;
};

type MandateStatus = "ok" | "due" | "missing";

export type MandateHealth = {
  key: string;
  label: string;
  status: MandateStatus;
  maxAgeHours: number;
  lastRunAt: string | null;
  reason: string;
};

const MANDATES = [
  {
    key: "sentiment_pulse",
    label: "Sentiment Pulse",
    maxAgeHours: 24,
    checkEntityTypes: ["NEXREL_AI_OPERATION", "NEXREL_AI_BRAIN_DECISION"],
    checkModes: ["go_viral_mandate", "social_media_loop"],
  },
  {
    key: "autonomy_cycle",
    label: "Autonomy Revenue Cycle",
    maxAgeHours: 24,
    checkEntityTypes: ["NEXREL_AI_OPERATION"],
    checkModes: ["agent_command_center_cycle", "sales_squad"],
  },
  {
    key: "campaign_enrollment_scan",
    label: "Campaign Enrollment Scan",
    maxAgeHours: 24,
    checkEntityTypes: ["NEXREL_AI_BRAIN_DECISION"],
    checkModes: ["campaign_trigger"],
  },
];

function deriveStatus(
  lastRunAt: Date | null,
  maxAgeHours: number,
): MandateStatus {
  if (!lastRunAt) return "missing";
  const ageMs = Date.now() - lastRunAt.getTime();
  return ageMs > maxAgeHours * 60 * 60 * 1000 ? "due" : "ok";
}

export async function evaluateMandateFreshness(ctx: MandateContext) {
  const db = getCrmDb(ctx);
  const health: MandateHealth[] = [];

  for (const mandate of MANDATES) {
    const logs = await db.auditLog.findMany({
      where: {
        userId: ctx.userId,
        entityType: { in: mandate.checkEntityTypes as any },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { createdAt: true, metadata: true },
    });

    const hit = logs.find((log) => {
      const metadata = (log.metadata || {}) as any;
      const mode = String(
        metadata?.mode || metadata?.objective || "",
      ).toLowerCase();
      return mandate.checkModes.some((m) => mode.includes(m));
    });

    const lastRunAt = hit?.createdAt || null;
    const status = deriveStatus(lastRunAt, mandate.maxAgeHours);
    health.push({
      key: mandate.key,
      label: mandate.label,
      status,
      maxAgeHours: mandate.maxAgeHours,
      lastRunAt: lastRunAt ? lastRunAt.toISOString() : null,
      reason:
        status === "ok"
          ? "Fresh"
          : status === "due"
            ? "Stale and due"
            : "Not yet run",
    });
  }

  return health;
}

export async function autoHealMandates(ctx: MandateContext) {
  const db = getCrmDb(ctx);
  const health = await evaluateMandateFreshness(ctx);
  const due = health.filter((h) => h.status !== "ok");
  let tasksCreated = 0;

  for (const item of due) {
    await db.task.create({
      data: {
        userId: ctx.userId,
        title: `Nexrel AI mandate due: ${item.label}`,
        description: `Open a remediation run for ${item.label}. Status=${item.status}.`,
        priority: "HIGH",
        status: "TODO",
        aiSuggested: true,
        autoCreated: true,
        tags: ["nexrel-ai", "mandate", item.key],
      },
    });
    tasksCreated += 1;
  }

  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: due.length > 0 ? "MEDIUM" : "LOW",
      entityType: "NEXREL_AI_BRAIN_MANDATE_SCAN",
      entityId: crypto.randomUUID(),
      metadata: {
        scannedAt: new Date().toISOString(),
        dueMandates: due,
        tasksCreated,
      },
      success: true,
    },
  });

  return {
    health,
    dueCount: due.length,
    tasksCreated,
  };
}
