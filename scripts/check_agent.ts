import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' }
  });

  console.log('🔍 User Found:', user ? {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  } : 'NOT FOUND');

  if (!user) {
    console.log('\n❌ User not found in database');
    return;
  }

  // Check all voice agents for this user
  const agents = await prisma.voiceAgent.findMany({
    where: { userId: user.id },
    include: {
      user: {
        select: { email: true, name: true }
      }
    }
  });

  console.log(`\n📋 Voice Agents for ${user.email}:`, agents.length);
  
  if (agents.length === 0) {
    console.log('❌ No voice agents found for this user');
  } else {
    agents.forEach((agent, idx) => {
      console.log(`\n--- Agent ${idx + 1} ---`);
      console.log('ID:', agent.id);
      console.log('Name:', agent.name);
      console.log('ElevenLabs Agent ID:', agent.elevenLabsAgentId || 'NOT SET');
      console.log('Type:', agent.type);
      console.log('Status:', agent.status);
      console.log('Phone:', agent.twilioPhoneNumber || 'NOT SET');
      console.log('Created:', agent.createdAt);
    });
  }

  // Check for the specific ElevenLabs agent ID
  console.log('\n\n🔍 Searching for ElevenLabs Agent: agent_6301kb62bz0pf61tnk1v5ajtp3rb');
  const specificAgent = await prisma.voiceAgent.findFirst({
    where: { 
      elevenLabsAgentId: 'agent_6301kb62bz0pf61tnk1v5ajtp3rb'
    },
    include: {
      user: {
        select: { id: true, email: true, name: true }
      }
    }
  });

  if (specificAgent) {
    console.log('\n✅ Found Agent:');
    console.log('Database ID:', specificAgent.id);
    console.log('Name:', specificAgent.name);
    console.log('Owner Email:', specificAgent.user.email);
    console.log('Owner User ID:', specificAgent.user.id);
    console.log('Type:', specificAgent.type);
    console.log('Status:', specificAgent.status);
    console.log('Phone:', specificAgent.twilioPhoneNumber || 'NOT SET');
    
    if (specificAgent.userId !== user.id) {
      console.log('\n⚠️  ISSUE: This agent belongs to a DIFFERENT user!');
      console.log(`Current owner: ${specificAgent.user.email}`);
      console.log(`Expected owner: ${user.email}`);
    }
  } else {
    console.log('❌ Agent not found in database');
  }

  await prisma.$disconnect();
}

main().catch(console.error);
