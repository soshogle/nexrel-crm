import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function importAndAssignPhone() {
  try {
    const agent = await prisma.voiceAgent.findFirst({
      where: { name: { contains: 'Florida Dentist' } }
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    console.log('🎯 Agent:', agent.name);
    console.log('📞 Phone to import:', agent.twilioPhoneNumber);
    console.log('🤖 ElevenLabs Agent ID:', agent.elevenLabsAgentId);

    // Step 1: Import phone number to ElevenLabs
    console.log('\n📥 Importing phone number to ElevenLabs...');
    
    const importResponse = await fetch(
      'https://api.elevenlabs.io/v1/convai/phone-numbers/import',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: agent.twilioPhoneNumber,
          sid: process.env.TWILIO_ACCOUNT_SID,
          token: process.env.TWILIO_AUTH_TOKEN,
        }),
      }
    );

    if (!importResponse.ok) {
      const errorText = await importResponse.text();
      throw new Error(`Import failed (${importResponse.status}): ${errorText}`);
    }

    const importData = await importResponse.json();
    console.log('✅ Phone imported! ID:', importData.phone_number_id);

    // Step 2: Assign phone to agent
    console.log('\n🔗 Assigning phone to agent...');
    
    const assignResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${importData.phone_number_id}/assign-to-agent`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agent.elevenLabsAgentId,
        }),
      }
    );

    if (!assignResponse.ok) {
      const errorText = await assignResponse.text();
      throw new Error(`Assignment failed (${assignResponse.status}): ${errorText}`);
    }

    console.log('✅ Phone assigned to agent!');

    // Step 3: Update database
    console.log('\n💾 Updating database...');
    
    await prisma.voiceAgent.update({
      where: { id: agent.id },
      data: {
        elevenLabsPhoneNumberId: importData.phone_number_id,
      },
    });

    console.log('✅ Database updated!');
    console.log('\n🎉 COMPLETE! Phone number is now imported and assigned.');
    console.log('   Phone Number ID:', importData.phone_number_id);
    console.log('   Test call should now work!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

importAndAssignPhone();
