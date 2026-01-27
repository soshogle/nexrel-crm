import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating Sara agent with ElevenLabs Agent ID...\n');
  
  const updatedAgent = await prisma.voiceAgent.update({
    where: { 
      id: 'cmino0g6a0001ysul3v7leflz'
    },
    data: {
      elevenLabsAgentId: 'agent_6301kb62bz0pf61tnk1v5ajtp3rb'
    },
    include: {
      user: {
        select: { email: true, name: true }
      }
    }
  });

  console.log('✅ Agent Updated Successfully!');
  console.log('\n--- Updated Agent Details ---');
  console.log('ID:', updatedAgent.id);
  console.log('Name:', updatedAgent.name);
  console.log('ElevenLabs Agent ID:', updatedAgent.elevenLabsAgentId);
  console.log('Owner:', updatedAgent.user.email);
  console.log('Type:', updatedAgent.type);
  console.log('Status:', updatedAgent.status);
  console.log('Phone:', updatedAgent.twilioPhoneNumber);
  console.log('\n✨ The agent should now appear in the test voice agent section!');

  await prisma.$disconnect();
}

main().catch(console.error);
