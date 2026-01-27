import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' },
    include: {
      voiceAgents: true
    }
  });

  console.log('✅ Verification Results:');
  console.log(`\nUser: ${user?.email}`);
  console.log(`Voice Agents: ${user?.voiceAgents.length}\n`);
  
  user?.voiceAgents.forEach((agent, idx) => {
    console.log(`--- Agent ${idx + 1}: ${agent.name} ---`);
    console.log(`  Database ID: ${agent.id}`);
    console.log(`  ElevenLabs ID: ${agent.elevenLabsAgentId || '❌ NOT SET'}`);
    console.log(`  Type: ${agent.type}`);
    console.log(`  Status: ${agent.status}`);
    console.log(`  Phone: ${agent.twilioPhoneNumber || 'N/A'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

main().catch(console.error);
