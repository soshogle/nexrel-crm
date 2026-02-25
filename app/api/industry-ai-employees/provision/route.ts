/**
 * Industry AI Employee Provisioning API
 * Creates ElevenLabs voice agents for industry-specific AI employees (Dental, Medical, etc.)
 * Same pattern as RE provision - uses industry prompts from registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Industry } from '@prisma/client';
import { getIndustryAIEmployeeModule } from '@/lib/industry-ai-employees/registry';
import { attachToolsToElevenLabsAgent } from '@/lib/ai-employee-tools';
import { provisionAIEmployeesForUser } from '@/lib/ai-employee-auto-provision';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// ElevenLabs agent creation can take 30+ seconds
export const maxDuration = 60;

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
      name: config.name,
      conversation_config: {
        agent: {
          prompt: { prompt: fullPrompt },
          first_message: config.firstMessage,
          language: 'en', // API only accepts ISO codes. Multilingual via prompt + eleven_multilingual_v2 TTS.
        },
        asr: { quality: 'high', provider: 'elevenlabs' },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL',
          model_id: 'eleven_multilingual_v2',
        },
        turn: { mode: 'turn', turn_timeout_seconds: 30 },
        conversation: { max_duration_seconds: 1800, turn_timeout_seconds: 30 },
      },
      platform_settings: {
        auth: { enable_auth: false },
        allowed_overrides: { agent: ['prompt', 'language'] },
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

    const record = await prisma.industryAIEmployeeAgent.upsert({
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

    await attachToolsToElevenLabsAgent(apiKey, agentId, record.id);

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
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const industry = searchParams.get('industry') as Industry | null;

    if (!industry) {
      return apiErrors.badRequest('Industry query parameter is required');
    }

    const module = getIndustryAIEmployeeModule(industry);
    if (!module) {
      return NextResponse.json(
        { error: `Industry ${industry} does not have AI employees` },
        { status: 404 }
      );
    }

    const agents = await getExistingAgents(session.user.id, industry);

    // Trigger auto-provision/fix in background (fixes existing agents' LLM + tools)
    provisionAIEmployeesForUser(session.user.id);

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
    return apiErrors.internal('Failed to fetch agents');
  }
}

// POST - Provision industry AI Employee agents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json().catch(() => ({}));
    const { industry, employeeTypes, forceRefresh } = body as {
      industry?: Industry;
      employeeTypes?: string[];
      forceRefresh?: boolean;
    };

    if (!industry) {
      return apiErrors.badRequest('Industry is required');
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
      return apiErrors.forbidden('Industry does not match your account');
    }

    let apiKey: string;
    try {
      apiKey = getApiKey();
    } catch (error) {
      return apiErrors.internal('Soshogle AI voice is not configured');
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
    const firstError = results.find((r) => !r.success)?.error;

    const updatedAgents = await getExistingAgents(session.user.id, industry);

    return NextResponse.json({
      success: failCount === 0,
      message: `Provisioned ${successCount} agents${failCount > 0 ? `, ${failCount} failed` : ''}`,
      error: failCount > 0 ? (firstError || `Provisioning failed for ${failCount} agent(s)`) : undefined,
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
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to provision agents');
  }
}
