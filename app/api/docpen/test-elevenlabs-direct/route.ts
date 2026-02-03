/**
 * Direct ElevenLabs API Test Endpoint
 * 
 * Tests ElevenLabs API connection and agent creation directly
 * Bypasses all application logic to isolate the issue
 * 
 * GET /api/docpen/test-elevenlabs-direct
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  console.log('🔍 [Direct ElevenLabs Test] Endpoint called');
  
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: any = {
      userId: session.user.id,
      userEmail: session.user.email,
      timestamp: new Date().toISOString(),
      tests: [],
      errors: [],
    };

    // Get API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    
    if (!apiKey) {
      results.errors.push('ELEVENLABS_API_KEY not found in environment variables');
      return NextResponse.json(results, { status: 200 });
    }
    
    results.apiKey = {
      found: true,
      preview: `...${apiKey.slice(-8)}`,
      length: apiKey.length,
    };

    // Test 1: Verify API key with /user endpoint
    console.log('📋 Test 1: Verify API Key (GET /user)');
    try {
      const userResponse = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });
      
      const test1: any = {
        name: 'Verify API Key',
        endpoint: `${ELEVENLABS_BASE_URL}/user`,
        method: 'GET',
        status: userResponse.status,
        statusText: userResponse.statusText,
        headers: Object.fromEntries(userResponse.headers.entries()),
      };
      
      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        test1.error = errorText;
        results.errors.push(`API key is INVALID: ${userResponse.status} ${errorText}`);
      } else {
        const userData = await userResponse.json();
        test1.success = true;
        test1.userInfo = {
          firstName: userData.first_name,
          lastName: userData.last_name,
          email: userData.email,
          subscription: userData.subscription?.tier,
        };
      }
      
      results.tests.push(test1);
    } catch (error: any) {
      results.tests.push({
        name: 'Verify API Key',
        error: `Network error: ${error.message}`,
      });
      results.errors.push(`Network error: ${error.message}`);
    }

    // Test 2: List existing agents
    console.log('📋 Test 2: List Existing Agents');
    try {
      const listResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });
      
      const test2: any = {
        name: 'List Agents',
        endpoint: `${ELEVENLABS_BASE_URL}/convai/agents`,
        method: 'GET',
        status: listResponse.status,
        statusText: listResponse.statusText,
      };
      
      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        test2.error = errorText;
        results.errors.push(`Failed to list agents: ${listResponse.status} ${errorText}`);
      } else {
        const agentsData = await listResponse.json();
        const agents = agentsData.agents || [];
        test2.success = true;
        test2.agentCount = agents.length;
        test2.agents = agents.slice(0, 10).map((a: any) => ({
          id: a.agent_id,
          name: a.name,
          created: a.created_at,
        }));
      }
      
      results.tests.push(test2);
    } catch (error: any) {
      results.tests.push({
        name: 'List Agents',
        error: `Network error: ${error.message}`,
      });
      results.errors.push(`Network error: ${error.message}`);
    }

    // Test 3: Create a test agent
    console.log('📋 Test 3: Create Test Agent');
    const testAgentPayload = {
      name: `Docpen Test Agent - ${new Date().toISOString()}`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: 'You are a helpful medical assistant. Respond briefly and professionally.',
          },
          first_message: 'Hello! I\'m your Docpen test assistant. How can I help you today?',
          language: 'en',
        },
        tts: {
          voice_id: 'FGY2WhTYpPnrIDTdsKH5', // Laura - neutral, clear
          stability: 0.6,
          similarity_boost: 0.8,
          optimize_streaming_latency: 3,
        },
        conversation: {
          max_duration_seconds: 3600,
        },
        asr: {
          quality: 'high',
        },
      },
      platform_settings: {
        widget_enabled: true,
      },
      tools: [],
    };
    
    try {
      const createResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testAgentPayload),
      });
      
      const test3: any = {
        name: 'Create Test Agent',
        endpoint: `${ELEVENLABS_BASE_URL}/convai/agents/create`,
        method: 'POST',
        status: createResponse.status,
        statusText: createResponse.statusText,
        headers: Object.fromEntries(createResponse.headers.entries()),
        payload: testAgentPayload,
      };
      
      const responseText = await createResponse.text();
      test3.responseBody = responseText;
      
      if (!createResponse.ok) {
        test3.error = responseText;
        results.errors.push(`Failed to create agent: ${createResponse.status} ${responseText}`);
        
        // Try to parse error
        try {
          test3.parsedError = JSON.parse(responseText);
        } catch {
          // Not JSON
        }
      } else {
        try {
          const result = JSON.parse(responseText);
          const agentId = result.agent_id;
          
          if (!agentId) {
            test3.error = 'No agent_id in response';
            test3.fullResponse = result;
            results.errors.push('Agent created but no agent_id in response');
          } else {
            test3.success = true;
            test3.agentId = agentId;
            test3.agentName = testAgentPayload.name;
            test3.dashboardUrl = `https://elevenlabs.io/app/agents/${agentId}`;
            
            // Test 4: Verify the created agent exists
            try {
              const verifyResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
                headers: {
                  'xi-api-key': apiKey,
                },
              });
              
              test3.verification = {
                status: verifyResponse.status,
                statusText: verifyResponse.statusText,
                success: verifyResponse.ok,
              };
              
              if (verifyResponse.ok) {
                const agentData = await verifyResponse.json();
                test3.verification.agentData = {
                  name: agentData.name,
                  created: agentData.created_at,
                };
              } else {
                const errorText = await verifyResponse.text();
                test3.verification.error = errorText;
              }
            } catch (verifyError: any) {
              test3.verification = {
                error: `Verification error: ${verifyError.message}`,
              };
            }
          }
        } catch (parseError: any) {
          test3.error = `Failed to parse response: ${parseError.message}`;
          results.errors.push(`Failed to parse response: ${parseError.message}`);
        }
      }
      
      results.tests.push(test3);
    } catch (error: any) {
      results.tests.push({
        name: 'Create Test Agent',
        error: `Network error: ${error.message}`,
        stack: error.stack,
      });
      results.errors.push(`Network error: ${error.message}`);
    }

    // Summary
    results.summary = {
      apiKeyFound: !!apiKey,
      testsRun: results.tests.length,
      testsPassed: results.tests.filter((t: any) => t.success).length,
      testsFailed: results.tests.filter((t: any) => !t.success && t.error).length,
      errors: results.errors.length,
      canCreateAgents: results.tests.some((t: any) => t.name === 'Create Test Agent' && t.success),
    };

    console.log('✅ [Direct ElevenLabs Test] Complete:', results.summary);
    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('❌ [Direct ElevenLabs Test] Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
      stack: error.stack,
    }, { status: 500 });
  }
}
