/**
 * Test API endpoint to diagnose and fix Docpen agent creation
 * 
 * GET /api/docpen/test-agent-creation
 * - Lists all agents in ElevenLabs
 * - Checks database records
 * - Verifies agents exist
 * - Force creates a new test agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { docpenAgentProvisioning } from '@/lib/docpen/agent-provisioning';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function getApiKey(userId: string): Promise<string | null> {
  const apiKey = await elevenLabsKeyManager.getActiveApiKey(userId);
  return apiKey || process.env.ELEVENLABS_API_KEY || null;
}

async function listAllElevenLabsAgents(apiKey: string) {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list agents: ${response.status} ${error}`);
    }

    const data = await response.json();
    return {
      success: true,
      agents: data.agents || [],
      count: data.agents?.length || 0,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      agents: [],
      count: 0,
    };
  }
}

async function verifyAgentExists(agentId: string, apiKey: string) {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const agent = await response.json();
      return {
        exists: true,
        name: agent.name || 'Unnamed',
        status: agent.status || 'Unknown',
      };
    } else if (response.status === 404) {
      return { exists: false, reason: 'Not found (404)' };
    } else {
      const error = await response.text();
      return { exists: false, reason: `Error ${response.status}: ${error}` };
    }
  } catch (error: any) {
    return { exists: false, reason: `Network error: ${error.message}` };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const apiKey = await getApiKey(userId);

    if (!apiKey) {
      return NextResponse.json({
        error: 'No ElevenLabs API key found',
        step: 'api_key_check',
      }, { status: 400 });
    }

    const results: any = {
      userId: userId,
      userEmail: session.user.email,
      apiKeyPreview: `...${apiKey.slice(-8)}`,
      steps: [],
    };

    // Step 1: List all agents in ElevenLabs
    results.steps.push({ step: 'list_elevenlabs_agents', status: 'running' });
    const elevenLabsResult = await listAllElevenLabsAgents(apiKey);
    results.steps[results.steps.length - 1] = {
      step: 'list_elevenlabs_agents',
      status: elevenLabsResult.success ? 'success' : 'error',
      data: elevenLabsResult,
    };
    results.elevenLabsAgents = elevenLabsResult.agents;

    // Step 2: Check database records
    results.steps.push({ step: 'check_database', status: 'running' });
    const dbAgents = await prisma.docpenVoiceAgent.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        profession: true,
        customProfession: true,
        elevenLabsAgentId: true,
        createdAt: true,
      },
    });
    results.steps[results.steps.length - 1] = {
      step: 'check_database',
      status: 'success',
      data: { count: dbAgents.length, agents: dbAgents },
    };
    results.databaseAgents = dbAgents;

    // Step 3: Verify each database agent exists in ElevenLabs
    results.steps.push({ step: 'verify_agents', status: 'running' });
    const verifications = [];
    for (const dbAgent of dbAgents) {
      const verification = await verifyAgentExists(dbAgent.elevenLabsAgentId, apiKey);
      verifications.push({
        dbAgentId: dbAgent.id,
        elevenLabsAgentId: dbAgent.elevenLabsAgentId,
        profession: dbAgent.profession,
        ...verification,
      });
    }
    results.steps[results.steps.length - 1] = {
      step: 'verify_agents',
      status: 'success',
      data: verifications,
    };
    results.verifications = verifications;

    // Step 4: Force create a new test agent
    results.steps.push({ step: 'create_test_agent', status: 'running' });
    const testConfig = {
      userId,
      profession: 'GENERAL_PRACTICE' as const,
      practitionerName: session.user.name || 'Test Doctor',
      clinicName: 'Test Clinic',
      voiceGender: 'neutral' as const,
    };

    const createResult = await docpenAgentProvisioning.createAgent(testConfig);
    
    if (!createResult.success) {
      results.steps[results.steps.length - 1] = {
        step: 'create_test_agent',
        status: 'error',
        error: createResult.error,
      };
      results.createResult = createResult;
    } else {
      results.steps[results.steps.length - 1] = {
        step: 'create_test_agent',
        status: 'success',
        agentId: createResult.agentId,
      };
      results.createResult = createResult;

      // Step 5: Verify the new agent exists
      if (createResult.agentId) {
        results.steps.push({ step: 'verify_new_agent', status: 'running' });
        const newAgentVerification = await verifyAgentExists(createResult.agentId, apiKey);
        results.steps[results.steps.length - 1] = {
          step: 'verify_new_agent',
          status: newAgentVerification.exists ? 'success' : 'error',
          data: newAgentVerification,
        };
        results.newAgentVerification = newAgentVerification;
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('❌ [Test Agent Creation] Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
