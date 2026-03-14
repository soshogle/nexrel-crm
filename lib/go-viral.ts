import { getCrmDb } from "@/lib/dal";

type GoViralContext = {
  userId: string;
  industry: any;
};

export type GoViralModel = "nanobanana" | "gemini_pro";
export type GoViralKind = "image" | "video";

type GenerateInput = {
  objective: string;
  product: string;
  audience: string;
  model: GoViralModel;
  kind: GoViralKind;
  tone?: string;
};

const GO_VIRAL_JOB_TYPES = [
  "go_viral_asset",
  "go_viral_video",
  "go_viral_strategy",
] as const;

async function ensureViralEmployee(ctx: GoViralContext) {
  const db = getCrmDb(ctx);
  let employee = await db.aIEmployee.findFirst({
    where: {
      userId: ctx.userId,
      type: "COMMUNICATION_SPECIALIST",
      isActive: true,
    },
    select: { id: true },
  });

  if (!employee) {
    employee = await db.aIEmployee.create({
      data: {
        userId: ctx.userId,
        name: "Nexrel AI Viral Director",
        type: "COMMUNICATION_SPECIALIST",
        description:
          "Runs Go Viral mandate with performance-based creative iteration.",
        capabilities: {
          goViral: true,
          creativeGeneration: true,
          sentimentLearning: true,
        },
        isActive: true,
      },
      select: { id: true },
    });
  }

  return employee;
}

function buildPrompt(input: GenerateInput, insights: any) {
  const tone = input.tone || "assertive, useful, and story-driven";
  return `Create a ${input.kind} concept designed to go viral for ${input.product}. Objective: ${input.objective}. Audience: ${input.audience}. Tone: ${tone}. Winning hook patterns to reuse: ${insights.topHooks.join(", ") || "problem-solution, pattern interrupt, proof"}. Include a clear CTA that drives qualified leads.`;
}

function computeHook(input: GenerateInput, insights: any) {
  const hooks = insights.topHooks.length
    ? insights.topHooks
    : [
        "The mistake costing most businesses leads",
        "What changed this week in buyer behavior",
        "The before/after nobody talks about",
      ];
  return hooks[0];
}

function computeCaption(input: GenerateInput, hook: string) {
  return `${hook}\n\nIf you're selling ${input.product}, this is the playbook to convert attention into pipeline. Comment \"VIRAL\" and we'll send the framework.`;
}

async function externalGenerate(
  ctx: GoViralContext,
  model: GoViralModel,
  kind: GoViralKind,
  prompt: string,
): Promise<{ url: string; providerStatus: string }> {
  const db = getCrmDb(ctx);

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [recentCalls, recentFailures] = await Promise.all([
    db.auditLog.count({
      where: {
        userId: ctx.userId,
        entityType: "GO_VIRAL_PROVIDER_CALL",
        createdAt: { gte: oneMinuteAgo },
      },
    }),
    db.auditLog.count({
      where: {
        userId: ctx.userId,
        entityType: "GO_VIRAL_PROVIDER_FAILURE",
        createdAt: { gte: fiveMinutesAgo },
      },
    }),
  ]);

  if (recentCalls >= 20) {
    throw new Error("Go Viral rate limit reached. Retry in a minute.");
  }

  if (recentFailures >= 10) {
    throw new Error(
      "Go Viral provider circuit open due to repeated failures. Retry shortly.",
    );
  }

  const endpoint =
    model === "nanobanana"
      ? process.env.NANOBANANA_GENERATE_URL
      : process.env.GEMINI_PRO_GENERATE_URL;

  if (!endpoint) {
    throw new Error(
      model === "nanobanana"
        ? "Missing NANOBANANA_GENERATE_URL for live generation"
        : "Missing GEMINI_PRO_GENERATE_URL for live generation",
    );
  }

  const apiKey =
    model === "nanobanana"
      ? process.env.NANOBANANA_API_KEY
      : process.env.GEMINI_PRO_API_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const maxAttempts = 3;
  let lastError = "Unknown provider error";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, kind }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const error =
          data?.error || `Provider request failed with status ${res.status}`;
        lastError = error;
        if (res.status < 500 && res.status !== 429) break;
      } else {
        const url = typeof data?.url === "string" ? data.url : "";
        if (!url) {
          lastError = "Provider response missing asset URL";
        } else {
          await db.auditLog.create({
            data: {
              userId: ctx.userId,
              action: "SETTINGS_MODIFIED",
              severity: "LOW",
              entityType: "GO_VIRAL_PROVIDER_CALL",
              entityId: crypto.randomUUID(),
              metadata: {
                model,
                kind,
                attempt,
                providerStatus: "live",
                endpoint,
              },
              success: true,
            },
          });
          return { url, providerStatus: "live" };
        }
      }
    } catch (error: any) {
      clearTimeout(timeout);
      lastError =
        error?.name === "AbortError"
          ? "Provider timeout"
          : String(error?.message || error);
    }

    if (attempt < maxAttempts) {
      const backoff =
        400 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "MEDIUM",
      entityType: "GO_VIRAL_PROVIDER_FAILURE",
      entityId: crypto.randomUUID(),
      metadata: {
        model,
        kind,
        endpoint,
        error: lastError,
      },
      success: false,
      errorMessage: lastError,
    },
  });

  throw new Error(lastError);
}

