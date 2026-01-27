import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function setupPhoneNumber() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumberFromEnv = process.env.TWILIO_PHONE_NUMBER;
  
  console.log('📱 Setting up Twilio Phone Number...\n');
  console.log(`   Phone: ${phoneNumberFromEnv}`);
  console.log(`   Twilio Account: ${twilioAccountSid}\n`);

  // Step 1: Check if phone number exists in Twilio
  console.log('Step 1: Checking Twilio account...');
  
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      }
    }
  );

  if (!twilioRes.ok) {
    console.log(`❌ Failed to fetch Twilio phone numbers: ${twilioRes.status}`);
    const errorText = await twilioRes.text();
    console.log('Error:', errorText);
    return;
  }

  const twilioData = await twilioRes.json() as any;
  console.log(`✅ Found ${twilioData.phone_numbers?.length || 0} phone numbers in Twilio account`);
  
  if (twilioData.phone_numbers && twilioData.phone_numbers.length > 0) {
    twilioData.phone_numbers.forEach((num: any) => {
      console.log(`   - ${num.phone_number} (${num.friendly_name || 'No name'})`);
    });
  }

  // Step 2: Import phone to ElevenLabs
  console.log('\nStep 2: Checking ElevenLabs phone numbers...');
  
  const elevenLabsPhones = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
    headers: {
      'xi-api-key': apiKey!
    }
  });

  if (!elevenLabsPhones.ok) {
    console.log(`❌ Failed to fetch ElevenLabs phone numbers: ${elevenLabsPhones.status}`);
    return;
  }

  const elevenLabsPhonesData = await elevenLabsPhones.json() as any;
  console.log(`✅ Found ${elevenLabsPhonesData.phone_numbers?.length || 0} phone numbers in ElevenLabs`);
  
  if (elevenLabsPhonesData.phone_numbers && elevenLabsPhonesData.phone_numbers.length > 0) {
    elevenLabsPhonesData.phone_numbers.forEach((num: any) => {
      console.log(`   - ${num.phone_number} (ID: ${num.phone_number_id})`);
      if (num.agent_id) {
        console.log(`     Linked to agent: ${num.agent_id}`);
      }
    });
  }

  // Step 3: Find or import our phone number
  let phoneNumberId = elevenLabsPhonesData.phone_numbers?.find(
    (p: any) => p.phone_number === phoneNumberFromEnv
  )?.phone_number_id;

  if (!phoneNumberId && twilioData.phone_numbers && twilioData.phone_numbers.length > 0) {
    console.log('\nStep 3: Importing phone number to ElevenLabs...');
    
    const phoneToImport = twilioData.phone_numbers[0].phone_number;
    
    const importRes = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers/import', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: phoneToImport,
        sid: twilioAccountSid,
        token: twilioAuthToken
      })
    });

    if (!importRes.ok) {
      const errorText = await importRes.text();
      console.log(`⚠️  Failed to import: ${importRes.status}`);
      console.log('Response:', errorText);
    } else {
      const importData = await importRes.json() as any;
      phoneNumberId = importData.phone_number_id;
      console.log(`✅ Phone imported successfully: ${phoneNumberId}`);
    }
  } else if (phoneNumberId) {
    console.log(`\n✅ Phone number already in ElevenLabs: ${phoneNumberId}`);
  }

  // Step 4: Link to Sarah agent
  if (phoneNumberId) {
    console.log('\nStep 4: Linking phone number to Sarah agent...');
    
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

    console.log(`   Agent ID: ${agent.elevenLabsAgentId}`);

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
    } else {
      console.log(`✅ Phone number linked to agent successfully`);

      // Get the phone number from ElevenLabs response
      const linkData = await linkRes.json() as any;
      const phoneNumber = linkData.phone_number;

      // Update database
      await prisma.voiceAgent.update({
        where: { id: agent.id },
        data: {
          twilioPhoneNumber: phoneNumber,
          elevenLabsPhoneNumberId: phoneNumberId
        }
      });

      console.log(`✅ Database updated`);

      console.log('\n\n🎉 SUCCESS! Phone setup complete!');
      console.log('\n📋 Summary:');
      console.log(`   Agent: Sarah`);
      console.log(`   Phone Number: ${phoneNumber}`);
      console.log(`   ElevenLabs Phone ID: ${phoneNumberId}`);
      console.log(`   ElevenLabs Agent ID: ${agent.elevenLabsAgentId}`);
      
      console.log('\n🧪 Test the agent:');
      console.log(`   Call ${phoneNumber} and you should hear Sarah's greeting`);
    }
  } else {
    console.log('\n⚠️  No phone number available');
    console.log('   You need to purchase a Twilio phone number first');
    console.log('   Visit: https://console.twilio.com/us1/develop/phone-numbers/manage/search');
  }
}

setupPhoneNumber()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
