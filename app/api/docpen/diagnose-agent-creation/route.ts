/**
 * Diagnostic endpoint to troubleshoot agent creation issues
 * 
 * GET /api/docpen/diagnose-agent-creation
 * - Checks API key availability (user-specific and env var)
 * - Tests API key validity by calling ElevenLabs API
 * - Attempts to create a test agent
 * - Lists existing agents in ElevenLabs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { elevenLabsKeyManager } from '@/lib/elevenlabs-key-manager';
import { docpenAgentProvisioning } from '@/lib/docpen/agent-provisioning';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string; userInfo?: any }> {
  if (!apiKey || apiKey.trim() === '') {
    return { valid: false, error: 'API key is empty' };
  }

  try {
    // Test by getting user info (lightweight call)
    const response = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const userInfo = await response.json();
      return { valid: true, userInfo };
    } else {
      const errorText = await response.text();
      return { valid: false, error: `API returned ${response.status}: ${errorText}` };
    }
  } catch (error: any) {
    return { valid: false, error: `Network error: ${error.message}` };
  }
}

async function listAgents(apiKey: string): Promise<{ success: boolean; agents?: any[]; error?: string }> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, agents: data.agents || [] };
    } else {
      const errorText = await response.text();
      return { success: false, error: `Failed to list agents: ${response.status} ${errorText}` };
    }
  } catch (error: any) {
    return { success: false, error: `Network error: ${error.message}` };
  }
}

export async function GET(req: NextRequest) {
  console.log('🔍 [Diagnose Agent Creation] Endpoint called');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const results: any = {
      userId,
      userEmail: session.user.email,
      timestamp: new Date().toISOString(),
      steps: [],
      errors: [],
    };

    // Step 1: Check environment variable
    console.log('🔍 [Diagnose] Step 1: Checking environment variable...');
    results.steps.push({ step: 'check_env_var', status: 'running' });
    const envApiKey = process.env.ELEVENLABS_API_KEY;
    const hasEnvKey = !!envApiKey && envApiKey.trim() !== '';
    results.steps[results.steps.length - 1] = {
      step: 'check_env_var',
      status: hasEnvKey ? 'success' : 'error',
      data: {
        exists: hasEnvKey,
        preview: hasEnvKey ? `...${envApiKey.slice(-8)}` : 'NOT SET',
        length: envApiKey?.length || 0,
      },
    };
    results.envApiKey = {
      exists: hasEnvKey,
      preview: hasEnvKey ? `...${envApiKey.slice(-8)}` : null,
    };

    // Step 2: Check user-specific API keys
    console.log('🔍 [Diagnose] Step 2: Checking user-specific API keys...');
    results.steps.push({ step: 'check_user_keys', status: 'running' });
    const userKeys = await prisma.elevenLabsApiKey.findMany({
      where: { userId, isActive: true },
      select: { id: true, label: true, priority: true, isActive: true },
    });
    results.steps[results.steps.length - 1] = {
      step: 'check_user_keys',
      status: 'success',
      data: { count: userKeys.length, keys: userKeys },
    };
    results.userKeys = userKeys;

    // Step 3: Get active API key via key manager
    console.log('🔍 [Diagnose] Step 3: Getting active API key via key manager...');
    results.steps.push({ step: 'get_active_key', status: 'running' });
    let activeApiKey: string;
    try {
      activeApiKey = await elevenLabsKeyManager.getActiveApiKey(userId);
      results.steps[results.steps.length - 1] = {
        step: 'get_active_key',
        status: activeApiKey ? 'success' : 'error',
        data: {
          found: !!activeApiKey,
          preview: activeApiKey ? `...${activeApiKey.slice(-8)}` : 'NOT FOUND',
          length: activeApiKey?.length || 0,
          source: userKeys.length > 0 ? 'user-specific' : 'environment-variable',
        },
      };
      results.activeApiKey = {
        found: !!activeApiKey,
        preview: activeApiKey ? `...${activeApiKey.slice(-8)}` : null,
        source: userKeys.length > 0 ? 'user-specific' : 'environment-variable',
      };
    } catch (error: any) {
      results.steps[results.steps.length - 1] = {
        step: 'get_active_key',
        status: 'error',
        error: error.message,
      };
      results.errors.push(`Failed to get active API key: ${error.message}`);
      activeApiKey = '';
    }

    // Step 4: Test API key validity
    if (activeApiKey) {
      console.log('🔍 [Diagnose] Step 4: Testing API key validity...');
      results.steps.push({ step: 'test_api_key', status: 'running' });
      const keyTest = await testApiKey(activeApiKey);
      results.steps[results.steps.length - 1] = {
        step: 'test_api_key',
        status: keyTest.valid ? 'success' : 'error',
        data: keyTest,
      };
      results.apiKeyTest = keyTest;

      if (!keyTest.valid) {
        results.errors.push(`API key is invalid: ${keyTest.error}`);
      }
    } else {
      results.steps.push({
        step: 'test_api_key',
        status: 'skipped',
        reason: 'No API key available to test',
      });
      results.errors.push('No API key available - cannot test validity');
    }

    // Step 5: List existing agents in ElevenLabs
    if (activeApiKey && results.apiKeyTest?.valid) {
      console.log('🔍 [Diagnose] Step 5: Listing agents in ElevenLabs...');
      results.steps.push({ step: 'list_agents', status: 'running' });
      const agentsResult = await listAgents(activeApiKey);
      results.steps[results.steps.length - 1] = {
        step: 'list_agents',
        status: agentsResult.success ? 'success' : 'error',
        data: agentsResult,
      };
      results.elevenLabsAgents = agentsResult.agents || [];
    } else {
      results.steps.push({
        step: 'list_agents',
        status: 'skipped',
        reason: 'API key not available or invalid',
      });
    }

    // Step 6: Check database agents
    console.log('🔍 [Diagnose] Step 6: Checking database agents...');
    results.steps.push({ step: 'check_db_agents', status: 'running' });
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
      step: 'check_db_agents',
      status: 'success',
      data: { count: dbAgents.length, agents: dbAgents },
    };
    results.databaseAgents = dbAgents;

    // Step 7: Attempt to create a test agent
    if (activeApiKey && results.apiKeyTest?.valid) {
      console.log('🔍 [Diagnose] Step 7: Attempting to create test agent...');
      results.steps.push({ step: 'create_test_agent', status: 'running' });
      try {
        const createResult = await docpenAgentProvisioning.createAgent({
          userId,
          profession: 'GENERAL_PRACTICE',
          practitionerName: session.user.name || 'Test Doctor',
          clinicName: 'Test Clinic',
          voiceGender: 'neutral',
        });

        if (createResult.success && createResult.agentId) {
          results.steps[results.steps.length - 1] = {
            step: 'create_test_agent',
            status: 'success',
            agentId: createResult.agentId,
          };
          results.testAgentCreated = {
            success: true,
            agentId: createResult.agentId,
          };
        } else {
          results.steps[results.steps.length - 1] = {
            step: 'create_test_agent',
            status: 'error',
            error: createResult.error,
          };
          results.errors.push(`Failed to create test agent: ${createResult.error}`);
        }
      } catch (error: any) {
        results.steps[results.steps.length - 1] = {
          step: 'create_test_agent',
          status: 'error',
          error: error.message,
          stack: error.stack,
        };
        results.errors.push(`Exception creating test agent: ${error.message}`);
      }
    } else {
      results.steps.push({
        step: 'create_test_agent',
        status: 'skipped',
        reason: 'API key not available or invalid',
      });
    }

    // Summary
    results.summary = {
      hasApiKey: !!activeApiKey,
      apiKeyValid: results.apiKeyTest?.valid || false,
      canCreateAgents: !!activeApiKey && results.apiKeyTest?.valid,
      agentsInElevenLabs: results.elevenLabsAgents?.length || 0,
      agentsInDatabase: dbAgents.length,
      errors: results.errors.length,
    };

    console.log('✅ [Diagnose] Diagnosis complete:', results.summary);
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('❌ [Diagnose] Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