export async function buildGoViralInsights(ctx: GoViralContext) {
  const db = getCrmDb(ctx);
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [recentLeads, jobs] = await Promise.all([
    db.lead.count({
      where: { userId: ctx.userId, createdAt: { gte: since30 } },
    }),
    db.aIJob.findMany({
      where: {
        userId: ctx.userId,
        jobType: { in: [...GO_VIRAL_JOB_TYPES] as any },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { output: true },
    }),
  ]);

  const hooks = new Map<string, number>();
  let approved = 0;
  let total = 0;
  let leadsFromContent = 0;

  for (const job of jobs) {
    const output = (job.output || {}) as any;
    const asset = output?.asset || {};
    const hook = String(asset?.hook || "").trim();
    const status = String(asset?.status || "").toLowerCase();
    const perfLeads = Number(asset?.performance?.leads || 0);
    if (hook) hooks.set(hook, (hooks.get(hook) || 0) + 1);
    if (status) total += 1;
    if (status === "approved") approved += 1;
    if (Number.isFinite(perfLeads)) leadsFromContent += perfLeads;
  }

  const topHooks = Array.from(hooks.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hook]) => hook);

  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
  const sentiment =
    approvalRate >= 70
      ? "positive"
      : approvalRate >= 40
        ? "mixed"
        : "uncertain";

  return {
    topHooks,
    approvalRate,
    recentLeads,
    leadsFromContent,
    sentiment,
  };
}

export async function generateGoViralAsset(
  ctx: GoViralContext,
  input: GenerateInput,
) {
  const db = getCrmDb(ctx);
  const employee = await ensureViralEmployee(ctx);
  const insights = await buildGoViralInsights(ctx);

  const prompt = buildPrompt(input, insights);
  const hook = computeHook(input, insights);
  const caption = computeCaption(input, hook);
  const external = await externalGenerate(ctx, input.model, input.kind, prompt);

  const created = await db.aIJob.create({
    data: {
      userId: ctx.userId,
      employeeId: employee.id,
      jobType: input.kind === "video" ? "go_viral_video" : "go_viral_asset",
      priority: "MEDIUM",
      status: "COMPLETED",
      progress: 100,
      input: {
        ...input,
        prompt,
        createdBy: "nexrel_ai_go_viral",
      },
      output: {
        asset: {
          id: crypto.randomUUID(),
          kind: input.kind,
          model: input.model,
          prompt,
          hook,
          caption,
          status: "draft",
          providerStatus: external.providerStatus,
          url: external.url,
          approvedAt: null,
          approvedBy: null,
          performance: null,
        },
      },
      completedAt: new Date(),
    },
    select: {
      id: true,
      createdAt: true,
      output: true,
      jobType: true,
      status: true,
    },
  });

  await db.auditLog.create({
    data: {
      userId: ctx.userId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType: "NEXREL_AI_OPERATION",
      entityId: created.id,
      metadata: {
        mode: "go_viral_mandate",
        model: input.model,
        kind: input.kind,
        objective: input.objective,
        providerStatus: external.providerStatus,
      },
      success: true,
    },
  });

  return created;
}

