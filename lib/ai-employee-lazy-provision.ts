/**
 * Lazy Provisioning for AI Employees
 * Provisions agents on first use - no manual "Provision All" step required
 * Used by: Run Now, Test Agent, Workflows, Campaigns
 */

import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
import { REAIEmployeeType } from '@prisma/client';
import { RE_AI_EMPLOYEE_PROMPTS } from '@/lib/real-estate/ai-employee-prompts';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';

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
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: { prompt: config.systemPrompt },
          first_message: config.firstMessage,
          language: 'en',
        },
        asr: { quality: 'high', provider: 'elevenlabs' },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
          model_id: 'eleven_turbo_v2_5',
        },
        turn: { mode: 'turn_based' },
      },
      name: config.name,
      platform_settings: { auth: { enable_auth: false } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`ElevenLabs create failed: ${err}`);
  }

  const data = await response.json();
  return data.agent_id;
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
