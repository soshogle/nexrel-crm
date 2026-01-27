import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();

async function createSarahAgent() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const userId = 'cmif7bcow0000tkxtz7wh8c5o'; // pharmacie4177@gmail.com
  
  // Get user business name
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  const businessName = user?.businessName || user?.name || 'Pharmacy';
  
  console.log('🚀 Creating Sarah Voice Agent...\n');
  console.log(`   Business: ${businessName}`);
  console.log(`   User: ${user?.email}\n`);

  // The agent was already created, let's use the existing one
  const elevenLabsAgentId = 'agent_4001kb10w8dqf2dr5rvzbvq3h9ab';
  console.log(`✅ Using existing ElevenLabs agent: ${elevenLabsAgentId}`);

  // Save to database
  console.log('\nSaving agent to database...');
  
  const voiceAgent = await prisma.voiceAgent.create({
    data: {
      userId: userId,
      name: 'Sarah',
      businessName: businessName,
      description: 'Friendly pharmacy assistant',
      elevenLabsAgentId: elevenLabsAgentId,
      voiceId: 'EXAVITQu4vr4xnSDxMaL',
      systemPrompt: `You are Sarah, a helpful and friendly pharmacy assistant at ${businessName}. Your role is to:
- Answer questions about medications and prescriptions
- Help customers check prescription status
- Provide information about pharmacy hours and services
- Direct urgent medical questions to speak with a pharmacist
- Be professional, empathetic, and clear in your communication

Always prioritize patient safety and remind customers to consult with healthcare professionals for medical advice.`,
      firstMessage: `Hello! This is Sarah from ${businessName}. How can I help you today?`,
      type: 'BOTH',
      status: 'ACTIVE',
      language: 'en'
    }
  });

  console.log(`✅ Agent saved to database with ID: ${voiceAgent.id}`);

  // Get available Twilio phone numbers
  console.log('\nChecking available Twilio phone numbers...');
  
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/IncomingPhoneNumbers.json`,
    {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
      }
    }
  );

  if (!twilioRes.ok) {
    console.log('❌ Failed to fetch Twilio phone numbers');
    return;
  }

  const twilioData = await twilioRes.json() as any;
  console.log(`✅ Found ${twilioData.phone_numbers?.length || 0} Twilio phone numbers`);
  
  if (twilioData.phone_numbers && twilioData.phone_numbers.length > 0) {
    const phoneNumber = twilioData.phone_numbers[0].phone_number;
    console.log(`   Using: ${phoneNumber}`);

    // Import phone number to ElevenLabs
    console.log('\nImporting phone number to ElevenLabs...');
    
    const importRes = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers/import', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        sid: twilioAccountSid,
        token: twilioAuthToken
      })
    });

    if (!importRes.ok) {
      const errorText = await importRes.text();
      console.log(`⚠️  Phone import response: ${importRes.status}`);
      console.log('Response:', errorText);
      
      // Check if phone number is already imported
      console.log('\nChecking if phone number is already imported...');
      const listRes = await fetch('https://api.elevenlabs.io/v1/convai/phone-numbers', {
        headers: {
          'xi-api-key': apiKey!
        }
      });
      
      if (listRes.ok) {
        const listData = await listRes.json() as any;
        const existingPhone = listData.phone_numbers?.find((p: any) => p.phone_number === phoneNumber);
        
        if (existingPhone) {
          console.log(`✅ Phone number already imported: ${existingPhone.phone_number_id}`);
          
          // Link phone number to agent
          console.log('\nLinking phone number to agent...');
          
          const linkRes = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${existingPhone.phone_number_id}`, {
            method: 'PATCH',
            headers: {
              'xi-api-key': apiKey!,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              agent_id: elevenLabsAgentId
            })
          });

          if (!linkRes.ok) {
            const errorText = await linkRes.text();
            console.log(`⚠️  Failed to link phone number: ${linkRes.status}`);
            console.log('Error:', errorText);
          } else {
            console.log(`✅ Phone number linked to agent`);

            // Update voice agent with phone number
            await prisma.voiceAgent.update({
              where: { id: voiceAgent.id },
              data: {
                phoneNumber: phoneNumber
              }
            });

            console.log(`✅ Database updated with phone number`);
          }
        }
      }
    } else {
      const phoneData = await importRes.json() as any;
      const phoneNumberId = phoneData.phone_number_id;
      
      console.log(`✅ Phone number imported to ElevenLabs: ${phoneNumberId}`);

      // Link phone number to agent
      console.log('\nLinking phone number to agent...');
      
      const linkRes = await fetch(`https://api.elevenlabs.io/v1/convai/phone-numbers/${phoneNumberId}`, {
        method: 'PATCH',
        headers: {
          'xi-api-key': apiKey!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          agent_id: elevenLabsAgentId
        })
      });

      if (!linkRes.ok) {
        const errorText = await linkRes.text();
        console.log(`⚠️  Failed to link phone number to agent: ${linkRes.status}`);
        console.log('Error:', errorText);
      } else {
        console.log(`✅ Phone number linked to agent`);

        // Update voice agent with phone number
        await prisma.voiceAgent.update({
          where: { id: voiceAgent.id },
          data: {
            phoneNumber: phoneNumber
          }
        });

        console.log(`✅ Database updated with phone number`);
      }
    }
  }

  console.log('\n\n✅ SUCCESS! Sarah agent is ready!');
  console.log('\n📋 Agent Details:');
  console.log(`   Name: Sarah`);
  console.log(`   Business: ${businessName}`);
  console.log(`   Database ID: ${voiceAgent.id}`);
  console.log(`   ElevenLabs Agent ID: ${elevenLabsAgentId}`);
  console.log(`   Voice: Sarah (EXAVITQu4vr4xnSDxMaL)`);
  console.log(`   Status: ACTIVE`);
  
  if (twilioData.phone_numbers && twilioData.phone_numbers.length > 0) {
    console.log(`   Phone Number: ${twilioData.phone_numbers[0].phone_number}`);
  }

  console.log('\n🧪 Testing Instructions:');
  console.log('   1. Call the phone number shown above');
  console.log('   2. You should hear Sarah\'s greeting');
  console.log('   3. Try asking about pharmacy services');
  console.log('\n🔧 Troubleshooting:');
  console.log('   If you still get an error, the Twilio webhook URL needs to be set correctly');
  console.log('   The webhook should point to: https://soshogleagents.com/api/twilio/voice-callback');
}

createSarahAgent()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
