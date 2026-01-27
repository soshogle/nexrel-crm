import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listAgents() {
  try {
    const agents = await prisma.voiceAgent.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    console.log(`Found ${agents.length} agent(s):\n`);

    agents.forEach((agent) => {
      console.log(`ID: ${agent.id}`);
      console.log(`Name: ${agent.name}`);
      console.log(`Type: ${agent.type}`);
      console.log(`Status: ${agent.status}`);
      console.log(`User: ${agent.user.email}`);
      console.log(`Business: ${agent.businessName}`);
      console.log(`ElevenLabs ID: ${agent.elevenLabsAgentId || 'Not provisioned'}`);
      console.log(`Greeting: ${agent.greetingMessage || 'None'}`);
      console.log(`Inbound Greeting: ${agent.inboundGreeting || 'None'}`);
      console.log(`Outbound Greeting: ${agent.outboundGreeting || 'None'}`);
      console.log(`Has KB: ${!!agent.knowledgeBase}`);
      console.log(`Created: ${agent.createdAt}`);
      console.log('---\n');
    });
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

listAgents();
