/**
 * Professional AI Employee Provisioning API
 * Provisions the 12 expert roles (Accountant, Developer, Legal Assistant, etc.)
 * Available to ALL users - RE-style provisioning
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enableFirstMessageOverride } from '@/lib/elevenlabs-overrides';
import { ProfessionalAIEmployeeType } from '@prisma/client';
import { PROFESSIONAL_EMPLOYEE_CONFIGS } from '@/lib/professional-ai-employees/config';
import { PROFESSIONAL_EMPLOYEE_PROMPTS } from '@/lib/professional-ai-employees/prompts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

function getApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY or ELEVENLABS_RE_API_KEY environment variable is not set');
  }
  return apiKey;
}

async function createElevenLabsAgent(
  apiKey: string,
  config: { name: string; systemPrompt: string; firstMessage: string; voiceId?: string }
): Promise<{ agentId: string }> {
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
    const error = await response.text();
    throw new Error(`ElevenLabs create failed: ${error}`);
  }

  const data = await response.json();
  return { agentId: data.agent_id };
}

async function getExistingAgents(userId: string) {
  return prisma.professionalAIEmployeeAgent.findMany({
    where: { userId },
  });
}

// GET - List provisioned professional AI employees
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await getExistingAgents(session.user.id);
    const enrichedAgents = agents
      .filter((agent) => agent?.employeeType && typeof agent.employeeType === 'string')
      .map((agent) => ({
        ...agent,
        description: PROFESSIONAL_EMPLOYEE_CONFIGS[agent.employeeType as ProfessionalAIEmployeeType]?.description || '',
      }));

    return NextResponse.json({
      success: true,
      agents: enrichedAgents,
      totalTypes: 12,
      provisionedCount: enrichedAgents.length,
    });
  } catch (error) {
    console.error('Error fetching professional AI employees:', error);
    return NextResponse.json({
      success: true,
      agents: [],
      totalTypes: 12,
      provisionedCount: 0,
      error: error instanceof Error ? error.message : 'Failed to fetch agents',
    });
  }
}

// POST - Provision professional AI employees
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => undefined);
    const { employeeTypes, forceRefresh } = body || {};

    let apiKey: string;
    try {
      apiKey = getApiKey();
    } catch {
      return NextResponse.json(
        { error: 'Soshogle AI voice is not configured' },
        { status: 500 }
      );
    }

    const typesToProvision: ProfessionalAIEmployeeType[] =
      employeeTypes?.length > 0
        ? employeeTypes
        : (Object.values(ProfessionalAIEmployeeType) as ProfessionalAIEmployeeType[]);

    const existingAgents = await getExistingAgents(session.user.id);
    const existingTypes = new Set(existingAgents.map((a) => a.employeeType));

    const typesToCreate = forceRefresh
      ? typesToProvision
      : typesToProvision.filter((t) => !existingTypes.has(t));

    if (typesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All Professional AI Employees are already provisioned',
        agents: existingAgents,
      });
    }

    const results: Array<{ type: ProfessionalAIEmployeeType; success: boolean; agentId?: string; error?: string }> = [];

    for (const employeeType of typesToCreate) {
      try {
        const promptConfig = PROFESSIONAL_EMPLOYEE_PROMPTS[employeeType];
        const config = PROFESSIONAL_EMPLOYEE_CONFIGS[employeeType];
        if (!promptConfig || !config) continue;

        const { agentId } = await createElevenLabsAgent(apiKey, {
          name: `Professional - ${promptConfig.name}`,
          systemPrompt: promptConfig.systemPrompt,
          firstMessage: promptConfig.firstMessage,
          voiceId: promptConfig.voiceId,
        });

        await enableFirstMessageOverride(agentId, apiKey).catch(() => {});

        await prisma.professionalAIEmployeeAgent.upsert({
          where: {
            userId_employeeType: { userId: session.user.id, employeeType },
          },
          create: {
            userId: session.user.id,
            employeeType,
            name: config.name,
            elevenLabsAgentId: agentId,
            voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
          },
          update: {
            elevenLabsAgentId: agentId,
            name: config.name,
            voiceId: promptConfig.voiceId || 'EXAVITQu4vr4xnSDxMaL',
            updatedAt: new Date(),
          },
        });

        results.push({ type: employeeType, success: true, agentId });
      } catch (err) {
        results.push({
          type: employeeType,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const updatedAgents = await getExistingAgents(session.user.id);

    return NextResponse.json({
      success: failCount === 0,
      message: `Provisioned ${successCount} agents${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      agents: updatedAgents,
    });
  } catch (error) {
    console.error('Error provisioning professional AI employees:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to provision agents' },
      { status: 500 }
    );
  }
}
