import { AIJobStatus, AIEmployeeType } from "@prisma/client";
import { getCrmDb } from "@/lib/dal";
import { createHash, randomBytes } from "crypto";

type LiveRunContext = {
  userId: string;
  industry: any;
};

type ExecutionTarget = "cloud_browser" | "owner_desktop";
type TrustMode = "crawl" | "walk" | "run";
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
  actionType: "navigate" | "click" | "type" | "extract" | "verify";
  riskTier: "LOW" | "MEDIUM" | "HIGH";
  requiresApproval: boolean;
  target?: string;
  value?: string;
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
};

type WorkerCommand = {
  commandId: string;
  stepId: string;
  actionType: "navigate" | "click" | "type" | "extract" | "verify";
  target?: string;
  value?: string;
  status: "queued" | "running" | "completed" | "failed";
  detail?: string;
  createdAt: string;
  updatedAt: string;
};

type LiveRunPayload = {
  goal: string;
  targetApps: string[];
  trustMode: TrustMode;
  executionTarget: ExecutionTarget;
  deviceId?: string | null;
  employeeType?: string;
  employeeName?: string;
};

function createDefaultPlan(payload: LiveRunPayload): LiveRunStep[] {
  const apps =
    payload.targetApps.length > 0
      ? payload.targetApps.join(", ")
      : "assigned apps";
  return [
    {
      id: crypto.randomUUID(),
      title: `Open ${apps} and verify account state`,
      actionType: "navigate",
      riskTier: "LOW",
      requiresApproval: false,
      target: apps,
      status: "pending",
    },
    {
      id: crypto.randomUUID(),
      title: "Collect current performance context",
      actionType: "extract",
      riskTier: "LOW",
      requiresApproval: false,
      status: "pending",
    },
    {
      id: crypto.randomUUID(),
      title: "Prepare optimized CTA and creative direction",
      actionType: "type",
      riskTier: "MEDIUM",
      requiresApproval: payload.trustMode !== "run",
      status: "pending",
      value: "Create high-intent CTA variant",
    },
    {
      id: crypto.randomUUID(),
      title: "Apply campaign/post updates",
      actionType: "click",
      riskTier: "HIGH",
      requiresApproval: true,
      status: "pending",
      target: "Publish/Save action",
    },
    {
      id: crypto.randomUUID(),
      title: "Verify final state and log evidence",
      actionType: "verify",
      riskTier: "LOW",
      requiresApproval: false,
      status: "pending",
    },
  ];
}

function getInitialOutput(payload: LiveRunPayload) {
  const steps = createDefaultPlan(payload);
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
      lastHeartbeatAt: null as string | null,
      tokenHash: null as string | null,
      tokenExpiresAt: null as string | null,
      commands: [] as WorkerCommand[],
    },
    framePreview: "Planner initialized. OpenClaw building execution plan.",
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

  const byId = await db.aIEmployee.findFirst({
    where: { id, userId: ctx.userId },
    select: { id: true, name: true, type: true },
  });
  if (byId) return byId;

  const byType = payload.employeeType
    ? await db.aIEmployee.findFirst({
        where: {
          userId: ctx.userId,
          type: payload.employeeType as AIEmployeeType,
          isActive: true,
        },
        select: { id: true, name: true, type: true },
      })
    : null;
  if (byType) return byType;

  return db.aIEmployee.create({
    data: {
      userId: ctx.userId,
      type: AIEmployeeType.COMMUNICATION_SPECIALIST,
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
  const employee = await resolveEmployee(ctx, employeeRef, payload);
  const output = getInitialOutput(payload);

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
        ...payload,
        employeeRef,
        missionType: "openclaw_live_run",
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
  next.events = Array.isArray(next.events) ? [...next.events, event] : [event];
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
    };
    output.framePreview = `OpenClaw is executing: ${currentStep.title}`;
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
        const command: WorkerCommand = {
          commandId: crypto.randomUUID(),
          stepId: currentStep.id,
          actionType: currentStep.actionType,
          target: currentStep.target,
          value: currentStep.value,
          status: "queued",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        worker.commands.push(command);
        const commandEvent: LiveRunEvent = {
          id: crypto.randomUUID(),
          type: "command_enqueued",
          message: `Command queued for worker: ${currentStep.title}`,
          createdAt: new Date().toISOString(),
        };
        merged = appendEvent({ ...merged, worker }, commandEvent);
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
    };
    merged = appendEvent(merged, actionEvent);
    await db.aIJob.update({
      where: { id: session.id },
      data: { output: merged },
    });
    await logRunEvent(ctx, session.id, actionEvent);

    return getLiveRun(ctx, session.id);
  }

  currentStep.status = "completed";
  currentStep.result = "Executed successfully";
  output.steps = steps;
  output.currentStepId = null;
  output.sessionState = "running";
  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const nextProgress = Math.min(
    95,
    Math.round((completedSteps / Math.max(steps.length, 1)) * 100),
  );
  output.framePreview = `Completed step: ${currentStep.title}`;
  const completeEvent: LiveRunEvent = {
    id: crypto.randomUUID(),
    type: "step_completed",
    message: `Step completed: ${currentStep.title}`,
    createdAt: new Date().toISOString(),
  };
  const merged = appendEvent(output, completeEvent);

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
  const db = getCrmDb(ctx);
  const session = await getLiveRun(ctx, sessionId);
  if (!session) throw new Error("Live run session not found");

  const token = randomBytes(24).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const output = { ...((session.output || {}) as any) };
  output.worker = {
    ...(output.worker || {}),
    required: true,
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
  payload: { framePreview?: string; capabilities?: string[]; status?: string },
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
  command.status = payload.status;
  command.detail = payload.detail;
  command.updatedAt = new Date().toISOString();

  const step = steps.find((s) => s.id === command.stepId);
  if (step) {
    if (payload.status === "completed") {
      step.status = "completed";
      step.result = payload.detail || "Worker completed step";
      output.currentStepId = null;
      output.sessionState = "running";
    } else {
      step.status = "failed";
      step.result = payload.detail || "Worker failed step";
      output.sessionState = "failed";
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
