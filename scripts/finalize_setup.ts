import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function finalizeSetup() {
  const phoneNumber = '+13605022136';
  const phoneSid = 'PN2edd99727af7a9f9b71d66c4bc2a6c7f';
  const userId = 'cmif7bcow0000tkxtz7wh8c5o';
  
  console.log('🔧 Finalizing Sarah Agent Setup...\n');

  // Step 1: Update voice agent with phone number
  console.log('Step 1: Updating voice agent with phone number...');
  
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      name: 'Sarah',
      userId: userId
    }
  });

  if (!agent) {
    console.log('❌ Sarah agent not found');
    return;
  }

  await prisma.voiceAgent.update({
    where: { id: agent.id },
    data: {
      twilioPhoneNumber: phoneNumber,
      status: 'ACTIVE'
    }
  });

  console.log('✅ Voice agent updated');

  // Step 2: Add to PurchasedPhoneNumber table
  console.log('\nStep 2: Recording phone number purchase...');
  
  const existingPhone = await prisma.purchasedPhoneNumber.findFirst({
    where: {
      phoneNumber: phoneNumber
    }
  });

  if (!existingPhone) {
    await prisma.purchasedPhoneNumber.create({
      data: {
        userId: userId,
        phoneNumber: phoneNumber,
        twilioSid: phoneSid,
        friendlyName: 'Sarah Voice Agent',
        country: 'US',
        status: 'active',
        capabilities: {
          voice: true,
          sms: true,
          mms: false
        }
      }
    });
    console.log('✅ Phone number recorded in database');
  } else {
    console.log('✅ Phone number already in database');
  }

  // Step 3: Verify Twilio webhook configuration
  console.log('\nStep 3: Verifying Twilio webhook...');
  
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  const checkRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers/${phoneSid}.json`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      }
    }
  );

  if (!checkRes.ok) {
    console.log('⚠️  Could not verify webhook configuration');
  } else {
    const phoneData = await checkRes.json() as any;
    console.log(`✅ Webhook configured: ${phoneData.voice_url || 'Not set'}`);
    
    if (phoneData.voice_url !== 'https://soshogleagents.com/api/twilio/voice-callback') {
      console.log('⚠️  Webhook URL may need updating');
      console.log(`   Expected: https://soshogleagents.com/api/twilio/voice-callback`);
      console.log(`   Current: ${phoneData.voice_url}`);
    }
  }

  console.log('\n\n✅ SETUP COMPLETE!');
  console.log('\n📋 Sarah Agent Configuration:');
  console.log(`   Name: Sarah`);
  console.log(`   Business: Pharmacy Owner`);
  console.log(`   Database ID: ${agent.id}`);
  console.log(`   ElevenLabs Agent ID: ${agent.elevenLabsAgentId}`);
  console.log(`   Phone Number: ${phoneNumber}`);
  console.log(`   Twilio SID: ${phoneSid}`);
  console.log(`   Status: ${agent.status}`);
  console.log(`   Voice: Sarah (${agent.voiceId})`);
  
  console.log('\n🎯 Webhook Configuration:');
  console.log(`   URL: https://soshogleagents.com/api/twilio/voice-callback`);
  console.log(`   Method: POST`);
  
  console.log('\n🧪 HOW TO TEST:');
  console.log(`   1. Call ${phoneNumber}`);
  console.log(`   2. Wait for Sarah's greeting`);
  console.log(`   3. Try these test phrases:`);
  console.log(`      - "What are your pharmacy hours?"`);
  console.log(`      - "I need to refill my prescription"`);
  console.log(`      - "Do you have information about medication X?"`);
  
  console.log('\n💡 TROUBLESHOOTING:');
  console.log('   If you get an error when calling:');
  console.log('   1. Check that the webhook URL is correctly set in Twilio');
  console.log('   2. Verify the app is deployed at soshogleagents.com');
  console.log('   3. Check the /api/twilio/voice-callback endpoint is working');
  console.log('   4. Review logs at: https://console.twilio.com/us1/monitor/logs/debugger');
  
  console.log('\n📊 Monitoring:');
  console.log('   - Twilio Logs: https://console.twilio.com/us1/monitor/logs/debugger');
  console.log('   - ElevenLabs Dashboard: https://elevenlabs.io/app/conversational-ai');
  console.log('   - App Database: Check CallLog table for call records');
}

finalizeSetup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
