import { AIJobStatus, AIEmployeeType } from "@prisma/client";
import { getCrmDb } from "@/lib/dal";
import { createHash, randomBytes } from "crypto";
import {
  classifyBlocker,
  classifyWorkflowTier,
  parseCommandEvidence,
  shouldEscalateToHuman,
} from "@/lib/ai-employees/reliability";

type LiveRunContext = {
  userId: string;
  industry: any;
};

type ExecutionTarget = "cloud_browser" | "owner_desktop";
type ExecutionRuntime = "openclaw" | "legacy_worker";
type TrustMode = "crawl" | "walk" | "run";
type AutonomyLevel =
  | "observe"
  | "assist"
  | "autonomous_low_risk"
  | "autonomous_full";
type StepStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "rejected";
type SessionState =
  | "queued"
  | "planning"
  | "running"
  | "awaiting_approval"
  | "paused"
  | "takeover"
  | "completed"
  | "failed"
  | "stopped";

type LiveRunStep = {
  id: string;
  title: string;
  actionType:
    | "navigate"
    | "click"
    | "type"
    | "extract"
    | "verify"
    | "open_app"
    | "run_command";
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  target?: string;
  value?: string;
  meta?: Record<string, any>;
  status: StepStatus;
  result?: string;
};

type LiveRunEvent = {
  id: string;
  type:
    | "session_started"
    | "step_started"
    | "clicked"
    | "typed"
    | "navigated"
    | "step_completed"
    | "paused"
    | "resumed"
    | "approval_required"
    | "approved"
    | "rejected"
    | "takeover"
    | "stopped"
    | "command_enqueued"
    | "command_completed"
    | "error";
  message: string;
  createdAt: string;
  trace?: {
    seq?: number;
    stepId?: string;
    commandId?: string;
    source?: string;
  };
};

type WorkerCommand = {
  commandId: string;
  stepId: string;
  actionType:
    | "navigate"
    | "click"
    | "type"
    | "extract"
    | "verify"
    | "open_app"
    | "run_command";
  target?: string;
  value?: string;
  status: "queued" | "running" | "completed" | "failed";
  detail?: string;
  source?: "ai_plan" | "owner_remote";
  meta?: Record<string, any>;
  attempt?: number;
  maxAttempts?: number;
  createdAt: string;
  updatedAt: string;
};

type LiveRunPayload = {
  goal: string;
  targetApps: string[];
  trustMode: TrustMode;
  autonomyLevel?: AutonomyLevel;
  executionRuntime?: ExecutionRuntime;
  executionTarget: ExecutionTarget;
  deviceId?: string | null;
  employeeType?: string;
  employeeName?: string;
};

function resolveExecutionRuntime(payload: LiveRunPayload): ExecutionRuntime {
  if (payload.executionRuntime === "legacy_worker") return "legacy_worker";
  return "openclaw";
}

function resolveAutonomyLevel(payload: LiveRunPayload): AutonomyLevel {
  if (payload.autonomyLevel) return payload.autonomyLevel;
  if (payload.trustMode === "crawl") return "observe";
  if (payload.trustMode === "walk") return "assist";
  return "autonomous_low_risk";
}

function shouldRequireApproval(
  step: Pick<LiveRunStep, "actionType" | "riskTier">,
  autonomy: AutonomyLevel,
): boolean {
  if (autonomy === "observe") return true;
  if (autonomy === "assist") {
    return (
      step.riskTier !== "LOW" ||
      step.actionType === "run_command" ||
      step.actionType === "open_app"
    );
  }
  if (autonomy === "autonomous_low_risk") {
    return step.riskTier === "HIGH" || step.actionType === "run_command";
  }
  return false;
}

function retryBudgetFor(
  autonomy: AutonomyLevel,
  actionType: WorkerCommand["actionType"],
  workflowTier: "tier_1" | "tier_2" | "tier_3" = "tier_3",
  historicalSuccessRate = 0.8,
): number {
  let budget = 1;
  if (autonomy === "assist") budget = actionType === "navigate" ? 2 : 1;
  if (autonomy === "autonomous_low_risk") {
    budget = actionType === "run_command" ? 1 : 2;
  }
  if (autonomy === "autonomous_full") {
    budget = actionType === "run_command" ? 2 : 3;
  }

  if (workflowTier === "tier_1") budget += 1;
  if (workflowTier === "tier_3") budget -= 1;

  if (historicalSuccessRate >= 0.92) budget += 1;
  if (historicalSuccessRate < 0.65) budget -= 1;

  return Math.max(1, Math.min(5, budget));
}

function deriveSuccessCriteria(goal: string, appName: string): string[] {
  const criteria = [
    "Target application opened",
    "Working context loaded",
    "Final state verified against goal",
  ];
  const text = String(goal || "").toLowerCase();
  if (text.includes("play"))
    criteria.push("Media playback action is triggered");
  if (
    text.includes("send") ||
    text.includes("email") ||
    text.includes("message")
  ) {
    criteria.push("Communication action drafted or sent correctly");
  }
  if (text.includes("update") || text.includes("edit")) {
    criteria.push("Requested changes are reflected in UI");
  }
  criteria.push(`Work completed in ${appName}`);
  return criteria;
}

