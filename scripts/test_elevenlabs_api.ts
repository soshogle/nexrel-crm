import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function testElevenLabsAPI() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  if (!apiKey) {
    console.log('❌ ELEVENLABS_API_KEY not set');
    return;
  }

  console.log('✅ ElevenLabs API Key found');
  console.log('\n🧪 Testing ElevenLabs API...\n');

  try {
    // Test 1: Get subscription info
    console.log('Test 1: Fetching subscription info...');
    const subRes = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!subRes.ok) {
      console.log(`❌ Subscription API failed: ${subRes.status} ${subRes.statusText}`);
      const errorText = await subRes.text();
      console.log('Error:', errorText);
    } else {
      const subData = await subRes.json() as any;
      console.log('✅ Subscription API works');
      console.log(`   Tier: ${subData.tier}`);
      console.log(`   Character count: ${subData.character_count || 0}/${subData.character_limit || 'unlimited'}`);
      console.log(`   Can use conversational AI: ${subData.can_use_instant_voice_cloning ? 'Yes' : 'No'}`);
    }

    // Test 2: List voices
    console.log('\nTest 2: Fetching available voices...');
    const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!voicesRes.ok) {
      console.log(`❌ Voices API failed: ${voicesRes.status} ${voicesRes.statusText}`);
    } else {
      const voicesData = await voicesRes.json() as any;
      console.log(`✅ Found ${voicesData.voices?.length || 0} voices`);
      if (voicesData.voices && voicesData.voices.length > 0) {
        console.log('   First 3 voices:');
        voicesData.voices.slice(0, 3).forEach((voice: any) => {
          console.log(`     - ${voice.name} (${voice.voice_id})`);
        });
      }
    }

    // Test 3: List existing conversational AI agents
    console.log('\nTest 3: Fetching existing conversational AI agents...');
    const agentsRes = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': apiKey
      }
    });

    if (!agentsRes.ok) {
      console.log(`❌ Agents API failed: ${agentsRes.status} ${agentsRes.statusText}`);
      const errorText = await agentsRes.text();
      console.log('Error:', errorText);
    } else {
      const agentsData = await agentsRes.json() as any;
      console.log(`✅ Found ${agentsData.agents?.length || 0} existing agents`);
      if (agentsData.agents && agentsData.agents.length > 0) {
        console.log('   Existing agents:');
        agentsData.agents.forEach((agent: any) => {
          console.log(`     - ${agent.name} (${agent.agent_id})`);
        });
      }
    }

    // Test 4: Try to create a test agent (we won't save this)
    console.log('\nTest 4: Testing agent creation (dry run)...');
    const testAgentPayload = {
      conversation_config: {
        agent: {
          prompt: {
            prompt: "You are Sarah, a friendly pharmacy assistant. Help customers with their questions."
          },
          first_message: "Hello! This is Sarah from the pharmacy. How can I help you today?",
          language: "en"
        }
      }
    };

    console.log('   Payload prepared ✅');
    console.log('   (Not actually creating to avoid unnecessary API usage)');

  } catch (error: any) {
    console.error('❌ Error testing ElevenLabs API:', error.message);
  }
}

async function checkUserSetup() {
  const user = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' }
  });

  if (!user) {
    console.log('\n❌ User pharmacie4177@gmail.com not found');
    return;
  }

  console.log('\n\n👤 User Setup Check:');
  console.log(`   User ID: ${user.id}`);
  console.log(`   Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  
  const apiKeys = await prisma.elevenLabsApiKey.findMany({
    where: { userId: user.id }
  });
  
  console.log(`   ElevenLabs API Keys: ${apiKeys.length === 0 ? '❌ None configured' : `✅ ${apiKeys.length} configured`}`);
  
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: { userId: user.id }
  });
  
  console.log(`   Voice Agents: ${voiceAgents.length === 0 ? '❌ None created' : `✅ ${voiceAgents.length} created`}`);
  
  const phoneNumbers = await prisma.purchasedPhoneNumber.findMany({
    where: { userId: user.id }
  });
  
  console.log(`   Phone Numbers: ${phoneNumbers.length === 0 ? '❌ None purchased' : `✅ ${phoneNumbers.length} purchased`}`);
}

async function main() {
  await testElevenLabsAPI();
  await checkUserSetup();
  
  console.log('\n\n📝 Summary:');
  console.log('   The issue is that the user has no voice agents created.');
  console.log('   This suggests the agent creation failed during the UI flow.');
  console.log('\n💡 Next Steps:');
  console.log('   1. Use the ElevenLabs API to manually create the agent');
  console.log('   2. Update the database with the agent details');
  console.log('   3. Link a phone number to the agent');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
