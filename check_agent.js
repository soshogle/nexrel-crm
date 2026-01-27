const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const agent = await prisma.voiceAgent.findFirst({
      where: {
        OR: [
          { id: 'agent_6301kb62bz0pf61tnk1v5ajtp3rb' },
          { elevenLabsAgentId: 'agent_6301kb62bz0pf61tnk1v5ajtp3rb' }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    
    if (agent) {
      console.log('✅ Agent found:');
      console.log('ID:', agent.id);
      console.log('Name:', agent.name);
      console.log('ElevenLabs Agent ID:', agent.elevenLabsAgentId);
      console.log('Owner Email:', agent.user.email);
      console.log('Owner Name:', agent.user.name);
    } else {
      console.log('❌ Agent not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();
