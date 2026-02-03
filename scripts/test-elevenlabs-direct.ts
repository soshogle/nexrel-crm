/**
 * Direct ElevenLabs API Test Script
 * 
 * Tests ElevenLabs API connection and agent creation directly
 * Bypasses all application logic to isolate the issue
 */

import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
dotenv.config({ path: join(process.cwd(), '.env.local') });
dotenv.config({ path: join(process.cwd(), '.env') });

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function testElevenLabsConnection() {
  console.log('🔍 Testing ElevenLabs API Connection\n');
  console.log('=' .repeat(60));
  
  // Get API key
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
    console.log('\nPlease set ELEVENLABS_API_KEY in your .env.local file');
    process.exit(1);
  }
  
  console.log(`✅ Found API key: ...${apiKey.slice(-8)}`);
  console.log(`   Full key length: ${apiKey.length} characters\n`);
  
  // Test 1: Verify API key with /user endpoint
  console.log('📋 Test 1: Verify API Key (GET /user)');
  console.log('-'.repeat(60));
  try {
    const userResponse = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });
    
    console.log(`   Status: ${userResponse.status} ${userResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(userResponse.headers.entries()));
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error(`   ❌ API key is INVALID!`);
      console.error(`   Error: ${errorText}`);
      process.exit(1);
    }
    
    const userData = await userResponse.json();
    console.log(`   ✅ API key is VALID!`);
    console.log(`   User: ${userData.first_name || 'Unknown'} ${userData.last_name || ''}`);
    console.log(`   Email: ${userData.email || 'N/A'}`);
    console.log(`   Subscription: ${userData.subscription?.tier || 'N/A'}`);
    console.log('');
  } catch (error: any) {
    console.error(`   ❌ Network error: ${error.message}`);
    process.exit(1);
  }
  
  // Test 2: List existing agents
  console.log('📋 Test 2: List Existing Agents (GET /convai/agents)');
  console.log('-'.repeat(60));
  try {
    const listResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });
    
    console.log(`   Status: ${listResponse.status} ${listResponse.statusText}`);
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error(`   ❌ Failed to list agents!`);
      console.error(`   Error: ${errorText}`);
    } else {
      const agentsData = await listResponse.json();
      const agents = agentsData.agents || [];
      console.log(`   ✅ Found ${agents.length} existing agent(s)`);
      if (agents.length > 0) {
        console.log(`   Recent agents:`);
        agents.slice(0, 5).forEach((agent: any, idx: number) => {
          console.log(`     ${idx + 1}. ${agent.name || 'Unnamed'} (${agent.agent_id})`);
        });
      }
    }
    console.log('');
  } catch (error: any) {
    console.error(`   ❌ Network error: ${error.message}`);
  }
  
  // Test 3: Create a test agent
  console.log('📋 Test 3: Create Test Agent (POST /convai/agents/create)');
  console.log('-'.repeat(60));
  
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
  
  console.log(`   Payload:`, JSON.stringify(testAgentPayload, null, 2));
  console.log(`   Endpoint: ${ELEVENLABS_BASE_URL}/convai/agents/create`);
  console.log(`   Method: POST`);
  console.log(`   Headers: xi-api-key: ...${apiKey.slice(-8)}`);
  console.log('');
  
  try {
    const createResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAgentPayload),
    });
    
    console.log(`   Status: ${createResponse.status} ${createResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(createResponse.headers.entries()));
    
    const responseText = await createResponse.text();
    console.log(`   Response body:`, responseText);
    
    if (!createResponse.ok) {
      console.error(`   ❌ Failed to create agent!`);
      console.error(`   Status: ${createResponse.status}`);
      console.error(`   Response: ${responseText}`);
      
      // Try to parse error
      try {
        const errorJson = JSON.parse(responseText);
        console.error(`   Parsed error:`, JSON.stringify(errorJson, null, 2));
      } catch {
        // Not JSON
      }
      
      process.exit(1);
    }
    
    const result = JSON.parse(responseText);
    const agentId = result.agent_id;
    
    if (!agentId) {
      console.error(`   ❌ No agent_id in response!`);
      console.error(`   Full response:`, JSON.stringify(result, null, 2));
      process.exit(1);
    }
    
    console.log(`   ✅ Agent created successfully!`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Agent Name: ${testAgentPayload.name}`);
    console.log(`   Dashboard URL: https://elevenlabs.io/app/agents/${agentId}`);
    console.log('');
    
    // Test 4: Verify the created agent exists
    console.log('📋 Test 4: Verify Created Agent (GET /convai/agents/{agentId})');
    console.log('-'.repeat(60));
    
    try {
      const verifyResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
        headers: {
          'xi-api-key': apiKey,
        },
      });
      
      console.log(`   Status: ${verifyResponse.status} ${verifyResponse.statusText}`);
      
      if (verifyResponse.ok) {
        const agentData = await verifyResponse.json();
        console.log(`   ✅ Agent verified!`);
        console.log(`   Name: ${agentData.name || 'N/A'}`);
        console.log(`   Created: ${agentData.created_at || 'N/A'}`);
      } else {
        const errorText = await verifyResponse.text();
        console.error(`   ⚠️ Agent created but verification failed: ${errorText}`);
      }
    } catch (error: any) {
      console.error(`   ⚠️ Verification error: ${error.message}`);
    }
    
    console.log('');
    console.log('=' .repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log(`\n📝 Summary:`);
    console.log(`   - API key is valid`);
    console.log(`   - Agent creation works`);
    console.log(`   - Created agent ID: ${agentId}`);
    console.log(`\n💡 If this test works but your app doesn't, the issue is in:`);
    console.log(`   1. How the API key is retrieved in your app`);
    console.log(`   2. The payload structure being sent`);
    console.log(`   3. Network/CORS issues in Vercel`);
    console.log(`   4. Environment variable configuration in Vercel`);
    
  } catch (error: any) {
    console.error(`   ❌ Network/Request error: ${error.message}`);
    console.error(`   Stack:`, error.stack);
    process.exit(1);
  }
}

// Run the test
testElevenLabsConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
