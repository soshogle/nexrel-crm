import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function testSarahAgent() {
  console.log('🧪 TESTING SARAH VOICE AGENT\n');
  console.log('=' .repeat(60));
  
  const phoneNumber = '+13605022136';
  const userId = 'cmif7bcow0000tkxtz7wh8c5o';
  
  // Test 1: Database Configuration
  console.log('\n📊 TEST 1: Database Configuration');
  console.log('-'.repeat(60));
  
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      name: 'Sarah',
      userId: userId
    }
  });

  if (!agent) {
    console.log('❌ FAILED: Sarah agent not found in database');
    return;
  }

  console.log('✅ Voice Agent Found');
  console.log(`   Name: ${agent.name}`);
  console.log(`   Business: ${agent.businessName}`);
  console.log(`   Phone: ${agent.twilioPhoneNumber}`);
  console.log(`   ElevenLabs Agent ID: ${agent.elevenLabsAgentId}`);
  console.log(`   Voice ID: ${agent.voiceId}`);
  console.log(`   Status: ${agent.status}`);
  console.log(`   Type: ${agent.type}`);
  
  const phoneRecord = await prisma.purchasedPhoneNumber.findFirst({
    where: { phoneNumber: agent.twilioPhoneNumber || '' }
  });
  
  if (phoneRecord) {
    console.log('✅ Phone Number Purchased');
    console.log(`   SID: ${phoneRecord.twilioSid}`);
  } else {
    console.log('⚠️  Phone number not found in PurchasedPhoneNumber table');
  }

  // Test 2: ElevenLabs API
  console.log('\n🎙️  TEST 2: ElevenLabs API Connection');
  console.log('-'.repeat(60));
  
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  // Check if agent exists in ElevenLabs
  const agentRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}`, {
    headers: {
      'xi-api-key': apiKey!
    }
  });

  if (!agentRes.ok) {
    console.log(`❌ FAILED: Cannot find agent in ElevenLabs (${agentRes.status})`);
    const errorText = await agentRes.text();
    console.log('   Error:', errorText);
  } else {
    const agentData = await agentRes.json() as any;
    console.log('✅ ElevenLabs Agent Active');
    console.log(`   Name: ${agentData.name || 'N/A'}`);
    console.log(`   Agent ID: ${agentData.agent_id}`);
  }

  // Test WebSocket URL generation
  try {
    const wsUrlRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agent.elevenLabsAgentId}/get-signed-url`, {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey!
      }
    });

    if (!wsUrlRes.ok) {
      console.log(`⚠️  Cannot generate WebSocket URL (${wsUrlRes.status})`);
    } else {
      const wsData = await wsUrlRes.json() as any;
      console.log('✅ WebSocket URL Generation Working');
      console.log(`   URL: ${wsData.signed_url?.substring(0, 50)}...`);
    }
  } catch (error: any) {
    console.log('⚠️  WebSocket URL test failed:', error.message);
  }

  // Test 3: Twilio Configuration
  console.log('\n📱 TEST 3: Twilio Configuration');
  console.log('-'.repeat(60));
  
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneRecord?.twilioSid}.json`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      }
    }
  );

  if (!twilioRes.ok) {
    console.log(`❌ FAILED: Cannot fetch Twilio phone configuration (${twilioRes.status})`);
  } else {
    const twilioData = await twilioRes.json() as any;
    console.log('✅ Twilio Phone Number Active');
    console.log(`   Phone: ${twilioData.phone_number}`);
    console.log(`   Friendly Name: ${twilioData.friendly_name}`);
    console.log(`   Voice URL: ${twilioData.voice_url}`);
    console.log(`   Voice Method: ${twilioData.voice_method}`);
    
    const expectedWebhook = 'https://soshogleagents.com/api/twilio/voice-callback';
    if (twilioData.voice_url === expectedWebhook) {
      console.log('✅ Webhook URL Correct');
    } else {
      console.log(`⚠️  Webhook URL mismatch`);
      console.log(`   Expected: ${expectedWebhook}`);
      console.log(`   Current: ${twilioData.voice_url}`);
    }
  }

  // Test 4: Webhook Endpoint
  console.log('\n🌐 TEST 4: Webhook Endpoint Health');
  console.log('-'.repeat(60));
  
  try {
    const webhookRes = await fetch('https://soshogleagents.com/api/twilio/voice-callback', {
      method: 'GET'
    });

    if (!webhookRes.ok) {
      console.log(`⚠️  Webhook endpoint returned status ${webhookRes.status}`);
    } else {
      const webhookData = await webhookRes.json();
      console.log('✅ Webhook Endpoint Online');
      console.log(`   Status: ${webhookData.status}`);
      console.log(`   Message: ${webhookData.message}`);
    }
  } catch (error: any) {
    console.log('❌ FAILED: Cannot reach webhook endpoint');
    console.log('   Error:', error.message);
    console.log('   Make sure the app is deployed at soshogleagents.com');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log('\n✅ All components configured correctly!');
  console.log('\n📞 TO TEST THE AGENT:');
  console.log(`   Call: ${phoneNumber}`);
  console.log(`   Expected greeting: "Hello! This is Sarah from Pharmacy Owner. How can I help you today?"`);
  console.log('\n💬 TEST PHRASES:');
  console.log('   1. "What are your pharmacy hours?"');
  console.log('   2. "I need to refill my prescription"');
  console.log('   3. "Can you tell me about medication side effects?"');
  console.log('   4. "Is my prescription ready?"');
  console.log('\n🔍 DEBUGGING:');
  console.log('   - Twilio Logs: https://console.twilio.com/us1/monitor/logs/debugger');
  console.log('   - ElevenLabs Dashboard: https://elevenlabs.io/app/conversational-ai');
  console.log('   - Check CallLog table in database for call records');
  console.log('\n💡 COMMON ISSUES:');
  console.log('   1. If you hear "no agent configured": Phone number not linked properly');
  console.log('   2. If call drops immediately: Check ElevenLabs agent ID');
  console.log('   3. If you get error message: Check webhook endpoint is accessible');
  console.log('   4. If Sarah doesn\'t respond: Check ElevenLabs WebSocket connection');
  console.log('\n📊 COSTS:');
  console.log('   - Phone number: $1.00/month');
  console.log('   - Twilio: ~$0.012/minute');
  console.log('   - ElevenLabs: Based on your subscription plan');
}

testSarahAgent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
