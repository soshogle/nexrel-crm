import { getCrmDb } from "@/lib/dal";

export type ControlStatus = "running" | "paused" | "stopped";
export type ControlModule = "marketing" | "sales" | "social";
export type ControlChannel = "email" | "sms" | "voice" | "ads" | "social";

type ControlContext = {
  userId: string;
  industry: any;
};

export type AutonomyControlPolicy = {
  status: ControlStatus;
  modules: Record<ControlModule, boolean>;
  channels: Record<ControlChannel, boolean>;
  windows: {
    enabled: boolean;
    timezone: string;
    days: number[];
    startHour: number;
    endHour: number;
  };
  caps: {
    dailyTasks: number;
    dailyEmails: number;
    dailySms: number;
    dailyPosts: number;
    dailyAdLaunches: number;
  };
};

const ENTITY_TYPE = "AUTONOMY_CONTROL_POLICY";

export const DEFAULT_AUTONOMY_POLICY: AutonomyControlPolicy = {
  status: "running",
  modules: {
    marketing: true,
    sales: true,
    social: true,
  },
  channels: {
    email: true,
    sms: true,
    voice: true,
    ads: false,
    social: true,
  },
  windows: {
    enabled: false,
    timezone: "America/New_York",
    days: [1, 2, 3, 4, 5],
    startHour: 8,
    endHour: 18,
  },
  caps: {
    dailyTasks: 50,
    dailyEmails: 30,
    dailySms: 30,
    dailyPosts: 8,
    dailyAdLaunches: 1,
  },
};

function sanitizePolicy(input: any): AutonomyControlPolicy {
  return {
    status:
      input?.status === "paused" || input?.status === "stopped"
        ? input.status
        : "running",
    modules: {
      marketing: input?.modules?.marketing !== false,
      sales: input?.modules?.sales !== false,
      social: input?.modules?.social !== false,
    },
    channels: {
      email: input?.channels?.email !== false,
      sms: input?.channels?.sms !== false,
      voice: input?.channels?.voice !== false,
      ads: input?.channels?.ads === true,
      social: input?.channels?.social !== false,
    },
    windows: {
      enabled: input?.windows?.enabled === true,
      timezone:
        typeof input?.windows?.timezone === "string" &&
        input.windows.timezone.trim()
          ? input.windows.timezone
          : "America/New_York",
      days: Array.isArray(input?.windows?.days)
        ? input.windows.days
            .map((d: any) => Number(d))
            .filter((d: number) => Number.isInteger(d) && d >= 0 && d <= 6)
        : [1, 2, 3, 4, 5],
      startHour: Math.max(
        0,
        Math.min(23, Number(input?.windows?.startHour ?? 8)),
      ),
      endHour: Math.max(0, Math.min(23, Number(input?.windows?.endHour ?? 18))),
    },
    caps: {
      dailyTasks: Math.max(0, Number(input?.caps?.dailyTasks ?? 50)),
      dailyEmails: Math.max(0, Number(input?.caps?.dailyEmails ?? 30)),
      dailySms: Math.max(0, Number(input?.caps?.dailySms ?? 30)),
      dailyPosts: Math.max(0, Number(input?.caps?.dailyPosts ?? 8)),
      dailyAdLaunches: Math.max(0, Number(input?.caps?.dailyAdLaunches ?? 1)),
    },
  };
}

export async function getAutonomyControlPolicy(
  ctx: ControlContext,
): Promise<{ policy: AutonomyControlPolicy; updatedAt: string | null }> {
  const db = getCrmDb(ctx);
  const row = await db.auditLog.findFirst({
    where: { userId: ctx.userId, entityType: ENTITY_TYPE },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, createdAt: true },
  });

  const policy = sanitizePolicy(row?.metadata || DEFAULT_AUTONOMY_POLICY);
  return {
    policy,
    updatedAt: row?.createdAt ? row.createdAt.toISOString() : null,
  };
}

export async function saveAutonomyControlPolicy(
  ctx: ControlContext,
  nextPolicy: AutonomyControlPolicy,
  reason: string,
) {
  const db = getCrmDb(ctx);
  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "MEDIUM",
      entityType: ENTITY_TYPE,
      entityId: crypto.randomUUID(),
      metadata: {
        ...nextPolicy,
        reason,
        updatedAt: new Date().toISOString(),
      },
      success: true,
    },
  });
}

export function mergeAutonomyPolicy(
  current: AutonomyControlPolicy,
  patch: any,
): AutonomyControlPolicy {
  return sanitizePolicy({
    ...current,
    ...patch,
    modules: { ...current.modules, ...(patch?.modules || {}) },
    channels: { ...current.channels, ...(patch?.channels || {}) },
    windows: { ...current.windows, ...(patch?.windows || {}) },
    caps: { ...current.caps, ...(patch?.caps || {}) },
  });
}

export function evaluateAutonomyGate(input: {
  policy: AutonomyControlPolicy;
  module?: ControlModule;
  channel?: ControlChannel;
}): { ok: boolean; reason?: string } {
  const { policy, module, channel } = input;

  if (policy.status === "stopped") {
    return { ok: false, reason: "Autonomy is stopped by owner." };
  }
  if (policy.status === "paused") {
    return { ok: false, reason: "Autonomy is paused by owner." };
  }
  if (module && !policy.modules[module]) {
    return { ok: false, reason: `${module} module is disabled by owner.` };
  }
  if (channel && !policy.channels[channel]) {
    return { ok: false, reason: `${channel} channel is disabled by owner.` };
  }

  if (policy.windows.enabled) {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    const inDay = policy.windows.days.includes(day);
    const inHour =
      policy.windows.startHour <= policy.windows.endHour
        ? hour >= policy.windows.startHour && hour < policy.windows.endHour
        : hour >= policy.windows.startHour || hour < policy.windows.endHour;
    if (!inDay || !inHour) {
      return {
        ok: false,
        reason: "Outside owner-defined execution window.",
      };
    }
  }

  return { ok: true };
}
