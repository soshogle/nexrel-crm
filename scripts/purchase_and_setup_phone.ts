import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function purchaseAndSetupPhone() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  console.log('🛒 Purchasing Twilio Phone Number...\n');

  // Step 1: Search for available phone numbers
  console.log('Step 1: Searching for available phone numbers in USA...');
  
  const searchRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&SmsEnabled=true`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      }
    }
  );

  if (!searchRes.ok) {
    console.log(`❌ Failed to search phone numbers: ${searchRes.status}`);
    const errorText = await searchRes.text();
    console.log('Error:', errorText);
    return;
  }

  const searchData = await searchRes.json() as any;
  const availableNumbers = searchData.available_phone_numbers;
  
  if (!availableNumbers || availableNumbers.length === 0) {
    console.log('❌ No phone numbers available');
    return;
  }

  console.log(`✅ Found ${availableNumbers.length} available numbers`);
  console.log('   First 5 options:');
  availableNumbers.slice(0, 5).forEach((num: any, i: number) => {
    console.log(`   ${i + 1}. ${num.phone_number} (${num.locality}, ${num.region})`);
  });

  // Step 2: Purchase the first available number
  const numberToPurchase = availableNumbers[0].phone_number;
  console.log(`\nStep 2: Purchasing ${numberToPurchase}...`);

  const purchaseRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        PhoneNumber: numberToPurchase,
        FriendlyName: 'Sarah Voice Agent',
        VoiceUrl: 'https://soshogleagents.com/api/twilio/voice-callback',
        VoiceMethod: 'POST'
      })
    }
  );

  if (!purchaseRes.ok) {
    console.log(`❌ Failed to purchase phone number: ${purchaseRes.status}`);
    const errorText = await purchaseRes.text();
    console.log('Error:', errorText);
    
    if (purchaseRes.status === 400) {
      console.log('\n💡 This might be due to:');
      console.log('   - Insufficient Twilio account balance');
      console.log('   - Need to verify your Twilio account');
      console.log('   - Geographic restrictions');
      console.log('\n   Please check: https://console.twilio.com/us1/billing');
    }
    return;
  }

  const purchaseData = await purchaseRes.json() as any;
  const purchasedPhoneNumber = purchaseData.phone_number;
  const phoneSid = purchaseData.sid;
  
  console.log(`✅ Phone number purchased successfully!`);
  console.log(`   Number: ${purchasedPhoneNumber}`);
  console.log(`   SID: ${phoneSid}`);

  // Step 3: Import to ElevenLabs
  console.log('\nStep 3: Importing to ElevenLabs...');
  
  const importRes = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers/import', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone_number: purchasedPhoneNumber,
      sid: twilioAccountSid,
      token: twilioAuthToken
    })
  });

  if (!importRes.ok) {
    const errorText = await importRes.text();
    console.log(`❌ Failed to import to ElevenLabs: ${importRes.status}`);
    console.log('Error:', errorText);
    return;
  }

  const importData = await importRes.json() as any;
  const phoneNumberId = importData.phone_number_id;
  
  console.log(`✅ Phone imported to ElevenLabs: ${phoneNumberId}`);

  // Step 4: Link to Sarah agent
  console.log('\nStep 4: Linking to Sarah agent...');
  
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      name: 'Sarah',
      userId: 'cmif7bcow0000tkxtz7wh8c5o'
    }
  });

  if (!agent) {
    console.log('❌ Sarah agent not found in database');
    return;
  }

  const linkRes = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
    method: 'PATCH',
    headers: {
      'xi-api-key': apiKey!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: agent.elevenLabsAgentId
    })
  });

  if (!linkRes.ok) {
    const errorText = await linkRes.text();
    console.log(`❌ Failed to link phone to agent: ${linkRes.status}`);
    console.log('Error:', errorText);
    return;
  }

  console.log(`✅ Phone number linked to Sarah agent`);

  // Step 5: Update database
  console.log('\nStep 5: Updating database...');
  
  await prisma.voiceAgent.update({
    where: { id: agent.id },
    data: {
      twilioPhoneNumber: purchasedPhoneNumber,
      elevenLabsPhoneNumberId: phoneNumberId
    }
  });

  // Also save to PurchasedPhoneNumber table
  await prisma.purchasedPhoneNumber.create({
    data: {
      userId: 'cmif7bcow0000tkxtz7wh8c5o',
      phoneNumber: purchasedPhoneNumber,
      twilioSid: phoneSid,
      provider: 'TWILIO',
      status: 'ACTIVE',
      monthlyPrice: 1.00 // Standard Twilio phone number price
    }
  });

  console.log(`✅ Database updated`);

  // Update .env file
  console.log('\nStep 6: Updating environment variables...');
  console.log(`   Add this to your .env file:`);
  console.log(`   TWILIO_PHONE_NUMBER=${purchasedPhoneNumber}`);

  console.log('\n\n🎉 SUCCESS! Everything is set up!');
  console.log('\n📋 Complete Setup:');
  console.log(`   ✅ Phone Number: ${purchasedPhoneNumber}`);
  console.log(`   ✅ Twilio SID: ${phoneSid}`);
  console.log(`   ✅ ElevenLabs Phone ID: ${phoneNumberId}`);
  console.log(`   ✅ Linked to Agent: Sarah (${agent.elevenLabsAgentId})`);
  console.log(`   ✅ Webhook URL: https://soshogleagents.com/api/twilio/voice-callback`);
  
  console.log('\n🧪 TEST YOUR AGENT:');
  console.log(`   📞 Call ${purchasedPhoneNumber}`);
  console.log(`   🎤 You should hear: "Hello! This is Sarah from Pharmacy Owner. How can I help you today?"`);
  console.log(`   💬 Try asking: "What are your pharmacy hours?"`);
  
  console.log('\n💰 Cost Information:');
  console.log(`   - Phone number: $1.00/month`);
  console.log(`   - Per-minute call cost: ~$0.012/min (Twilio) + ElevenLabs usage`);
}

purchaseAndSetupPhone()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
