#!/usr/bin/env tsx
/**
 * Test script to diagnose ElevenLabs agent creation issue
 * This will test the exact API payload structure
 */

import 'dotenv/config';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

if (!ELEVENLABS_API_KEY) {
  console.error('❌ ELEVENLABS_API_KEY not found in environment variables');
  process.exit(1);
}

console.log('🧪 Testing ElevenLabs Agent Creation API');
console.log('=' .repeat(60));
console.log('API Key:', ELEVENLABS_API_KEY.substring(0, 8) + '...');
console.log('');

// Test 1: Minimal payload (what ElevenLabs docs show)
async function testMinimalPayload() {
  console.log('\n📋 Test 1: Minimal Payload (ElevenLabs Docs Example)');
  console.log('-'.repeat(60));
  
  const minimalPayload = {
    conversation_config: {
      agent: {
        prompt: {
          prompt: "You are a helpful AI assistant for a test business."
        },
        first_message: "Hello! How can I help you today?",
        language: "en"
      }
    }
  };
  
  console.log('Payload:', JSON.stringify(minimalPayload, null, 2));
  
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalPayload),
    });
    
    console.log('\nResponse Status:', response.status, response.statusText);
    
    const responseData = await response.text();
    console.log('Response Body:', responseData);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Minimal payload works!');
      const data = JSON.parse(responseData);
      return data.agent_id;
    } else {
      console.log('❌ FAILED: Minimal payload rejected');
      return null;
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

// Test 2: Payload with name
async function testWithName() {
  console.log('\n📋 Test 2: Payload with Name');
  console.log('-'.repeat(60));
  
  const payloadWithName = {
    name: "Test Agent with Name",
    conversation_config: {
      agent: {
        prompt: {
          prompt: "You are a helpful AI assistant for a test business."
        },
        first_message: "Hello! How can I help you today?",
        language: "en"
      }
    }
  };
  
  console.log('Payload:', JSON.stringify(payloadWithName, null, 2));
  
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadWithName),
    });
    
    console.log('\nResponse Status:', response.status, response.statusText);
    
    const responseData = await response.text();
    console.log('Response Body:', responseData);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Payload with name works!');
      const data = JSON.parse(responseData);
      return data.agent_id;
    } else {
      console.log('❌ FAILED: Payload with name rejected');
      return null;
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

// Test 3: Full payload (like our app)
async function testFullPayload() {
  console.log('\n📋 Test 3: Full Payload (Like Production App)');
  console.log('-'.repeat(60));
  
  const fullPayload = {
    name: "Test Agent Full Config",
    conversation_config: {
      agent: {
        prompt: {
          prompt: "You are a helpful AI assistant for a test business."
        },
        first_message: "Hello! How can I help you today?",
        language: "en"
      },
      tts: {
        voice_id: "EXAVITQu4vr4xnSDxMaL",
        stability: 0.5,
        similarity_boost: 0.75,
        optimize_streaming_latency: 3
      },
      conversation: {
        max_duration_seconds: 1800
      },
      asr: {
        quality: "standard"
      }
    },
    platform_settings: {
      widget_enabled: true
    }
  };
  
  console.log('Payload:', JSON.stringify(fullPayload, null, 2));
  
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/create`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fullPayload),
    });
    
    console.log('\nResponse Status:', response.status, response.statusText);
    
    const responseData = await response.text();
    console.log('Response Body:', responseData);
    
    if (response.ok) {
      console.log('✅ SUCCESS: Full payload works!');
      const data = JSON.parse(responseData);
      return data.agent_id;
    } else {
      console.log('❌ FAILED: Full payload rejected');
      return null;
    }
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
    return null;
  }
}

// Test 4: Check subscription and list agents
async function checkSubscriptionAndAgents() {
  console.log('\n📋 Test 4: Check Subscription & Existing Agents');
  console.log('-'.repeat(60));
  
  try {
    // Check subscription
    console.log('\n1️⃣ Checking subscription...');
    const subResponse = await fetch(`${ELEVENLABS_BASE_URL}/user/subscription`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    
    if (subResponse.ok) {
      const subData = await subResponse.json();
      console.log('   Tier:', subData.tier);
      console.log('   Status:', subData.status);
      console.log('   Character Limit:', subData.character_limit);
      console.log('   Can use phone numbers:', subData.tier !== 'free');
    } else {
      console.log('   ⚠️ Could not fetch subscription');
    }
    
    // List existing agents
    console.log('\n2️⃣ Listing existing agents...');
    const agentsResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY },
    });
    
    if (agentsResponse.ok) {
      const agentsData = await agentsResponse.json();
      const agents = agentsData.agents || [];
      console.log(`   Found ${agents.length} existing agent(s)`);
      agents.forEach((agent: any, idx: number) => {
        console.log(`   ${idx + 1}. ${agent.name || 'Unnamed'} (ID: ${agent.agent_id || agent.id})`);
      });
    } else {
      console.log('   ⚠️ Could not fetch agents list');
    }
    
  } catch (error: any) {
    console.log('❌ ERROR:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  try {
    await checkSubscriptionAndAgents();
    
    const agentId1 = await testMinimalPayload();
    const agentId2 = await testWithName();
    const agentId3 = await testFullPayload();
    
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log('Test 1 (Minimal):', agentId1 ? `✅ SUCCESS (ID: ${agentId1})` : '❌ FAILED');
    console.log('Test 2 (With Name):', agentId2 ? `✅ SUCCESS (ID: ${agentId2})` : '❌ FAILED');
    console.log('Test 3 (Full Config):', agentId3 ? `✅ SUCCESS (ID: ${agentId3})` : '❌ FAILED');
    
    console.log('\n💡 RECOMMENDATION:');
    if (agentId1) {
      console.log('   Use the minimal payload structure that worked.');
    } else if (agentId2) {
      console.log('   Use the payload with name that worked.');
    } else if (agentId3) {
      console.log('   Use the full payload structure that worked.');
    } else {
      console.log('   All tests failed. Check your ElevenLabs API key and subscription.');
      console.log('   Make sure you have at least the Starter plan ($10/month) for phone features.');
    }
    console.log('');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error running tests:', error);
    process.exit(1);
  }
}

runAllTests();