function extractFirstUrl(text: string): string | null {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

function inferAppName(payload: LiveRunPayload): string {
  const fromTarget = String(payload.targetApps?.[0] || "").trim();
  if (fromTarget) return fromTarget;

  const goal = String(payload.goal || "").toLowerCase();
  const aliases: Array<[string, string]> = [
    ["spotify", "Spotify"],
    ["slack", "Slack"],
    ["zoom", "zoom.us"],
    ["notion", "Notion"],
    ["calendar", "Calendar"],
    ["outlook", "Microsoft Outlook"],
    ["excel", "Microsoft Excel"],
    ["google sheets", "Google Chrome"],
    ["google calendar", "Google Chrome"],
    ["gmail", "Google Chrome"],
    ["chrome", "Google Chrome"],
    ["safari", "Safari"],
  ];
  for (const [needle, app] of aliases) {
    if (goal.includes(needle)) return app;
  }

  const openAppMatch = goal.match(
    /open\s+(?:my\s+)?([a-z0-9\s._-]+?)\s+app\b/i,
  );
  if (openAppMatch?.[1]) {
    return openAppMatch[1]
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return "Google Chrome";
}

function isOpenAppOnlyGoal(goal: string): boolean {
  const text = String(goal || "")
    .trim()
    .toLowerCase();
  if (!text) return false;
  if (/^open\s+(?:my\s+)?[a-z0-9\s._-]+\s+app\.?$/.test(text)) return true;
  if (/^open\s+(?:my\s+)?calendar\b/.test(text)) return true;
  if (/^open\s+(?:my\s+)?outlook\b/.test(text)) return true;
  return false;
}

function buildNavigationTarget(
  payload: LiveRunPayload,
  appName: string,
): string {
  const goal = String(payload.goal || "").trim();
  if (isOpenAppOnlyGoal(goal)) return "";
  const directUrl = extractFirstUrl(goal);
  if (directUrl) return directUrl;

  if (appName.toLowerCase() === "spotify") {
    const playMatch = goal.match(/play\s+(.+)$/i);
    if (playMatch?.[1]) {
      return `https://open.spotify.com/search/${encodeURIComponent(playMatch[1].trim())}`;
    }
    return "https://open.spotify.com";
  }

  if (appName.toLowerCase() === "calendar") {
    return "";
  }

  return `https://www.google.com/search?q=${encodeURIComponent(goal || appName)}`;
}

function buildCalendarEventFromGoal(goal: string) {
  const raw = String(goal || "").trim();
  const lower = raw.toLowerCase();
  const wantsEvent =
    /create|schedule|book|add/.test(lower) &&
    /appointment|event|meeting/.test(lower);
  if (!wantsEvent) return null;

  const titleMatch = raw.match(
    /(?:appointment|event|meeting)\s+(?:with|for)\s+([^,.]+)/i,
  );
  const title = titleMatch?.[1]
    ? `Meeting with ${titleMatch[1].trim()}`
    : "Nexrel Scheduled Appointment";

  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  start.setSeconds(0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const ampmMatch = raw.match(
    /(?:at\s+)?(1[0-2]|0?[1-9])(?::([0-5][0-9]))?\s*(am|pm)/i,
  );
  if (ampmMatch) {
    let hour = Number(ampmMatch[1]);
    const minute = Number(ampmMatch[2] || "0");
    const ampm = ampmMatch[3].toLowerCase();
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    start.setHours(hour, minute, 0, 0);
    end.setTime(start.getTime() + 60 * 60 * 1000);
  }

  if (/tomorrow/i.test(raw)) {
    start.setDate(start.getDate() + 1);
    end.setDate(end.getDate() + 1);
  }

  return {
    title,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    notes: `Created by Nexrel AI for goal: ${raw}`,
  };
}

function buildObjectiveContract(
  payload: LiveRunPayload,
  successCriteria: string[],
) {
  return {
    objective: payload.goal,
    targetApps: payload.targetApps,
    verification: successCriteria,
    constraints: {
      obeyPolicies: true,
      requireEvidence: true,
      avoidIrreversibleActionsWithoutApproval: true,
    },
  };
}

function extractAllowedDomains(payload: LiveRunPayload): string[] {
  const values = [payload.goal, ...(payload.targetApps || [])]
    .map((v) => String(v || ""))
    .filter(Boolean);
  const domains = new Set<string>();

  for (const value of values) {
    const matches = value.match(/https?:\/\/[^\s,]+/gi) || [];
    for (const url of matches) {
      try {
        domains.add(new URL(url).hostname.toLowerCase());
      } catch {}
    }

    if (/\bgoogle\s*calendar\b/i.test(value))
      domains.add("calendar.google.com");
    if (/\bgmail\b/i.test(value)) domains.add("mail.google.com");
    if (/\bspotify\b/i.test(value)) domains.add("open.spotify.com");
  }

  return Array.from(domains);
}

function buildControlPolicy(payload: LiveRunPayload, autonomy: AutonomyLevel) {
  return {
    allowedActionTypes: [
      "open_app",
      "navigate",
      "click",
      "type",
      "extract",
      "verify",
    ],
    allowRunCommand: false,
    allowedDomains: extractAllowedDomains(payload),
    allowedApps: (payload.targetApps || []).map((v) => String(v || "").trim()),
    requireApprovalForOutOfPolicy: true,
    autonomy,
  };
}

function getPolicy(output: any, input: LiveRunPayload) {
  if (output?.memory?.controlPlane?.policy)
    return output.memory.controlPlane.policy;
  return buildControlPolicy(input, resolveAutonomyLevel(input));
}

function parseHostname(target?: string) {
  const raw = String(target || "").trim();
  if (!raw) return "";
  try {
    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function assessPolicy(
  policy: any,
  command: Pick<WorkerCommand, "actionType" | "target" | "value">,
) {
  const allowedActionTypes = Array.isArray(policy?.allowedActionTypes)
    ? policy.allowedActionTypes
    : [];
  if (!allowedActionTypes.includes(command.actionType)) {
    return {
      allowed: false,
      reason: `Action ${command.actionType} is outside current policy`,
    };
  }

  if (command.actionType === "run_command" && !policy?.allowRunCommand) {
    return {
      allowed: false,
      reason: "Local shell commands are blocked by policy",
    };
  }

  if (command.actionType === "navigate") {
    const allowedDomains = Array.isArray(policy?.allowedDomains)
      ? policy.allowedDomains.map((v: string) => String(v).toLowerCase())
      : [];
    if (allowedDomains.length > 0) {
      const host = parseHostname(command.target || command.value);
      if (
        host &&
        !allowedDomains.some((domain: string) => host.endsWith(domain))
      ) {
        return {
          allowed: false,
          reason: `Navigation domain ${host} is outside allowed scope`,
        };
      }
    }
  }

  if (command.actionType === "open_app") {
    const allowedApps = Array.isArray(policy?.allowedApps)
      ? policy.allowedApps
          .map((v: string) =>
            String(v || "")
              .trim()
              .toLowerCase(),
          )
          .filter(Boolean)
      : [];
    if (allowedApps.length > 0) {
      const app = String(command.target || command.value || "")
        .trim()
        .toLowerCase();
      if (
        app &&
        !allowedApps.some((allowed: string) => app.includes(allowed))
      ) {
        return {
          allowed: false,
          reason: `App ${command.target || command.value || "unknown"} is outside allowed app scope`,
        };
      }
    }
  }

  return { allowed: true };
}

function createDefaultPlan(payload: LiveRunPayload): LiveRunStep[] {
  const appName = inferAppName(payload);
  const openAppOnly = isOpenAppOnlyGoal(payload.goal);
  const navigationTarget = buildNavigationTarget(payload, appName);
  const successCriteria = deriveSuccessCriteria(payload.goal, appName);
  const autonomy = resolveAutonomyLevel(payload);

  const steps: LiveRunStep[] = [];

  if (payload.executionTarget === "owner_desktop") {
    const calendarEvent =
      appName.toLowerCase() === "calendar"
        ? buildCalendarEventFromGoal(payload.goal)
        : null;
    const step: LiveRunStep = {
      id: crypto.randomUUID(),
      title: `Open ${appName}`,
      actionType: "open_app",
      riskTier: "MEDIUM",
      requiresApproval: false,
      target: appName,
      meta: calendarEvent ? { calendarEvent } : undefined,
      status: "pending",
    };
    step.requiresApproval = shouldRequireApproval(step, autonomy);
    steps.push(step);

    if (openAppOnly) {
      return steps;
    }
  }

  steps.push(
    ...(navigationTarget
      ? [
          (() => {
            const step: LiveRunStep = {
              id: crypto.randomUUID(),
              title: `Navigate to working context`,
              actionType: "navigate" as const,
              riskTier: "LOW" as const,
              requiresApproval: false,
              target: navigationTarget,
              status: "pending" as const,
            };
            step.requiresApproval = shouldRequireApproval(step, autonomy);
            return step;
          })(),
        ]
      : []),
    (() => {
      const step: LiveRunStep = {
        id: crypto.randomUUID(),
        title: "Extract current page state",
        actionType: "extract",
        riskTier: "LOW",
        requiresApproval: false,
        status: "pending",
      };
      step.requiresApproval = shouldRequireApproval(step, autonomy);
      return step;
    })(),
    (() => {
      const step: LiveRunStep = {
        id: crypto.randomUUID(),
        title: "Verify goal progress and completion state",
        actionType: "verify",
        riskTier: "MEDIUM",
        requiresApproval: false,
        value: successCriteria.join(" | "),
        status: "pending",
      };
      step.requiresApproval = shouldRequireApproval(step, autonomy);
      return step;
    })(),
  );

  return steps;
}

async function issueWorkerTokenForSession(input: {
  ctx: LiveRunContext;
  sessionId: string;
  forceRequired?: boolean;
  baseUrl?: string | null;
}) {
  const db = getCrmDb(input.ctx);
  const session = await db.aIJob.findFirst({
    where: {
      id: input.sessionId,
      userId: input.ctx.userId,
      jobType: "live_browser_session",
    },
    select: {
      id: true,
      output: true,
    },
  });
  if (!session) throw new Error("Live run session not found");

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const tokenSecret = randomBytes(24).toString("hex");
  const tokenPayload = {
    v: 1,
    sessionId: session.id,
    userId: input.ctx.userId,
    baseUrl: String(input.baseUrl || "").trim() || null,
    exp: expiresAt,
  };
  const token = `nxa.${Buffer.from(JSON.stringify(tokenPayload)).toString("base64url")}.${tokenSecret}`;
  const tokenHash = sha256(token);
  const output = { ...((session.output || {}) as any) };
  output.worker = {
    ...(output.worker || {}),
    required:
      typeof input.forceRequired === "boolean"
        ? input.forceRequired
        : Boolean(output?.worker?.required),
    tokenHash,
    tokenExpiresAt: expiresAt,
    commands: Array.isArray(output?.worker?.commands)
      ? output.worker.commands
      : [],
  };

  await db.aIJob.update({
    where: { id: session.id },
    data: { output },
  });

  return {
    token,
    expiresAt,
    sessionId: session.id,
  };
}

function getInitialOutput(
  payload: LiveRunPayload,
  historicalMemory?: {
    priorRuns: number;
    successRate: number;
    blockerFrequency: Record<string, number>;
    strategyHints: string[];
    traceReplaySeed: string | null;
  },
) {
  const steps = createDefaultPlan(payload);
  const appName = inferAppName(payload);
  const successCriteria = deriveSuccessCriteria(payload.goal, appName);
  const autonomyLevel = resolveAutonomyLevel(payload);
  const executionRuntime = resolveExecutionRuntime(payload);
  const workflowTier = classifyWorkflowTier({
    goal: payload.goal,
    targetApps: payload.targetApps,
  });
  const objectiveContract = buildObjectiveContract(payload, successCriteria);
  const policy = buildControlPolicy(payload, autonomyLevel);
  const events: LiveRunEvent[] = [
    {
      id: crypto.randomUUID(),
      type: "session_started",
      message: `Mission started: ${payload.goal}`,
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    sessionState: "planning" as SessionState,
    steps,
    events,
    currentStepId: null as string | null,
    paused: false,
    stopped: false,
    takeover: false,
    worker: {
      required: payload.executionTarget === "owner_desktop",
      connected: false,
      liveBoost: false,
      lastHeartbeatAt: null as string | null,
      tokenHash: null as string | null,
      tokenExpiresAt: null as string | null,
      commands: [] as WorkerCommand[],
    },
    memory: {
      missionGoal: payload.goal,
      autonomyLevel,
      executionRuntime,
      workflowTier,
      objectiveContract,
      controlPlane: {
        auth: true,
        policies: true,
        audit: true,
        verification: true,
        policy,
      },
      historical: historicalMemory || {
        priorRuns: 0,
        successRate: 0.8,
        blockerFrequency: {},
        strategyHints: [],
        traceReplaySeed: null,
      },
      traceReplay: {
        traceId: crypto.randomUUID(),
        seed: historicalMemory?.traceReplaySeed || null,
        lastHash: "GENESIS",
        lastSeq: 0,
      },
      successCriteria,
      timeline: [] as Array<{ at: string; note: string; kind: string }>,
      blockers: [] as Array<{ at: string; blocker: string; detail?: string }>,
      replans: [] as Array<{ at: string; reason: string; action: string }>,
    },
    framePreview:
      executionRuntime === "openclaw"
        ? "OpenClaw runtime initialized. Building autonomous execution plan."
        : "Planner initialized. Nexrel AI building execution plan.",
  };
}

function appendMemoryNote(
  output: any,
  note: { kind: string; note: string; blocker?: string; detail?: string },
) {
  const next = { ...(output || {}) };
  const memory = { ...(next.memory || {}) };
  const timeline = Array.isArray(memory.timeline) ? [...memory.timeline] : [];
  const blockers = Array.isArray(memory.blockers) ? [...memory.blockers] : [];
  timeline.push({
    at: new Date().toISOString(),
    kind: note.kind,
    note: note.note,
  });
  if (note.blocker) {
    blockers.push({
      at: new Date().toISOString(),
      blocker: note.blocker,
      detail: note.detail,
    });
  }
  memory.timeline = timeline.slice(-120);
  memory.blockers = blockers.slice(-50);
  next.memory = memory;
  return next;
}

function hasSufficientCompletionEvidence(output: any, steps: LiveRunStep[]) {
  const workerRequired = Boolean(output?.worker?.required);
  if (!workerRequired) return true;
  const runtime = String(output?.memory?.executionRuntime || "openclaw");
  const completed = steps.filter((s) => s.status === "completed");
  if (completed.length === 0) return false;

  for (const step of completed) {
    const evidence = parseCommandEvidence(String(step.result || ""));
    if (!evidence) {
      if (runtime === "legacy_worker" && String(step.result || "").trim()) {
        continue;
      }
      return false;
    }
    if (String(evidence.status || "").toLowerCase() !== "completed") {
      return false;
    }
  }

  return true;
}

async function buildHistoricalMemory(
  db: ReturnType<typeof getCrmDb>,
  ctx: LiveRunContext,
) {
  const recent = await db.aIJob.findMany({
    where: {
      userId: ctx.userId,
      jobType: "live_browser_session",
    },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: {
      status: true,
      output: true,
      input: true,
      createdAt: true,
    },
  });

  if (recent.length === 0) {
    return {
      priorRuns: 0,
      successRate: 0.8,
      blockerFrequency: {} as Record<string, number>,
      strategyHints: [] as string[],
      traceReplaySeed: null as string | null,
    };
  }

  const successful = recent.filter(
    (run) => run.status === AIJobStatus.COMPLETED,
  ).length;
  const blockerFrequency: Record<string, number> = {};
  const strategyHints = new Set<string>();

  for (const run of recent) {
    const output = (run.output || {}) as any;
    const memory = output?.memory || {};
    const blockers = Array.isArray(memory.blockers) ? memory.blockers : [];
    for (const blocker of blockers) {
      const key = String(blocker?.blocker || "unknown");
      blockerFrequency[key] = (blockerFrequency[key] || 0) + 1;
    }
    const timeline = Array.isArray(memory.timeline) ? memory.timeline : [];
    for (const item of timeline) {
      const note = String(item?.note || "");
      if (/fallback|replan|recovered/i.test(note)) {
        strategyHints.add(note.slice(0, 180));
      }
    }
  }

  return {
    priorRuns: recent.length,
    successRate: Math.max(0.1, successful / recent.length),
    blockerFrequency,
    strategyHints: Array.from(strategyHints).slice(0, 8),
    traceReplaySeed: `replay-${recent[0].createdAt.toISOString()}`,
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function logRunEvent(
  ctx: LiveRunContext,
  sessionId: string,
  event: LiveRunEvent,
) {
  const db = getCrmDb(ctx);
  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_LIVE_RUN_EVENT",
      entityId: sessionId,
      metadata: event,
      success: true,
    },
  });
}

async function resolveEmployee(
  ctx: LiveRunContext,
  id: string,
  payload: LiveRunPayload,
) {
  const db = getCrmDb(ctx);
  const supportedTypes = new Set<string>(Object.values(AIEmployeeType));
  const refType = supportedTypes.has(id) ? (id as AIEmployeeType) : null;
  const payloadType = payload.employeeType
    ? payload.employeeType.trim().toUpperCase()
    : "";
  const safePayloadType = supportedTypes.has(payloadType)
    ? (payloadType as AIEmployeeType)
    : null;

  const byId = await db.aIEmployee.findFirst({
    where: { id, userId: ctx.userId },
    select: { id: true, name: true, type: true },
  });
  if (byId) return byId;

  const byRefType = refType
    ? await db.aIEmployee.findFirst({
        where: {
          userId: ctx.userId,
          type: refType,
          isActive: true,
        },
        select: { id: true, name: true, type: true },
      })
    : null;
  if (byRefType) return byRefType;

  const byType = safePayloadType
    ? await db.aIEmployee.findFirst({
        where: {
          userId: ctx.userId,
          type: safePayloadType,
          isActive: true,
        },
        select: { id: true, name: true, type: true },
      })
    : null;
  if (byType) return byType;

  return db.aIEmployee.create({
    data: {
      userId: ctx.userId,
      type: safePayloadType || AIEmployeeType.COMMUNICATION_SPECIALIST,
      name: payload.employeeName || "Nexrel AI Live Agent",
      description: "Live browser/desktop mission operator",
      capabilities: {
        liveRun: true,
        executionTargets: ["cloud_browser", "owner_desktop"],
      },
      isActive: true,
    },
    select: { id: true, name: true, type: true },
  });
}

export async function startLiveRun(
  ctx: LiveRunContext,
  employeeRef: string,
  payload: LiveRunPayload,
) {
  const db = getCrmDb(ctx);
  const normalizedPayload: LiveRunPayload = {
    ...payload,
    executionRuntime: resolveExecutionRuntime(payload),
  };
  const employee = await resolveEmployee(ctx, employeeRef, normalizedPayload);
  const historicalMemory = await buildHistoricalMemory(db, ctx);
  const output = getInitialOutput(normalizedPayload, historicalMemory);

  const job = await db.aIJob.create({
    data: {
      userId: ctx.userId,
      employeeId: employee.id,
      jobType: "live_browser_session",
      priority: "HIGH",
      status: AIJobStatus.RUNNING,
      progress: 5,
      startedAt: new Date(),
      input: {
        ...normalizedPayload,
        employeeRef,
        missionType: "nexrel_ai_live_run",
      },
      output,
    },
    select: {
      id: true,
      employeeId: true,
      status: true,
      progress: true,
      createdAt: true,
      input: true,
      output: true,
    },
  });

  await logRunEvent(ctx, job.id, output.events[0]);

  if (normalizedPayload.executionTarget === "owner_desktop") {
    const workerToken = await issueWorkerTokenForSession({
      ctx,
      sessionId: job.id,
      forceRequired: true,
    });
    return {
      ...job,
      workerToken: workerToken.token,
      workerTokenExpiresAt: workerToken.expiresAt,
    };
  }

  return job;
}

export async function getLiveRun(ctx: LiveRunContext, sessionId: string) {
  const db = getCrmDb(ctx);
  const session = await db.aIJob.findFirst({
    where: {
      id: sessionId,
      userId: ctx.userId,
      jobType: "live_browser_session",
    },
    include: {
      employee: {
        select: { id: true, name: true, type: true },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!session) return null;
  return session;
}

function appendEvent(output: any, event: LiveRunEvent) {
  const next = { ...(output || {}) };
  const existing = Array.isArray(next.events) ? [...next.events] : [];
  const seq = existing.length + 1;
  const previousHash = String(next?.memory?.traceReplay?.lastHash || "GENESIS");
  const hashPayload = JSON.stringify({
    previousHash,
    seq,
    id: event.id,
    type: event.type,
    message: event.message,
    createdAt: event.createdAt,
    stepId: event.trace?.stepId || null,
    commandId: event.trace?.commandId || null,
    source: event.trace?.source || null,
  });
  const hash = createHash("sha256").update(hashPayload).digest("hex");
  const trace = {
    ...(event.trace || {}),
    seq,
    previousHash,
    hash,
  };
  event.trace = trace;
  existing.push({ ...event, trace });
  next.events = existing;

  if (next?.memory?.traceReplay) {
    const replay = { ...(next.memory.traceReplay || {}) };
    replay.lastSeq = seq;
    replay.lastEventType = event.type;
    replay.lastEventAt = event.createdAt;
    replay.lastHash = trace.hash;
    next.memory = {
      ...(next.memory || {}),
      traceReplay: replay,
    };
  }
  return next;
}

export async function controlLiveRun(
  ctx: LiveRunContext,
  sessionId: string,
  action: "pause" | "resume" | "approve" | "reject" | "takeover" | "stop",
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");

  const output = { ...((session.output || {}) as any) };
  const steps: LiveRunStep[] = Array.isArray(output.steps) ? output.steps : [];
  let state: SessionState = output.sessionState || "running";
  const currentStep = steps.find((s) => s.id === output.currentStepId);
  let event: LiveRunEvent = {
    id: crypto.randomUUID(),
    type: "error",
    message: "Unsupported action",
    createdAt: new Date().toISOString(),
  };

  if (action === "pause") {
    output.paused = true;
    state = "paused";
    event = {
      id: crypto.randomUUID(),
      type: "paused",
      message: "Owner paused live run",
      createdAt: new Date().toISOString(),
    };
  } else if (action === "resume") {
    output.paused = false;
    state = "running";
    event = {
      id: crypto.randomUUID(),
      type: "resumed",
      message: "Owner resumed live run",
      createdAt: new Date().toISOString(),
    };
  } else if (action === "takeover") {
    output.takeover = !Boolean(output.takeover);
    state = output.takeover ? "takeover" : "running";
    event = {
      id: crypto.randomUUID(),
      type: "takeover",
      message: output.takeover
        ? "Owner takeover enabled"
        : "Owner takeover released",
      createdAt: new Date().toISOString(),
    };
  } else if (action === "stop") {
    output.stopped = true;
    state = "stopped";
    event = {
      id: crypto.randomUUID(),
      type: "stopped",
      message: "Owner stopped live run",
      createdAt: new Date().toISOString(),
    };
  } else if (action === "approve" && currentStep) {
    if (currentStep.status === "awaiting_approval") {
      currentStep.status = "pending";
      state = "running";
      event = {
        id: crypto.randomUUID(),
        type: "approved",
        message: `Approved step: ${currentStep.title}`,
        createdAt: new Date().toISOString(),
      };
    }
  } else if (action === "reject" && currentStep) {
    if (currentStep.status === "awaiting_approval") {
      currentStep.status = "rejected";
      state = "failed";
      event = {
        id: crypto.randomUUID(),
        type: "rejected",
        message: `Rejected step: ${currentStep.title}`,
        createdAt: new Date().toISOString(),
      };
    }
  }

  output.steps = steps;
  output.sessionState = state;
  output.framePreview =
    action === "pause"
      ? "Session paused by owner"
      : action === "stop"
        ? "Session stopped"
        : output.framePreview;

  const mergedOutput = appendEvent(output, event);

  const status =
    state === "completed"
      ? AIJobStatus.COMPLETED
      : state === "failed" || state === "stopped"
        ? AIJobStatus.FAILED
        : AIJobStatus.RUNNING;

  await db.aIJob.update({
    where: { id: session.id },
    data: {
      output: mergedOutput,
      status,
      completedAt:
        status === AIJobStatus.COMPLETED || status === AIJobStatus.FAILED
          ? new Date()
          : undefined,
    },
  });

  await logRunEvent(ctx, session.id, event);
  return getLiveRun(ctx, session.id);
}

export async function tickLiveRun(ctx: LiveRunContext, sessionId: string) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");

  const output = { ...((session.output || {}) as any) };
  const steps: LiveRunStep[] = Array.isArray(output.steps) ? output.steps : [];
  const worker = {
    required: Boolean(output?.worker?.required),
    connected: Boolean(output?.worker?.connected),
    lastHeartbeatAt: output?.worker?.lastHeartbeatAt || null,
    tokenHash: output?.worker?.tokenHash || null,
    tokenExpiresAt: output?.worker?.tokenExpiresAt || null,
    commands: Array.isArray(output?.worker?.commands)
      ? ([...output.worker.commands] as WorkerCommand[])
      : ([] as WorkerCommand[]),
  };
  if (output.paused || output.stopped || output.takeover) return session;

  let state: SessionState = output.sessionState || "running";

  if (state === "planning") {
    state = "running";
    output.framePreview = "Plan ready. Starting browser execution.";
  }

  let currentStep = steps.find((s) => s.status === "running");
  if (!currentStep) {
    currentStep = steps.find((s) => s.status === "pending");
    if (!currentStep) {
      const evidenceReady = hasSufficientCompletionEvidence(output, steps);
      if (!evidenceReady) {
        output.sessionState = "running";
        output.framePreview =
          "Awaiting evidence verification before mission completion.";
        await db.aIJob.update({
          where: { id: session.id },
          data: {
            output,
            status: AIJobStatus.RUNNING,
            progress: Math.max(session.progress || 0, 85),
          },
        });
        return getLiveRun(ctx, session.id);
      }

      state = "completed";
      output.sessionState = state;
      output.framePreview = "Mission completed successfully.";
      const event: LiveRunEvent = {
        id: crypto.randomUUID(),
        type: "step_completed",
        message: "All planned steps completed",
        createdAt: new Date().toISOString(),
      };
      const merged = appendEvent(output, event);
      await db.aIJob.update({
        where: { id: session.id },
        data: {
          output: merged,
          progress: 100,
          status: AIJobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
      await logRunEvent(ctx, session.id, event);
      return getLiveRun(ctx, session.id);
    }

    if (currentStep.requiresApproval) {
      currentStep.status = "awaiting_approval";
      output.currentStepId = currentStep.id;
      output.sessionState = "awaiting_approval";
      output.steps = steps;
      output.framePreview = `Awaiting owner approval: ${currentStep.title}`;
      const event: LiveRunEvent = {
        id: crypto.randomUUID(),
        type: "approval_required",
        message: `Approval required for step: ${currentStep.title}`,
        createdAt: new Date().toISOString(),
        trace: { stepId: currentStep.id, source: "policy_or_risk" },
      };
      const merged = appendEvent(output, event);
      await db.aIJob.update({
        where: { id: session.id },
        data: {
          output: merged,
          progress: Math.max(10, session.progress || 10),
        },
      });
      await logRunEvent(ctx, session.id, event);
      return getLiveRun(ctx, session.id);
    }

    currentStep.status = "running";
    output.currentStepId = currentStep.id;
    const startEvent: LiveRunEvent = {
      id: crypto.randomUUID(),
      type: "step_started",
      message: `Step started: ${currentStep.title}`,
      createdAt: new Date().toISOString(),
      trace: { stepId: currentStep.id, source: "planner" },
    };
    output.framePreview = `Nexrel AI is executing: ${currentStep.title}`;
    output.steps = steps;
    output.sessionState = "running";
    let merged = appendEvent(output, startEvent);
    await db.aIJob.update({
      where: { id: session.id },
      data: { output: merged },
    });
    await logRunEvent(ctx, session.id, startEvent);

    if (worker.required) {
      const hasCommand = worker.commands.some(
        (c) =>
          c.stepId === currentStep!.id &&
          c.status !== "completed" &&
          c.status !== "failed",
      );
      if (!hasCommand) {
        const policy = getPolicy(
          output,
          (session.input || {}) as LiveRunPayload,
        );
        const policyCheck = assessPolicy(policy, {
          actionType: currentStep.actionType,
          target: currentStep.target,
          value: currentStep.value,
        });
        if (!policyCheck.allowed) {
          currentStep.status = "awaiting_approval";
          output.currentStepId = currentStep.id;
          output.sessionState = "awaiting_approval";
          output.framePreview = `Policy check required: ${policyCheck.reason}`;
          output.steps = steps;
          const policyEvent: LiveRunEvent = {
            id: crypto.randomUUID(),
            type: "approval_required",
            message: `Policy approval required: ${policyCheck.reason}`,
            createdAt: new Date().toISOString(),
            trace: { stepId: currentStep.id, source: "policy" },
          };
          const blocked = appendMemoryNote(appendEvent(output, policyEvent), {
            kind: "policy_gate",
            note: policyCheck.reason || "Policy requires approval",
            blocker: "policy",
          });
          await db.aIJob.update({
            where: { id: session.id },
            data: { output: blocked, status: AIJobStatus.RUNNING },
          });
          await logRunEvent(ctx, session.id, policyEvent);
          return getLiveRun(ctx, session.id);
        }

        const command: WorkerCommand = {
          commandId: crypto.randomUUID(),
          stepId: currentStep.id,
          actionType: currentStep.actionType,
          target: currentStep.target,
          value: currentStep.value,
          status: "queued",
          source: "ai_plan",
          attempt: 1,
          maxAttempts: retryBudgetFor(
            (output?.memory?.autonomyLevel as AutonomyLevel) ||
              resolveAutonomyLevel((session.input || {}) as LiveRunPayload),
            currentStep.actionType,
            (output?.memory?.workflowTier as any) || "tier_3",
            Number(output?.memory?.historical?.successRate || 0.8),
          ),
          meta: {
            ...(currentStep.meta || {}),
            executionRuntime:
              (output?.memory?.executionRuntime as ExecutionRuntime) ||
              resolveExecutionRuntime((session.input || {}) as LiveRunPayload),
            autonomyLevel:
              (output?.memory?.autonomyLevel as AutonomyLevel) ||
              resolveAutonomyLevel((session.input || {}) as LiveRunPayload),
            goal: String((session.input as any)?.goal || ""),
            objectiveContract:
              output?.memory?.objectiveContract ||
              buildObjectiveContract(
                (session.input || {}) as LiveRunPayload,
                Array.isArray(output?.memory?.successCriteria)
                  ? output.memory.successCriteria
                  : [],
              ),
            policy,
            retryBudget: retryBudgetFor(
              (output?.memory?.autonomyLevel as AutonomyLevel) ||
                resolveAutonomyLevel((session.input || {}) as LiveRunPayload),
              currentStep.actionType,
              (output?.memory?.workflowTier as any) || "tier_3",
              Number(output?.memory?.historical?.successRate || 0.8),
            ),
            historical: {
              successRate: Number(
                output?.memory?.historical?.successRate || 0.8,
              ),
              blockerFrequency:
                output?.memory?.historical?.blockerFrequency || {},
              strategyHints: Array.isArray(
                output?.memory?.historical?.strategyHints,
              )
                ? output.memory.historical.strategyHints
                : [],
            },
            successCriteria: Array.isArray(output?.memory?.successCriteria)
              ? output.memory.successCriteria
              : [],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        worker.commands.push(command);
        const commandEvent: LiveRunEvent = {
          id: crypto.randomUUID(),
          type: "command_enqueued",
          message: `Command queued for worker: ${currentStep.title}`,
          createdAt: new Date().toISOString(),
          trace: {
            stepId: currentStep.id,
            commandId: command.commandId,
            source: "ai_plan",
          },
        };
        merged = appendEvent({ ...merged, worker }, commandEvent);
        merged = appendMemoryNote(merged, {
          kind: "command_enqueued",
          note: `${currentStep.actionType} queued for worker`,
        });
        await db.aIJob.update({
          where: { id: session.id },
          data: { output: merged },
        });
        await logRunEvent(ctx, session.id, commandEvent);
      }
      return getLiveRun(ctx, session.id);
    }

    const actionEventType =
      currentStep.actionType === "navigate"
        ? "navigated"
        : currentStep.actionType === "type"
          ? "typed"
          : currentStep.actionType === "click"
            ? "clicked"
            : "step_started";
    const actionEvent: LiveRunEvent = {
      id: crypto.randomUUID(),
      type: actionEventType as LiveRunEvent["type"],
      message:
        `${currentStep.actionType.toUpperCase()} ${currentStep.target || currentStep.value || ""}`.trim(),
      createdAt: new Date().toISOString(),
      trace: { stepId: currentStep.id, source: "inline_executor" },
    };
    merged = appendEvent(merged, actionEvent);
    await db.aIJob.update({
      where: { id: session.id },
      data: { output: merged },
    });
    await logRunEvent(ctx, session.id, actionEvent);

    return getLiveRun(ctx, session.id);
  }

  if (!currentStep) {
    return getLiveRun(ctx, session.id);
  }
  const runningStep = currentStep;

  if (worker.required) {
    const related = worker.commands.filter((c) => c.stepId === runningStep.id);
    const pending = related.find(
      (c) => c.status === "queued" || c.status === "running",
    );
    if (pending) {
      output.framePreview = worker.connected
        ? `Waiting for worker to complete: ${runningStep.title}`
        : `Waiting for worker connection: ${runningStep.title}`;
      await db.aIJob.update({
        where: { id: session.id },
        data: {
          output: {
            ...output,
            worker,
          },
          status: AIJobStatus.RUNNING,
        },
      });
      return getLiveRun(ctx, session.id);
    }

    const last = related[related.length - 1];
    if (!last || last.status !== "completed") {
      output.framePreview = `Awaiting worker result for: ${runningStep.title}`;
      await db.aIJob.update({
        where: { id: session.id },
        data: {
          output: {
            ...output,
            worker,
          },
          status: AIJobStatus.RUNNING,
        },
      });
      return getLiveRun(ctx, session.id);
    }
  }

  runningStep.status = "completed";
  runningStep.result = "Executed successfully";
  output.steps = steps;
  output.currentStepId = null;
  output.sessionState = "running";
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const nextProgress = Math.min(
    95,
    Math.round((completedSteps / Math.max(steps.length, 1)) * 100),
  );
  output.framePreview = `Completed step: ${runningStep.title}`;
  const completeEvent: LiveRunEvent = {
    id: crypto.randomUUID(),
    type: "step_completed",
    message: `Step completed: ${runningStep.title}`,
    createdAt: new Date().toISOString(),
    trace: { stepId: runningStep.id, source: "executor" },
  };
  let merged = appendEvent(output, completeEvent);
  merged = appendMemoryNote(merged, {
    kind: "step_completed",
    note: runningStep.title,
  });

  await db.aIJob.update({
    where: { id: session.id },
    data: {
      output: merged,
      progress: nextProgress,
      status: AIJobStatus.RUNNING,
    },
  });
  await logRunEvent(ctx, session.id, completeEvent);

  return getLiveRun(ctx, session.id);
}

export async function mintWorkerToken(ctx: LiveRunContext, sessionId: string) {
  return issueWorkerTokenForSession({
    ctx,
    sessionId,
    forceRequired: true,
  });
}

export async function mintWorkerTokenWithBaseUrl(
  ctx: LiveRunContext,
  sessionId: string,
  baseUrl?: string | null,
) {
  return issueWorkerTokenForSession({
    ctx,
    sessionId,
    forceRequired: true,
    baseUrl,
  });
}

function assertWorkerToken(session: any, token: string) {
  const output = (session.output || {}) as any;
  const hash = output?.worker?.tokenHash;
  const expiresAt = output?.worker?.tokenExpiresAt;
  if (!hash || !expiresAt) throw new Error("Worker token not initialized");
  if (new Date(expiresAt).getTime() < Date.now())
    throw new Error("Worker token expired");
  if (sha256(token) !== hash) throw new Error("Invalid worker token");
}

export async function workerHeartbeat(
  ctx: LiveRunContext,
  sessionId: string,
  token: string,
  payload: {
    framePreview?: string;
    frameImageDataUrl?: string;
    capabilities?: string[];
    status?: string;
  },
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");
  assertWorkerToken(session, token);

  const output = { ...((session.output || {}) as any) };
  output.worker = {
    ...(output.worker || {}),
    required: true,
    connected: true,
    lastHeartbeatAt: new Date().toISOString(),
    commands: Array.isArray(output?.worker?.commands)
      ? output.worker.commands
      : [],
    capabilities: Array.isArray(payload.capabilities)
      ? payload.capabilities
      : output?.worker?.capabilities || [],
    status: payload.status || output?.worker?.status || "online",
    liveBoost: Boolean(output?.worker?.liveBoost),
    frameImageDataUrl:
      typeof payload.frameImageDataUrl === "string"
        ? payload.frameImageDataUrl
        : output?.worker?.frameImageDataUrl || null,
  };
  if (payload.framePreview) output.framePreview = payload.framePreview;

  await db.aIJob.update({ where: { id: session.id }, data: { output } });
  return getLiveRun(ctx, session.id);
}

export async function workerPullCommands(
  ctx: LiveRunContext,
  sessionId: string,
  token: string,
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");
  assertWorkerToken(session, token);

  const output = { ...((session.output || {}) as any) };
  const commands: WorkerCommand[] = Array.isArray(output?.worker?.commands)
    ? [...output.worker.commands]
    : [];

  const next = commands.find((c) => c.status === "queued");
  if (!next) {
    return { commands: [] as WorkerCommand[] };
  }

  next.status = "running";
  next.updatedAt = new Date().toISOString();
  output.worker = { ...(output.worker || {}), commands };
  await db.aIJob.update({ where: { id: session.id }, data: { output } });
  return { commands: [next] };
}

export async function workerAckCommand(
  ctx: LiveRunContext,
  sessionId: string,
  token: string,
  payload: {
    commandId: string;
    status: "completed" | "failed";
    detail?: string;
  },
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");
  assertWorkerToken(session, token);

  const output = { ...((session.output || {}) as any) };
  const steps: LiveRunStep[] = Array.isArray(output.steps)
    ? [...output.steps]
    : [];
  const commands: WorkerCommand[] = Array.isArray(output?.worker?.commands)
    ? [...output.worker.commands]
    : [];

  const command = commands.find((c) => c.commandId === payload.commandId);
  if (!command) throw new Error("Command not found");
  const evidence = parseCommandEvidence(payload.detail || "");
  const runtime = String(output?.memory?.executionRuntime || "openclaw");
  command.status = payload.status;
  command.detail = payload.detail;
  command.updatedAt = new Date().toISOString();
  const failureType =
    payload.status === "failed"
      ? String(evidence?.blockerClass || "").trim() ||
        classifyBlocker(payload.detail || "")
      : null;

  const step = steps.find((s) => s.id === command.stepId);
  if (step) {
    if (payload.status === "completed") {
      if (runtime === "openclaw" && !evidence) {
        step.status = "failed";
        step.result = "Missing structured execution evidence";
        output.currentStepId = step.id;
        output.sessionState = "failed";
      } else {
        step.status = "completed";
        step.result = payload.detail || "Worker completed step";
        output.currentStepId = null;
        output.sessionState = "running";
        Object.assign(
          output,
          appendMemoryNote(output, {
            kind: "command_completed",
            note: `${command.actionType} completed`,
          }),
        );
      }
    } else {
      if (failureType && shouldEscalateToHuman(failureType as any)) {
        step.status = "awaiting_approval";
        step.result = payload.detail || "Human verification required";
        output.currentStepId = step.id;
        output.sessionState = "awaiting_approval";
        const humanEvent: LiveRunEvent = {
          id: crypto.randomUUID(),
          type: "approval_required",
          message:
            "Human intervention required for blocker. Please resolve on desktop and approve resume.",
          createdAt: new Date().toISOString(),
        };
        const mergedHuman = appendEvent(output, humanEvent);
        const mergedMemory = appendMemoryNote(mergedHuman, {
          kind: "human_intervention",
          note: "Paused for human-required blocker",
          blocker: failureType,
          detail: payload.detail,
        });
        await db.aIJob.update({
          where: { id: session.id },
          data: {
            output: mergedMemory,
            status: AIJobStatus.RUNNING,
          },
        });
        await logRunEvent(ctx, session.id, humanEvent);
        return getLiveRun(ctx, session.id);
      }

      const attempt = Number(command.attempt || 1);
      const maxAttempts = Number(command.maxAttempts || 2);
      if (
        String(command.source || "ai_plan") === "ai_plan" &&
        attempt < maxAttempts
      ) {
        const fallbackMeta = { ...(command.meta || {}) };
        let fallbackActionType = command.actionType;
        let fallbackTarget = command.target;
        if (failureType === "invalid_url") {
          fallbackActionType = "navigate";
          fallbackTarget = `https://www.google.com/search?q=${encodeURIComponent(String(command.target || command.value || ""))}`;
          fallbackMeta.replanned = true;
        }
        if (failureType === "missing_app") {
          fallbackActionType = "open_app";
          fallbackTarget = "Google Chrome";
          fallbackMeta.replanned = true;
        }
        const retry: WorkerCommand = {
          ...command,
          commandId: crypto.randomUUID(),
          actionType: fallbackActionType,
          target: fallbackTarget,
          status: "queued",
          detail: `Retry ${attempt + 1}/${maxAttempts} after: ${payload.detail || "worker failure"}`,
          attempt: attempt + 1,
          maxAttempts,
          meta: {
            ...fallbackMeta,
            retryBudget: maxAttempts,
            priorFailureType: failureType || "unknown",
            strategyHints: Array.isArray(
              output?.memory?.historical?.strategyHints,
            )
              ? output.memory.historical.strategyHints
              : [],
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        commands.push(retry);
        step.status = "running";
        step.result = payload.detail || "Retrying after worker failure";
        output.currentStepId = step.id;
        output.sessionState = "running";
        Object.assign(
          output,
          appendMemoryNote(output, {
            kind: "replan",
            note: `Replanned ${command.actionType} after ${failureType || "failure"}`,
            blocker: failureType || "unknown",
            detail: payload.detail,
          }),
        );
      } else {
        step.status = "failed";
        step.result = payload.detail || "Worker failed step";
        output.sessionState = "failed";
        Object.assign(
          output,
          appendMemoryNote(output, {
            kind: "command_failed",
            note: `${command.actionType} failed permanently`,
            blocker: failureType || "unknown",
            detail: payload.detail,
          }),
        );
      }
    }
  }

  const event: LiveRunEvent = {
    id: crypto.randomUUID(),
    type: "command_completed",
    message:
      payload.status === "completed"
        ? `Worker completed command ${payload.commandId}`
        : `Worker failed command ${payload.commandId}`,
    createdAt: new Date().toISOString(),
    trace: {
      stepId: command.stepId,
      commandId: payload.commandId,
      source: "worker_ack",
    },
  };

  output.steps = steps;
  output.worker = { ...(output.worker || {}), commands };
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const nextProgress = Math.min(
    payload.status === "completed" ? 95 : 100,
    Math.round((completedSteps / Math.max(steps.length, 1)) * 100),
  );

  const merged = appendEvent(output, event);
  await db.aIJob.update({
    where: { id: session.id },
    data: {
      output: merged,
      progress: nextProgress,
      status:
        output.sessionState === "failed"
          ? AIJobStatus.FAILED
          : AIJobStatus.RUNNING,
      completedAt: output.sessionState === "failed" ? new Date() : undefined,
    },
  });
  await logRunEvent(ctx, session.id, event);
  return getLiveRun(ctx, session.id);
}

export async function enqueueWorkerCommand(
  ctx: LiveRunContext,
  sessionId: string,
  input: {
    actionType: WorkerCommand["actionType"];
    target?: string;
    value?: string;
    meta?: Record<string, any>;
    source?: "owner_remote";
  },
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");

  const output = { ...((session.output || {}) as any) };
  const policy = getPolicy(output, (session.input || {}) as LiveRunPayload);
  const policyCheck = assessPolicy(policy, {
    actionType: input.actionType,
    target: input.target,
    value: input.value,
  });
  if (!policyCheck.allowed) {
    throw new Error(policyCheck.reason || "Command blocked by policy");
  }
  const commands: WorkerCommand[] = Array.isArray(output?.worker?.commands)
    ? [...output.worker.commands]
    : [];

  const now = new Date().toISOString();
  const command: WorkerCommand = {
    commandId: crypto.randomUUID(),
    stepId: `owner_remote:${crypto.randomUUID()}`,
    actionType: input.actionType,
    target: input.target,
    value: input.value,
    status: "queued",
    source: input.source || "owner_remote",
    meta: {
      ...(input.meta || {}),
      policy,
      executionRuntime:
        (output?.memory?.executionRuntime as ExecutionRuntime) || "openclaw",
      objectiveContract: output?.memory?.objectiveContract || undefined,
      retryBudget: 1,
    },
    attempt: 1,
    maxAttempts: 1,
    createdAt: now,
    updatedAt: now,
  };
  commands.push(command);

  output.worker = {
    ...(output.worker || {}),
    required: true,
    commands,
  };

  const event: LiveRunEvent = {
    id: crypto.randomUUID(),
    type: "command_enqueued",
    message: `Owner queued ${command.actionType} command`,
    createdAt: now,
    trace: {
      stepId: command.stepId,
      commandId: command.commandId,
      source: "owner_remote",
    },
  };

  const merged = appendEvent(output, event);
  await db.aIJob.update({
    where: { id: session.id },
    data: { output: merged },
  });
  await logRunEvent(ctx, session.id, event);
  return { commandId: command.commandId };
}

export async function setWorkerLiveBoost(
  ctx: LiveRunContext,
  sessionId: string,
  enabled: boolean,
) {
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");

  const output = { ...((session.output || {}) as any) };
  output.worker = {
    ...(output.worker || {}),
    required: true,
    liveBoost: Boolean(enabled),
  };

  await db.aIJob.update({ where: { id: session.id }, data: { output } });
  return { liveBoost: Boolean(enabled) };
}

export async function listLiveRunDevices(ctx: LiveRunContext) {
  const db = getCrmDb(ctx);
  const logs = await db.auditLog.findMany({
    where: {
      userId: ctx.userId,
      entityType: "NEXREL_AI_AGENT_DEVICE",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const map = new Map<string, any>();
  for (const log of logs) {
    const meta = (log.metadata || {}) as any;
    const id = String(meta?.deviceId || "");
    if (!id) continue;
    if (!map.has(id)) {
      map.set(id, {
        deviceId: id,
        label: meta?.label || id,
        os: meta?.os || "unknown",
        capabilities: meta?.capabilities || [],
        allowedDomains: meta?.allowedDomains || [],
        status: meta?.status || "offline",
        lastSeenAt: meta?.lastSeenAt || log.createdAt.toISOString(),
      });
    }
  }
  return Array.from(map.values());
}

export async function registerLiveRunDevice(
  ctx: LiveRunContext,
  payload: {
    deviceId: string;
    label: string;
    os: string;
    capabilities?: string[];
    allowedDomains?: string[];
    status?: string;
  },
) {
  const db = getCrmDb(ctx);
  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_AGENT_DEVICE",
      entityId: payload.deviceId,
      metadata: {
        ...payload,
        status: payload.status || "online",
        lastSeenAt: new Date().toISOString(),
      },
      success: true,
    },
  });
}
