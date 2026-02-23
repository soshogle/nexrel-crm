/**
 * Real Estate AI Employee Provisioning API
 * 
 * Creates ElevenLabs voice agents for all 12 RE AI Employee types.
 * Uses the dedicated RE ElevenLabs API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REAIEmployeeType } from '@prisma/client';
import { RE_AI_EMPLOYEE_PROMPTS } from '@/lib/real-estate/ai-employee-prompts';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Get the Real Estate specific API key
function getREApiKey(): string {
  const apiKey = process.env.ELEVENLABS_RE_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_RE_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Create a single ElevenLabs agent
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
      conversation_config: {
        agent: {
          prompt: {
            prompt: fullPrompt,
          },
          first_message: config.firstMessage,
          language: 'en', // API only accepts single codes. Multilingual via prompt.
        },
        asr: {
          quality: 'high',
          provider: 'elevenlabs',
        },
        tts: {
          voice_id: config.voiceId || 'EXAVITQu4vr4xnSDxMaL', // Sarah - friendly female voice
          model_id: 'eleven_turbo_v2_5',
        },
        turn: {
          mode: 'turn',
        },
      },
      name: config.name,
      platform_settings: {
        auth: {
          enable_auth: false,
        },
        allowed_overrides: {
          agent: ['prompt', 'language'],
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

  return { agentId };
}

// Get existing agents for a user
async function getExistingAgents(userId: string) {
  return prisma.rEAIEmployeeAgent.findMany({
    where: { userId },
  });
}

// Provision a single RE AI Employee
async function provisionEmployee(
  userId: string,
  employeeType: REAIEmployeeType,
  apiKey: string
): Promise<{ success: boolean; agentId?: string; error?: string }> {
  const promptConfig = RE_AI_EMPLOYEE_PROMPTS[employeeType];
  
  if (!promptConfig) {
    return { success: false, error: `Unknown employee type: ${employeeType}` };
  }

  try {
    // Create the ElevenLabs agent
    const { agentId } = await createElevenLabsAgent(apiKey, {
      name: `RE - ${promptConfig.name}`,
      systemPrompt: promptConfig.systemPrompt,
      firstMessage: promptConfig.firstMessage,
      voiceId: promptConfig.voiceId,
    });

    // Store in database
    await prisma.rEAIEmployeeAgent.upsert({
      where: {
        userId_employeeType: {
          userId,
          employeeType,
        },
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

    return { success: true, agentId };
  } catch (error) {
    console.error(`Failed to provision ${employeeType}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// GET - List existing RE AI Employee agents
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify user is in Real Estate industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    if (user?.industry !== 'REAL_ESTATE') {
      return apiErrors.forbidden('This feature is only available for Real Estate users');
    }

    const agents = await getExistingAgents(session.user.id);
    
    // Map to include prompt info
    const enrichedAgents = agents.map(agent => ({
      ...agent,
      description: RE_AI_EMPLOYEE_PROMPTS[agent.employeeType]?.description || '',
    }));

    return NextResponse.json({
      success: true,
      agents: enrichedAgents,
      totalTypes: Object.keys(REAIEmployeeType).length,
      provisionedCount: agents.length,
    });
  } catch (error) {
    console.error('Error fetching RE AI Employee agents:', error);
    return apiErrors.internal('Failed to fetch agents');
  }
}

// POST - Provision RE AI Employee agents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Verify user is in Real Estate industry
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { industry: true },
    });

    if (user?.industry !== 'REAL_ESTATE') {
      return apiErrors.forbidden('This feature is only available for Real Estate users');
    }

    const body = await request.json().catch(() => ({}));
    const { employeeTypes } = body;

    // Get the RE API key
    let apiKey: string;
    try {
      apiKey = getREApiKey();
    } catch (error) {
      return apiErrors.internal('ElevenLabs API key not configured for Real Estate');
    }

    // Determine which types to provision
    const typesToProvision: REAIEmployeeType[] = employeeTypes && employeeTypes.length > 0
      ? employeeTypes
      : Object.values(REAIEmployeeType);

    // Check which agents already exist
    const existingAgents = await getExistingAgents(session.user.id);
    const existingTypes = new Set(existingAgents.map(a => a.employeeType));

    // Filter to only provision new types (unless force refresh requested)
    const forceRefresh = body.forceRefresh === true;
    const typesToCreate = forceRefresh 
      ? typesToProvision 
      : typesToProvision.filter(t => !existingTypes.has(t));

    if (typesToCreate.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All RE AI Employees are already provisioned',
        agents: existingAgents,
      });
    }

    // Provision each type
    const results: Array<{
      type: REAIEmployeeType;
      success: boolean;
      agentId?: string;
      error?: string;
    }> = [];

    for (const type of typesToCreate) {
      console.log(`Provisioning RE AI Employee: ${type}`);
      const result = await provisionEmployee(session.user.id, type, apiKey);
      results.push({ type, ...result });
      
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // Fetch updated list of agents
    const updatedAgents = await getExistingAgents(session.user.id);
    const firstError = results.find((r) => !r.success)?.error;

    return NextResponse.json({
      success: failCount === 0,
      message: `Provisioned ${successCount} agents${failCount > 0 ? `, ${failCount} failed` : ''}`,
      error: failCount > 0 ? (firstError || `Provisioning failed for ${failCount} agent(s)`) : undefined,
      results,
      agents: updatedAgents,
    });
  } catch (error) {
    console.error('Error provisioning RE AI Employees:', error);
    return apiErrors.internal(error instanceof Error ? error.message : 'Failed to provision agents');
  }
}

// DELETE - Remove a specific RE AI Employee agent
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const employeeType = searchParams.get('type') as REAIEmployeeType;

    if (!employeeType) {
      return apiErrors.badRequest('Employee type is required');
    }

    // Find and delete the agent
    const agent = await prisma.rEAIEmployeeAgent.findUnique({
      where: {
        userId_employeeType: {
          userId: session.user.id,
          employeeType,
        },
      },
    });

    if (!agent) {
      return apiErrors.notFound('Agent not found');
    }

    // Try to delete from ElevenLabs (optional - don't fail if this doesn't work)
    try {
      const apiKey = getREApiKey();
      await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agent.elevenLabsAgentId}`, {
        method: 'DELETE',
        headers: {
          'xi-api-key': apiKey,
        },
      });
    } catch (error) {
      console.warn('Failed to delete agent from ElevenLabs:', error);
    }

    // Delete from database
    await prisma.rEAIEmployeeAgent.delete({
      where: { id: agent.id },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${employeeType} agent`,
    });
  } catch (error) {
    console.error('Error deleting RE AI Employee:', error);
    return apiErrors.internal('Failed to delete agent');
  }
}
