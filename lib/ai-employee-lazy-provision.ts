/**
 * Lazy Provisioning for AI Employees
 * Provisions agents on first use - no manual "Provision All" step required
 * Used by: Run Now, Test Agent, Workflows, Campaigns
 */

import { prisma } from '@/lib/db';
import { enableFirstMessageOverride } from '@/lib/elevenlabs-overrides';
import { Industry } from '@prisma/client';
import { REAIEmployeeType } from '@prisma/client';
import { RE_AI_EMPLOYEE_PROMPTS } from '@/lib/real-estate/ai-employee-prompts';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';
import { PROFESSIONAL_EMPLOYEE_PROMPTS } from '@/lib/professional-ai-employees/prompts';
import type { ProfessionalAIEmployeeType } from '@/lib/professional-ai-employees/config';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

function getREApiKey(): string {
  const apiKey = process.env.ELEVENLABS_RE_API_KEY || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_RE_API_KEY or ELEVENLABS_API_KEY not set');
  return apiKey;
}

function getIndustryApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY or ELEVENLABS_RE_API_KEY not set');
  return apiKey;
}

async function createElevenLabsAgent(
  apiKey: string,
  config: { name: string; systemPrompt: string; firstMessage: string; voiceId?: string }
): Promise<string> {
  const { getConfidentialityGuard } = await import('@/lib/ai-confidentiality-guard');
  const { EASTERN_TIME_SYSTEM_INSTRUCTION } = await import('@/lib/voice-time-context');
  const fullPrompt = config.systemPrompt + EASTERN_TIME_SYSTEM_INSTRUCTION + getConfidentialityGuard();
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: { prompt: fullPrompt },
          first_message: config.firstMessage,
          language: 'en', // API only accepts single codes. Multilingual via prompt.
        },
        asr: { quality: 'high', provider: 'elevenlabs' },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
          model_id: 'eleven_turbo_v2_5',
        },
        turn: { mode: 'turn_based' },
      },
      name: config.name,
      platform_settings: {
        auth: { enable_auth: false },
        allowed_overrides: { agent: ['first_message', 'prompt', 'language'] },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs create failed: ${err}`);
  }

  const data = await response.json();
  const agentId = data.agent_id;

  const overrideResult = await enableFirstMessageOverride(agentId, apiKey);
  if (!overrideResult.success) {
    console.warn('[LazyProvision] First message override not enabled (non-fatal):', overrideResult.error);
  }

  return agentId;
}

/**
 * Ensure RE AI Employee agent is provisioned. Provision on first use if not.
 */
export async function ensureREAgentProvisioned(
  userId: string,
  employeeType: REAIEmployeeType
): Promise<{ id: string; elevenLabsAgentId: string } | null> {
  const existing = await prisma.rEAIEmployeeAgent.findUnique({
    where: {
      userId_employeeType: { userId, employeeType },
    },
  });

  if (existing?.elevenLabsAgentId) {
    return { id: existing.id, elevenLabsAgentId: existing.elevenLabsAgentId };
  }

  const promptConfig = RE_AI_EMPLOYEE_PROMPTS[employeeType];
  if (!promptConfig) return null;

  try {
    const apiKey = getREApiKey();
    const agentId = await createElevenLabsAgent(apiKey, {
      name: `RE - ${promptConfig.name}`,
      systemPrompt: promptConfig.systemPrompt,
      firstMessage: promptConfig.firstMessage,
      voiceId: promptConfig.voiceId,
    });

    const created = await prisma.rEAIEmployeeAgent.upsert({
      where: {
        userId_employeeType: { userId, employeeType },
      },
      create: {
        userId,
        employeeType,
        name: promptConfig.name,
        elevenLabsAgentId: agentId,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
      },
      update: {
        elevenLabsAgentId: agentId,
        name: promptConfig.name,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        updatedAt: new Date(),
      },
    });

    return { id: created.id, elevenLabsAgentId: created.elevenLabsAgentId };
  } catch (error) {
    console.error(`[LazyProvision] Failed to provision RE ${employeeType}:`, error);
    return null;
  }
}

/**
 * Ensure Industry AI Employee agent is provisioned. Provision on first use if not.
 */
export async function ensureIndustryAgentProvisioned(
  userId: string,
  industry: Industry,
  employeeType: string
): Promise<{ id: string; elevenLabsAgentId: string } | null> {
  const existing = await prisma.industryAIEmployeeAgent.findUnique({
    where: {
      userId_industry_employeeType: { userId, industry, employeeType },
    },
  });

  if (existing?.elevenLabsAgentId) {
    return { id: existing.id, elevenLabsAgentId: existing.elevenLabsAgentId };
  }

  const module = getIndustryAIEmployeeModule(industry);
  if (!module) return null;

  const promptConfig = module.prompts[employeeType];
  if (!promptConfig) return null;

  try {
    const apiKey = getIndustryApiKey();
    const agentId = await createElevenLabsAgent(apiKey, {
      name: `${industry} - ${promptConfig.name}`,
      systemPrompt: promptConfig.systemPrompt,
      firstMessage: promptConfig.firstMessage,
      voiceId: promptConfig.voiceId,
    });

    const created = await prisma.industryAIEmployeeAgent.upsert({
      where: {
        userId_industry_employeeType: { userId, industry, employeeType },
      },
      create: {
        userId,
        industry,
        employeeType,
        name: promptConfig.name,
        elevenLabsAgentId: agentId,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
      },
      update: {
        elevenLabsAgentId: agentId,
        name: promptConfig.name,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        updatedAt: new Date(),
      },
    });

    return { id: created.id, elevenLabsAgentId: created.elevenLabsAgentId };
  } catch (error) {
    console.error(`[LazyProvision] Failed to provision ${industry}.${employeeType}:`, error);
    return null;
  }
}

/**
 * Ensure Professional AI Employee agent is provisioned. Provision on first use if not.
 * Used for: AI Team (12 professional roles), Workflows, Campaigns.
 */
export async function ensureProfessionalAgentProvisioned(
  userId: string,
  employeeType: ProfessionalAIEmployeeType,
  jurisdiction?: string
): Promise<{ id: string; elevenLabsAgentId: string } | null> {
  const existing = await prisma.professionalAIEmployeeAgent.findUnique({
    where: {
      userId_employeeType: { userId, employeeType },
    },
  });

  if (existing?.elevenLabsAgentId) {
    return { id: existing.id, elevenLabsAgentId: existing.elevenLabsAgentId };
  }

  const promptConfig = PROFESSIONAL_EMPLOYEE_PROMPTS[employeeType];
  if (!promptConfig) return null;

  try {
    const apiKey = getIndustryApiKey();
    let systemPrompt = promptConfig.systemPrompt;
    if (jurisdiction) {
      systemPrompt = systemPrompt.replace(/\{\{jurisdiction\}\}/g, jurisdiction);
    } else {
      systemPrompt = systemPrompt.replace(/\{\{jurisdiction\}\}/g, 'General');
    }
    systemPrompt = systemPrompt.replace(/\{\{current_datetime\}\}/g, new Date().toISOString());

    const agentId = await createElevenLabsAgent(apiKey, {
      name: promptConfig.name,
      systemPrompt,
      firstMessage: promptConfig.firstMessage,
      voiceId: promptConfig.voiceId,
    });

    const created = await prisma.professionalAIEmployeeAgent.upsert({
      where: {
        userId_employeeType: { userId, employeeType },
      },
      create: {
        userId,
        employeeType,
        name: promptConfig.name,
        elevenLabsAgentId: agentId,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        jurisdiction: jurisdiction || null,
      },
      update: {
        elevenLabsAgentId: agentId,
        name: promptConfig.name,
        voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
        jurisdiction: jurisdiction || null,
        updatedAt: new Date(),
      },
    });

    return { id: created.id, elevenLabsAgentId: created.elevenLabsAgentId };
  } catch (error) {
    console.error(`[LazyProvision] Failed to provision professional ${employeeType}:`, error);
    return null;
  }
}
