import { getCrmDb } from "@/lib/dal";

type AgentCenterContext = {
  userId: string;
  industry: any;
};

export type AutonomyTrustMode = "crawl" | "walk" | "run";

const TRUST_ENTITY_TYPE = "AUTONOMY_TRUST_MODE";

export async function getLatestTrustMode(ctx: AgentCenterContext): Promise<{
  mode: AutonomyTrustMode;
  updatedAt: string | null;
}> {
  const db = getCrmDb(ctx);
  const row = await db.auditLog.findFirst({
    where: { userId: ctx.userId, entityType: TRUST_ENTITY_TYPE },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, createdAt: true },
  });

  const mode = String((row?.metadata as any)?.mode || "crawl").toLowerCase();
  const normalized: AutonomyTrustMode =
    mode === "walk" || mode === "run" ? mode : "crawl";

  return {
    mode: normalized,
    updatedAt: row?.createdAt?.toISOString() || null,
  };
}

export async function setTrustMode(
  ctx: AgentCenterContext,
  mode: AutonomyTrustMode,
) {
  const db = getCrmDb(ctx);
  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "MEDIUM",
      entityType: TRUST_ENTITY_TYPE,
      entityId: crypto.randomUUID(),
      metadata: {
        mode,
        updatedAt: new Date().toISOString(),
      },
      success: true,
    },
  });
}
