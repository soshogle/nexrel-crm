#!/usr/bin/env tsx
/**
 * Test script to diagnose and fix Docpen agent creation issues
 * 
 * This script will:
 * 1. Force create a new test agent in ElevenLabs
 * 2. Verify it exists in ElevenLabs
 * 3. List all agents in ElevenLabs to see what's actually there
 * 4. Check database records vs ElevenLabs reality
 */

import 'dotenv/config';
import { prisma } from '../lib/db';
import { docpenAgentProvisioning } from '../lib/docpen/agent-provisioning';
import { elevenLabsKeyManager } from '../lib/elevenlabs-key-manager';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function getApiKey(userId: string): Promise<string | null> {
  const apiKey = await elevenLabsKeyManager.getActiveApiKey(userId);
  return apiKey || process.env.ELEVENLABS_API_KEY || null;
}

async function listAllElevenLabsAgents(apiKey: string) {
  console.log('\n📋 Listing ALL agents in ElevenLabs...');
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to list agents: ${response.status} ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Found ${data.agents?.length || 0} agents in ElevenLabs:\n`);
    
    if (data.agents && data.agents.length > 0) {
      data.agents.forEach((agent: any, index: number) => {
        console.log(`${index + 1}. ${agent.name || 'Unnamed'}`);
        console.log(`   ID: ${agent.agent_id}`);
        console.log(`   Created: ${agent.created_at || 'Unknown'}`);
        console.log(`   Status: ${agent.status || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('   (No agents found)');
    }

    return data.agents || [];
  } catch (error: any) {
    console.error('❌ Error listing agents:', error.message);
    return [];
  }
}

async function verifyAgentExists(agentId: string, apiKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });

    if (response.ok) {
      const agent = await response.json();
      console.log(`✅ Agent ${agentId} EXISTS in ElevenLabs`);
      console.log(`   Name: ${agent.name || 'Unnamed'}`);
      console.log(`   Status: ${agent.status || 'Unknown'}`);
      return true;
    } else if (response.status === 404) {
      console.log(`❌ Agent ${agentId} NOT FOUND in ElevenLabs (404)`);
      return false;
    } else {
      const error = await response.text();
      console.log(`⚠️ Error checking agent ${agentId}: ${response.status} ${error}`);
      return false;
    }
  } catch (error: any) {
    console.error(`❌ Network error checking agent ${agentId}:`, error.message);
    return false;
  }
}

async function testAgentCreation() {
  console.log('🧪 Docpen Agent Creation Test');
  console.log('='.repeat(60));
  console.log('');

  // Get a test user (first user in database)
  const testUser = await prisma.user.findFirst({
    where: { role: { not: 'SUPER_ADMIN' } },
    select: { id: true, email: true, name: true },
  });

  if (!testUser) {
    console.error('❌ No test user found in database');
    process.exit(1);
  }

  console.log(`👤 Using test user: ${testUser.email} (${testUser.name})`);
  console.log(`   User ID: ${testUser.id}`);
  console.log('');

  // Get API key
  const apiKey = await getApiKey(testUser.id);
  if (!apiKey) {
    console.error('❌ No ElevenLabs API key found (neither user-specific nor environment variable)');
    process.exit(1);
  }

  console.log(`🔑 Using API key: ...${apiKey.slice(-8)}`);
  console.log('');

  // Step 1: List all existing agents in ElevenLabs
  const elevenLabsAgents = await listAllElevenLabsAgents(apiKey);

  // Step 2: Check database records
  console.log('📊 Checking database records...');
  const dbAgents = await prisma.docpenVoiceAgent.findMany({
    where: { userId: testUser.id, isActive: true },
    select: {
      id: true,
      profession: true,
      customProfession: true,
      elevenLabsAgentId: true,
      createdAt: true,
    },
  });

  console.log(`✅ Found ${dbAgents.length} agents in database:\n`);
  dbAgents.forEach((agent, index) => {
    console.log(`${index + 1}. Profession: ${agent.profession}${agent.customProfession ? ` (${agent.customProfession})` : ''}`);
    console.log(`   DB ID: ${agent.id}`);
    console.log(`   ElevenLabs ID: ${agent.elevenLabsAgentId}`);
    console.log(`   Created: ${agent.createdAt}`);
    console.log('');
  });

  // Step 3: Verify each database agent exists in ElevenLabs
  console.log('🔍 Verifying database agents exist in ElevenLabs...\n');
  for (const dbAgent of dbAgents) {
    const exists = await verifyAgentExists(dbAgent.elevenLabsAgentId, apiKey);
    if (!exists) {
      console.log(`⚠️ Database record exists but agent missing from ElevenLabs!`);
      console.log(`   This agent should be recreated.\n`);
    }
  }

  // Step 4: Force create a NEW test agent (bypassing getOrCreateAgent)
  console.log('🚀 FORCE CREATING a new test agent...\n');
  
  const testConfig = {
    userId: testUser.id,
    profession: 'GENERAL_PRACTICE' as const,
    practitionerName: testUser.name || 'Test Doctor',
    clinicName: 'Test Clinic',
    voiceGender: 'neutral' as const,
  };

  console.log('Creating agent with config:', testConfig);
  console.log('');

  const result = await docpenAgentProvisioning.createAgent(testConfig);

  if (!result.success) {
    console.error('❌ Failed to create agent:', result.error);
    process.exit(1);
  }

  if (!result.agentId) {
    console.error('❌ Agent created but no agentId returned');
    process.exit(1);
  }

  console.log(`✅ Agent created successfully!`);
  console.log(`   Agent ID: ${result.agentId}`);
  console.log('');

  // Step 5: Verify the new agent exists in ElevenLabs
  console.log('🔍 Verifying new agent exists in ElevenLabs...\n');
  const newAgentExists = await verifyAgentExists(result.agentId, apiKey);

  if (newAgentExists) {
    console.log('\n✅ SUCCESS! New agent was created and verified in ElevenLabs.');
    console.log(`\n📝 Next steps:`);
    console.log(`   1. Check ElevenLabs dashboard: https://elevenlabs.io/app/agents/agents`);
    console.log(`   2. Look for agent ID: ${result.agentId}`);
    console.log(`   3. The agent should appear in your ElevenLabs account`);
  } else {
    console.log('\n❌ FAILED! Agent was created but not found in ElevenLabs.');
    console.log('   This indicates an API issue or the agent was created in a different account.');
  }

  // Step 6: List agents again to see the new one
  console.log('\n📋 Listing agents again to confirm new agent...\n');
  await listAllElevenLabsAgents(apiKey);
}

// Run the test
testAgentCreation()
  .then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
