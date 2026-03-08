/**
 * Auto-provision AI Employees when industry is set
 * Fire-and-forget: runs in background, never blocks the caller.
 * Triggered by: set-industry, onboarding completion, profile industry change
 */

import { getCrmDb } from "@/lib/dal";
import { createDalContext } from "@/lib/context/industry-context";
import {
  Industry,
  ProfessionalAIEmployeeType,
  REAIEmployeeType,
} from "@prisma/client";
import { RE_AI_EMPLOYEE_PROMPTS } from "@/lib/real-estate/ai-employee-prompts";
import { getIndustryAIEmployeeModule } from "@/lib/industry-ai-employees/registry";
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from "@/lib/professional-ai-employees/config";
import { PROFESSIONAL_EMPLOYEE_PROMPTS } from "@/lib/professional-ai-employees/prompts";
import { attachToolsToElevenLabsAgent } from "@/lib/ai-employee-tools";
const db = getCrmDb({ userId: "", industry: null });

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

function getREApiKey(): string | null {
  return (
    process.env.ELEVENLABS_RE_API_KEY || process.env.ELEVENLABS_API_KEY || null
  );
}

function getIndustryApiKey(): string | null {
  return (
    process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY || null
  );
}

/**
 * Create ElevenLabs agent - same structure as CRM Voice Assistant (no llm field).
 * CRM works because it omits llm; ElevenLabs uses a valid default for English.
 */
async function createElevenLabsAgent(
  apiKey: string,
  config: {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId?: string;
  },
): Promise<string> {
  const { getConfidentialityGuard } = await import(
    "@/lib/ai-confidentiality-guard"
  );
  const { EASTERN_TIME_SYSTEM_INSTRUCTION } = await import(
    "@/lib/voice-time-context"
  );
  const fullPrompt =
    config.systemPrompt +
    EASTERN_TIME_SYSTEM_INSTRUCTION +
    getConfidentialityGuard();
  const payload = {
    name: config.name,
    conversation_config: {
      agent: {
        prompt: { prompt: fullPrompt },
        first_message: config.firstMessage,
        language: "en", // API only accepts ISO codes. Multilingual via prompt + eleven_multilingual_v2 TTS.
      },
      asr: { quality: "high", provider: "elevenlabs" },
      tts: {
        voice_id: config.voiceId || "EXAVITQu4vr4xnSDxMaL",
        model_id: "eleven_multilingual_v2", // Best accent quality (matches landing page)
      },
      turn: { mode: "turn", turn_timeout: 30 }, // CRITICAL: unset defaults to 7s — causes premature disconnect
      conversation: { max_duration_seconds: 1800, turn_timeout_seconds: 30 },
    },
    platform_settings: {
      auth: { enable_auth: false },
      allowed_overrides: { agent: ["prompt", "language"] },
    },
  };
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(errText) as Record<string, unknown>;
    } catch {
      /* ignore */
    }
    const detail = parsed.detail ?? parsed.message ?? parsed.error ?? errText;
    const detailStr =
      typeof detail === "string" ? detail : JSON.stringify(detail);
    throw new Error(
      `ElevenLabs create failed (${response.status}): ${detailStr}`,
    );
  }

  const data = await response.json();
  return data.agent_id;
}

