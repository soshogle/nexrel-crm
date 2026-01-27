import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const agent = await prisma.voiceAgent.findFirst({
    where: {
      elevenLabsAgentId: 'agent_6301kb62bz0pf61tnk1v5ajtp3rb'
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true
        }
      }
    }
  });
  
  if (agent) {
    console.log('\n=== Agent Information ===');
    console.log('Agent ID:', agent.id);
    console.log('Agent Name:', agent.name);
    console.log('ElevenLabs Agent ID:', agent.elevenLabsAgentId);
    console.log('\n=== Associated User Profile ===');
    console.log('User ID:', agent.user.id);
    console.log('User Email:', agent.user.email);
    console.log('User Name:', agent.user.name);
  } else {
    console.log('No agent found with ElevenLabs Agent ID: agent_6301kb62bz0pf61tnk1v5ajtp3rb');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
