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

// Simple health check - test if route is accessible
export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}

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
    console.log('🔍 [Test Agent Creation] Endpoint called');
    
    const session = await getServerSession(authOptions);
    console.log('🔍 [Test Agent Creation] Session:', session ? 'exists' : 'missing');
    
    if (!session?.user?.id) {
      console.log('❌ [Test Agent Creation] Unauthorized - no session');
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'Please log in to access this endpoint',
      }, { status: 401 });
    }

    console.log('✅ [Test Agent Creation] User authenticated:', session.user.email);
    const userId = session.user.id;
    
    console.log('🔑 [Test Agent Creation] Getting API key...');
    const apiKey = await getApiKey(userId);
    console.log('🔑 [Test Agent Creation] API key:', apiKey ? `found (ends with ...${apiKey.slice(-8)})` : 'NOT FOUND');

    if (!apiKey) {
      console.error('❌ [Test Agent Creation] No API key found');
      return NextResponse.json({
        error: 'No ElevenLabs API key found',
        step: 'api_key_check',
        message: 'Please configure your ElevenLabs API key in settings',
      }, { status: 400 });
    }

    const results: any = {
      userId: userId,
      userEmail: session.user.email,
      apiKeyPreview: `...${apiKey.slice(-8)}`,
      steps: [],
      errors: [],
    };

    // Step 1: List all agents in ElevenLabs
    try {
      console.log('📋 [Test Agent Creation] Step 1: Listing ElevenLabs agents...');
      results.steps.push({ step: 'list_elevenlabs_agents', status: 'running' });
      const elevenLabsResult = await listAllElevenLabsAgents(apiKey);
      results.steps[results.steps.length - 1] = {
        step: 'list_elevenlabs_agents',
        status: elevenLabsResult.success ? 'success' : 'error',
        data: elevenLabsResult,
      };
      results.elevenLabsAgents = elevenLabsResult.agents;
      console.log(`✅ [Test Agent Creation] Found ${elevenLabsResult.count} agents in ElevenLabs`);
    } catch (error: any) {
      console.error('❌ [Test Agent Creation] Error listing agents:', error);
      results.steps.push({
        step: 'list_elevenlabs_agents',
        status: 'error',
        error: error.message,
      });
      results.errors.push(`Failed to list agents: ${error.message}`);
    }

    // Step 2: Check database records
    try {
      console.log('📊 [Test Agent Creation] Step 2: Checking database...');
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
      console.log(`✅ [Test Agent Creation] Found ${dbAgents.length} agents in database`);
    } catch (error: any) {
      console.error('❌ [Test Agent Creation] Error checking database:', error);
      results.steps.push({
        step: 'check_database',
        status: 'error',
        error: error.message,
      });
      results.errors.push(`Failed to check database: ${error.message}`);
      results.databaseAgents = [];
    }

    // Step 3: Verify each database agent exists in ElevenLabs
    try {
      console.log('🔍 [Test Agent Creation] Step 3: Verifying agents...');
      results.steps.push({ step: 'verify_agents', status: 'running' });
      const verifications = [];
      const dbAgents = results.databaseAgents || [];
      for (const dbAgent of dbAgents) {
        try {
          const verification = await verifyAgentExists(dbAgent.elevenLabsAgentId, apiKey);
          verifications.push({
            dbAgentId: dbAgent.id,
            elevenLabsAgentId: dbAgent.elevenLabsAgentId,
            profession: dbAgent.profession,
            ...verification,
          });
        } catch (error: any) {
          verifications.push({
            dbAgentId: dbAgent.id,
            elevenLabsAgentId: dbAgent.elevenLabsAgentId,
            profession: dbAgent.profession,
            exists: false,
            reason: `Error: ${error.message}`,
          });
        }
      }
      results.steps[results.steps.length - 1] = {
        step: 'verify_agents',
        status: 'success',
        data: verifications,
      };
      results.verifications = verifications;
      console.log(`✅ [Test Agent Creation] Verified ${verifications.length} agents`);
    } catch (error: any) {
      console.error('❌ [Test Agent Creation] Error verifying agents:', error);
      results.steps.push({
        step: 'verify_agents',
        status: 'error',
        error: error.message,
      });
      results.errors.push(`Failed to verify agents: ${error.message}`);
      results.verifications = [];
    }

    // Step 4: Force create a new test agent
    try {
      console.log('🚀 [Test Agent Creation] Step 4: Creating test agent...');
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
        console.error('❌ [Test Agent Creation] Agent creation failed:', createResult.error);
        results.steps[results.steps.length - 1] = {
          step: 'create_test_agent',
          status: 'error',
          error: createResult.error,
        };
        results.createResult = createResult;
        results.errors.push(`Failed to create agent: ${createResult.error}`);
      } else {
        console.log(`✅ [Test Agent Creation] Agent created: ${createResult.agentId}`);
        results.steps[results.steps.length - 1] = {
          step: 'create_test_agent',
          status: 'success',
          agentId: createResult.agentId,
        };
        results.createResult = createResult;

        // Step 5: Verify the new agent exists
        if (createResult.agentId) {
          try {
            console.log('🔍 [Test Agent Creation] Step 5: Verifying new agent...');
            results.steps.push({ step: 'verify_new_agent', status: 'running' });
            const newAgentVerification = await verifyAgentExists(createResult.agentId, apiKey);
            results.steps[results.steps.length - 1] = {
              step: 'verify_new_agent',
              status: newAgentVerification.exists ? 'success' : 'error',
              data: newAgentVerification,
            };
            results.newAgentVerification = newAgentVerification;
            if (newAgentVerification.exists) {
              console.log(`✅ [Test Agent Creation] New agent verified in ElevenLabs`);
            } else {
              console.warn(`⚠️ [Test Agent Creation] New agent not found: ${newAgentVerification.reason}`);
            }
          } catch (error: any) {
            console.error('❌ [Test Agent Creation] Error verifying new agent:', error);
            results.steps.push({
              step: 'verify_new_agent',
              status: 'error',
              error: error.message,
            });
            results.errors.push(`Failed to verify new agent: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ [Test Agent Creation] Error creating agent:', error);
      results.steps.push({
        step: 'create_test_agent',
        status: 'error',
        error: error.message,
        stack: error.stack,
      });
      results.errors.push(`Failed to create agent: ${error.message}`);
    }

    console.log('✅ [Test Agent Creation] Test completed');
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('❌ [Test Agent Creation] Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