async function provisionREAgents(
  userId: string,
): Promise<{ success: number; failed: number; firstError?: string }> {
  const apiKey = getREApiKey();
  if (!apiKey) {
    console.warn(
      "[AutoProvision] RE API key not configured, skipping RE agents",
    );
    return { success: 0, failed: 0 };
  }

  const existing = await db.rEAIEmployeeAgent.findMany({
    where: { userId },
    select: { employeeType: true },
  });
  const existingTypes = new Set(existing.map((a) => a.employeeType));
  const typesToCreate = (
    Object.values(REAIEmployeeType) as REAIEmployeeType[]
  ).filter((t) => !existingTypes.has(t));

  if (typesToCreate.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;
  let firstError: string | undefined;

  for (const employeeType of typesToCreate) {
    try {
      const promptConfig = RE_AI_EMPLOYEE_PROMPTS[employeeType];
      if (!promptConfig) continue;

      const agentId = await createElevenLabsAgent(apiKey, {
        name: `RE - ${promptConfig.name}`,
        systemPrompt: promptConfig.systemPrompt,
        firstMessage: promptConfig.firstMessage,
        voiceId: promptConfig.voiceId,
      });

      const record = await db.rEAIEmployeeAgent.upsert({
        where: { userId_employeeType: { userId, employeeType } },
        create: {
          userId,
          employeeType,
          name: promptConfig.name,
          elevenLabsAgentId: agentId,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
        },
        update: {
          elevenLabsAgentId: agentId,
          name: promptConfig.name,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
          updatedAt: new Date(),
        },
      });

      await attachToolsToElevenLabsAgent(apiKey, agentId, record.id, {
        source: "real_estate",
        employeeType,
      }).catch((err) =>
        console.warn(
          `[AutoProvision] RE ${employeeType} tools attach failed:`,
          err.message,
        ),
      );
      success++;
      console.log(`[AutoProvision] RE ${employeeType} provisioned`);
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      if (!firstError) firstError = msg;
      console.error(`[AutoProvision] RE ${employeeType} failed:`, msg);
    }
    await new Promise((r) => setTimeout(r, 1500)); // Longer delay to avoid ElevenLabs rate limits
  }

  return { success, failed, firstError };
}

async function provisionIndustryAgents(
  userId: string,
  industry: Industry,
): Promise<{ success: number; failed: number }> {
  const module = getIndustryAIEmployeeModule(industry);
  if (!module) return { success: 0, failed: 0 };

  const apiKey = getIndustryApiKey();
  if (!apiKey) {
    console.warn(
      "[AutoProvision] API key not configured, skipping industry agents",
    );
    return { success: 0, failed: 0 };
  }

  const existing = await db.industryAIEmployeeAgent.findMany({
    where: { userId, industry },
    select: { employeeType: true },
  });
  const existingTypes = new Set(existing.map((a) => a.employeeType));
  const typesToCreate = module.employeeTypes.filter(
    (t) => !existingTypes.has(t),
  );

  if (typesToCreate.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const employeeType of typesToCreate) {
    try {
      const promptConfig = module.prompts[employeeType];
      const config = module.configs[employeeType];
      if (!promptConfig || !config) continue;

      const agentId = await createElevenLabsAgent(apiKey, {
        name: `${industry} - ${promptConfig.name}`,
        systemPrompt: promptConfig.systemPrompt,
        firstMessage: promptConfig.firstMessage,
        voiceId: promptConfig.voiceId,
      });

      const record = await db.industryAIEmployeeAgent.upsert({
        where: {
          userId_industry_employeeType: { userId, industry, employeeType },
        },
        create: {
          userId,
          industry,
          employeeType,
          name: promptConfig.name,
          elevenLabsAgentId: agentId,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
        },
        update: {
          elevenLabsAgentId: agentId,
          name: promptConfig.name,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
          updatedAt: new Date(),
        },
      });

      await attachToolsToElevenLabsAgent(apiKey, agentId, record.id, {
        source: "industry",
        industry,
        employeeType,
      }).catch((err) =>
        console.warn(
          `[AutoProvision] ${industry}.${employeeType} tools attach failed:`,
          err.message,
        ),
      );
      success++;
      console.log(`[AutoProvision] ${industry}.${employeeType} provisioned`);
    } catch (err) {
      failed++;
      console.error(`[AutoProvision] ${industry}.${employeeType} failed:`, err);
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return { success, failed };
}

async function provisionProfessionalAgents(
  userId: string,
): Promise<{ success: number; failed: number }> {
  const apiKey = getIndustryApiKey();
  if (!apiKey) {
    console.warn(
      "[AutoProvision] API key not configured, skipping professional agents",
    );
    return { success: 0, failed: 0 };
  }

  const existing = await db.professionalAIEmployeeAgent.findMany({
    where: { userId },
    select: { employeeType: true },
  });
  const existingTypes = new Set(existing.map((a) => a.employeeType));
  const typesToCreate = (
    Object.values(ProfessionalAIEmployeeType) as ProfessionalAIEmployeeType[]
  ).filter((t) => !existingTypes.has(t));

  if (typesToCreate.length === 0) {
    return { success: 0, failed: 0 };
  }

  let success = 0;
  let failed = 0;

  for (const employeeType of typesToCreate) {
    try {
      const promptConfig = PROFESSIONAL_EMPLOYEE_PROMPTS[employeeType];
      const config = PROFESSIONAL_EMPLOYEE_CONFIGS[employeeType];
      if (!promptConfig || !config) continue;

      const agentId = await createElevenLabsAgent(apiKey, {
        name: `Professional - ${promptConfig.name}`,
        systemPrompt: promptConfig.systemPrompt,
        firstMessage: promptConfig.firstMessage,
        voiceId: promptConfig.voiceId,
      });

      const record = await db.professionalAIEmployeeAgent.upsert({
        where: { userId_employeeType: { userId, employeeType } },
        create: {
          userId,
          employeeType,
          name: config.name,
          elevenLabsAgentId: agentId,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
        },
        update: {
          elevenLabsAgentId: agentId,
          name: config.name,
          voiceId: promptConfig.voiceId || "EXAVITQu4vr4xnSDxMaL",
          updatedAt: new Date(),
        },
      });

      await attachToolsToElevenLabsAgent(apiKey, agentId, record.id, {
        source: "professional",
        employeeType,
      }).catch((err) =>
        console.warn(
          `[AutoProvision] Professional ${employeeType} tools attach failed:`,
          err.message,
        ),
      );
      success++;
      console.log(`[AutoProvision] Professional ${employeeType} provisioned`);
    } catch (err: unknown) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[AutoProvision] Professional ${employeeType} failed:`,
        msg,
      );
    }
    await new Promise((r) => setTimeout(r, 1500)); // Longer delay to avoid rate limits
  }

  return { success, failed };
}

/**
 * Fix existing agents: PATCH LLM and attach tools (for agents created before the fix).
 */
async function fixExistingAgents(userId: string): Promise<void> {
  const apiKey = getIndustryApiKey() || getREApiKey();
  if (!apiKey) return;

  const [industryAgents, reAgents, profAgents] = await Promise.all([
    db.industryAIEmployeeAgent.findMany({
      where: { userId },
      select: {
        id: true,
        industry: true,
        employeeType: true,
        elevenLabsAgentId: true,
      },
    }),
    db.rEAIEmployeeAgent.findMany({
      where: { userId },
      select: { id: true, elevenLabsAgentId: true },
    }),
    db.professionalAIEmployeeAgent.findMany({
      where: { userId },
      select: { id: true, employeeType: true, elevenLabsAgentId: true },
    }),
  ]);

  const reApiKey = getREApiKey();
  for (const a of industryAgents) {
    if (a.elevenLabsAgentId) {
      await attachToolsToElevenLabsAgent(apiKey!, a.elevenLabsAgentId, a.id, {
        source: "industry",
        industry: a.industry,
        employeeType: a.employeeType,
      }).catch((e) =>
        console.warn(`[AutoProvision] Fix industry agent ${a.id}:`, e?.message),
      );
    }
  }
  for (const a of reAgents) {
    if (a.elevenLabsAgentId && reApiKey) {
      await attachToolsToElevenLabsAgent(reApiKey, a.elevenLabsAgentId, a.id, {
        source: "real_estate",
      }).catch((e) =>
        console.warn(`[AutoProvision] Fix RE agent ${a.id}:`, e?.message),
      );
    }
  }
  for (const a of profAgents) {
    if (a.elevenLabsAgentId) {
      await attachToolsToElevenLabsAgent(apiKey!, a.elevenLabsAgentId, a.id, {
        source: "professional",
        employeeType: a.employeeType,
      }).catch((e) =>
        console.warn(
          `[AutoProvision] Fix professional agent ${a.id}:`,
          e?.message,
        ),
      );
    }
  }
}

/**
 * Provision all AI employees for a user. Async version for scripts.
 * Safe to call multiple times; skips already-provisioned agents.
 * Also fixes existing agents (LLM + tools) when run.
 */
export async function provisionAIEmployeesForUserAsync(
  userId: string,
): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { industry: true, email: true },
  });
  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  // Fix existing agents (LLM + tools) - runs every time, safe to call repeatedly
  await fixExistingAgents(userId);

  // Professional agents: available to ALL users (even without industry - e.g. super-admin-created accounts)
  const { success: profSuccess, failed: profFailed } =
    await provisionProfessionalAgents(userId);
  if (profSuccess > 0 || profFailed > 0) {
    console.log(
      `[AutoProvision] ${user.email} Professional: ${profSuccess} provisioned, ${profFailed} failed`,
    );
  }

  const industry = user.industry as Industry | null;
  if (!industry) {
    console.log(
      `[AutoProvision] ${user.email} has no industry - Professional agents done. Set industry for RE/Industry agents.`,
    );
    return;
  }

  if (industry === "REAL_ESTATE") {
    const { success, failed, firstError } = await provisionREAgents(userId);
    if (success > 0 || failed > 0) {
      console.log(
        `[AutoProvision] ${user.email} RE: ${success} provisioned, ${failed} failed`,
      );
      if (failed > 0 && firstError) {
        console.error(`[AutoProvision] First RE error: ${firstError}`);
      }
    }
  } else {
    const module = getIndustryAIEmployeeModule(industry);
    if (module) {
      const { success, failed } = await provisionIndustryAgents(
        userId,
        industry,
      );
      if (success > 0 || failed > 0) {
        console.log(
          `[AutoProvision] ${user.email} ${industry}: ${success} provisioned, ${failed} failed`,
        );
      }
    }
  }
}

/**
 * Provision all AI employees for a user based on their industry.
 * Fire-and-forget: call and return immediately; provisioning runs in background.
 * Safe to call multiple times; skips already-provisioned agents.
 * Also fixes existing agents (LLM + tools) when run.
 */
export function provisionAIEmployeesForUser(userId: string): void {
  provisionAIEmployeesForUserAsync(userId).catch((err) => {
    console.error("[AutoProvision] Error:", err);
  });
}