export async function listGoViralAssets(ctx: GoViralContext) {
  const db = getCrmDb(ctx);
  const insights = await buildGoViralInsights(ctx);
  const jobs = await db.aIJob.findMany({
    where: {
      userId: ctx.userId,
      jobType: { in: ["go_viral_asset", "go_viral_video"] as any },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: {
      id: true,
      jobType: true,
      status: true,
      createdAt: true,
      output: true,
      input: true,
    },
  });

  const assets = jobs.map((job) => ({
    jobId: job.id,
    createdAt: job.createdAt,
    status: job.status,
    jobType: job.jobType,
    input: job.input,
    asset: (job.output as any)?.asset || null,
  }));

  return { assets, insights };
}

export async function setGoViralAssetDecision(
  ctx: GoViralContext,
  jobId: string,
  decision: "approve" | "reject",
  actorUserId: string,
) {
  const db = getCrmDb(ctx);
  const job = await db.aIJob.findFirst({
    where: { id: jobId, userId: ctx.userId },
    select: { id: true, output: true },
  });
  if (!job) throw new Error("Asset job not found");

  const output = { ...((job.output || {}) as any) };
  const asset = { ...(output.asset || {}) };
  asset.status = decision === "approve" ? "approved" : "rejected";
  asset.approvedAt = new Date().toISOString();
  asset.approvedBy = actorUserId;
  output.asset = asset;

  await db.aIJob.update({
    where: { id: job.id },
    data: {
      output,
    },
  });

  await db.auditLog.create({
    data: {
      userId: actorUserId,
      action: "SETTINGS_MODIFIED",
      severity: "LOW",
      entityType:
        decision === "approve"
          ? "NEXREL_AI_BRAIN_OPERATOR_APPROVAL"
          : "NEXREL_AI_BRAIN_OPERATOR_REJECTION",
      entityId: job.id,
      metadata: {
        goViral: true,
        decision,
      },
      success: true,
    },
  });

  return { success: true, jobId, decision };
}

export async function recordGoViralPerformance(
  ctx: GoViralContext,
  jobId: string,
  metrics: { views?: number; engagementRate?: number; leads?: number },
) {
  const db = getCrmDb(ctx);
  const job = await db.aIJob.findFirst({
    where: { id: jobId, userId: ctx.userId },
    select: { id: true, output: true },
  });
  if (!job) throw new Error("Asset job not found");

  const output = { ...((job.output || {}) as any) };
  const asset = { ...(output.asset || {}) };
  asset.performance = {
    views: Number(metrics.views || 0),
    engagementRate: Number(metrics.engagementRate || 0),
    leads: Number(metrics.leads || 0),
    updatedAt: new Date().toISOString(),
  };
  output.asset = asset;

  await db.aIJob.update({ where: { id: job.id }, data: { output } });
  return { success: true, jobId };
}

export async function regenerateGoViralAsset(
  ctx: GoViralContext,
  jobId: string,
  model: GoViralModel,
) {
  const db = getCrmDb(ctx);
  const previous = await db.aIJob.findFirst({
    where: { id: jobId, userId: ctx.userId },
    select: { input: true },
  });
  if (!previous) throw new Error("Asset job not found");
  const prior = (previous.input || {}) as any;

  return generateGoViralAsset(ctx, {
    objective: String(prior.objective || "Increase qualified lead volume"),
    product: String(prior.product || "core offer"),
    audience: String(prior.audience || "high-intent buyers"),
    kind: (prior.kind === "video" ? "video" : "image") as GoViralKind,
    model,
    tone: String(prior.tone || "bold and practical") + " with a fresh variant",
  });
}
