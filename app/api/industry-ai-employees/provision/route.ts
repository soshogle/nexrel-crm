/**
 * Industry AI Employee Provisioning API
 * Creates ElevenLabs voice agents for industry-specific AI employees (Dental, Medical, etc.)
 * Same pattern as RE provision - uses industry prompts from registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { enableFirstMessageOverride } from '@/lib/elevenlabs-overrides';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';

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
  config: {
    name: string;
    systemPrompt: string;
    firstMessage: string;
    voiceId?: string;
  }
): Promise<{ agentId: string }> {
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      conversation_config: {
        agent: {
          prompt: {
            prompt: config.systemPrompt,
          },
          first_message: config.firstMessage,
          language: 'en',
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
        },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
          model_id: 'eleven_turbo_v2_5',
        },
        turn: {
          mode: 'turn_based',
        },
      },
      name: config.name,
      platform_settings: {
        auth: {
          enable_auth: false,
        },
        allowed_overrides: {
          agent: ['first_message', 'prompt', 'language'],
        },
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('ElevenLabs agent creation failed:', error);
    throw new Error(`Failed to create ElevenLabs agent: ${error}`);
  }

  const data = await response.json();
  const agentId = data.agent_id;

  const overrideResult = await enableFirstMessageOverride(agentId, apiKey);
  if (!overrideResult.success) {
    console.warn('⚠️ First message override not enabled (non-fatal):', overrideResult.error);
  }

  return { agentId };
}

async function getExistingAgents(userId: string, industry: Industry) {
  return prisma.industryAIEmployeeAgent.findMany({
    where: { userId, industry },
  });
}

async function provisionEmployee(
  userId: string,
  industry: Industry,
  employeeType: string,
  apiKey: string
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  const module = getIndustryAIEmployeeModule(industry);
  if (!module) {
    return { success: false, error: `Unknown industry: ${industry}` };
  }

  const promptConfig = module.prompts[employeeType];
  if (!promptConfig) {
    return { success: false, error: `Unknown employee type: ${employeeType}` };
  }

  const config = module.configs[employeeType];
  if (!config) {
    return { success: false, error: `No config for employee type: ${employeeType}` };
  }

  try {
    const { agentId } = await createElevenLabsAgent(apiKey, {
      name: `${industry} - ${promptConfig.name}`,
      systemPrompt: promptConfig.systemPrompt,
      firstMessage: promptConfig.firstMessage,
      voiceId: promptConfig.voiceId,
    });

    await prisma.industryAIEmployeeAgent.upsert({
      where: {
        userId_industry_employeeType: {
          userId,
          industry,
          employeeType,
        },
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

    return { success: true, agentId };
  } catch (error) {
    console.error(`Failed to provision ${industry}.${employeeType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// GET - List existing industry AI Employee agents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;

    if (!industry) {
      return NextResponse.json(
        { error: 'Industry query parameter is required' },
        { status: 400 }
      );
    }

    const module = getIndustryAIEmployeeModule(industry);
    if (!module) {
      return NextResponse.json(
        { error: `Industry ${industry} does not have AI employees` },
        { status: 404 }
      );
    }

    const agents = await getExistingAgents(session.user.id, industry);

    return NextResponse.json({
      success: true,
      agents: agents.map((a) => ({
        id: a.id,
        employeeType: a.employeeType,
        name: a.name,
        elevenLabsAgentId: a.elevenLabsAgentId,
        twilioPhoneNumber: a.twilioPhoneNumber,
        status: a.status,
        callCount: a.callCount,
        createdAt: a.createdAt.toISOString(),
      })),
      totalTypes: module.employeeTypes.length,
      provisionedCount: agents.length,
    });
  } catch (error) {
    console.error('Error fetching industry AI Employee agents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
}

// POST - Provision industry AI Employee agents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { industry, employeeTypes, forceRefresh } = body as {
      industry?: Industry;
      employeeTypes?: string[];
      forceRefresh?: boolean;
    };

    if (!industry) {
      return NextResponse.json(
        { error: 'Industry is required' },
        { status: 400 }
      );
    }

    const module = getIndustryAIEmployeeModule(industry);
    if (!module) {
      return NextResponse.json(
        { error: `Industry ${industry} does not have AI employees` },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    if (user?.industry !== industry) {
      return NextResponse.json(
        { error: 'Industry does not match your account' },
        { status: 403 }
      );
    }

    let apiKey: string;
    try {
      apiKey = getApiKey();
    } catch (error) {
      return NextResponse.json(
        { error: 'Soshogle AI voice is not configured' },
        { status: 500 }
      );
    }

    const typesToProvision: string[] =
      employeeTypes && employeeTypes.length > 0
        ? employeeTypes
        : module.employeeTypes;

    const existingAgents = await getExistingAgents(session.user.id, industry);
    const existingTypes = new Set(existingAgents.map((a) => a.employeeType));

    const typesToCreate = forceRefresh
      ? typesToProvision
      : typesToProvision.filter((t) => !existingTypes.has(t));

    if (typesToCreate.length === 0) {
      const agents = await getExistingAgents(session.user.id, industry);
      return NextResponse.json({
        success: true,
        message: 'All industry AI Employees are already provisioned',
        agents: agents.map((a) => ({
          id: a.id,
          employeeType: a.employeeType,
          name: a.name,
          elevenLabsAgentId: a.elevenLabsAgentId,
          status: a.status,
          callCount: a.callCount,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    }

    const results: Array<{
      type: string;
      success: boolean;
      agentId?: string;
      error?: string;
    }> = [];

    for (const type of typesToCreate) {
      const result = await provisionEmployee(
        session.user.id,
        industry,
        type,
        apiKey
      );
      results.push({ type, ...result });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    const updatedAgents = await getExistingAgents(session.user.id, industry);

    return NextResponse.json({
      success: failCount === 0,
      message: `Provisioned ${successCount} agents${failCount > 0 ? `, ${failCount} failed` : ''}`,
      results,
      agents: updatedAgents.map((a) => ({
        id: a.id,
        employeeType: a.employeeType,
        name: a.name,
        elevenLabsAgentId: a.elevenLabsAgentId,
        status: a.status,
        callCount: a.callCount,
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error provisioning industry AI Employees:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to provision agents',
      },
      { status: 500 }
    );
  }
}
