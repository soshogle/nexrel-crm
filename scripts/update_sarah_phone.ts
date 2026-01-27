import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateVoiceAgent() {
  try {
    // Update the Sarah voice agent with the phone number ID
    const result = await prisma.voiceAgent.update({
      where: {
        id: 'cmigiksvs0001swg8tj7j9n3w', // Sarah agent ID
      },
      data: {
        elevenLabsPhoneNumberId: 'phnum_0801kb11q1fefje8m0bbba6z6qgm',
        status: 'ACTIVE',
      },
    });

    console.log('✅ Voice agent updated successfully:');
    console.log('   Name:', result.name);
    console.log('   ElevenLabs Agent ID:', result.elevenLabsAgentId);
    console.log('   ElevenLabs Phone Number ID:', result.elevenLabsPhoneNumberId);
    console.log('   Twilio Phone Number:', result.twilioPhoneNumber);
    console.log('   Status:', result.status);
  } catch (error) {
    console.error('❌ Error updating voice agent:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateVoiceAgent();
