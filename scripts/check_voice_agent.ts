import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: 'pharmacie4177@gmail.com' }
  });

  if (!user) {
    console.log('❌ User not found');
    return;
  }

  console.log('✅ User found:', user.id, user.name);

  // Find voice agents for this user
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n📞 Voice Agents:', voiceAgents.length);
  voiceAgents.forEach(agent => {
    console.log(`\nAgent: ${agent.name}`);
    console.log(`  ID: ${agent.id}`);
    console.log(`  ElevenLabs Agent ID: ${agent.elevenLabsAgentId || '❌ NOT SET'}`);
    console.log(`  Phone Number: ${agent.twilioPhoneNumber || 'Not assigned'}`);
    console.log(`  Type: ${agent.type}`);
    console.log(`  Status: ${agent.status}`);
    console.log(`  Created: ${agent.createdAt}`);
  });

  // Check ElevenLabs API keys
  const apiKeys = await prisma.elevenLabsApiKey.findMany({
    where: { userId: user.id }
  });

  console.log('\n🔑 ElevenLabs API Keys:');
  if (apiKeys.length === 0) {
    console.log('❌ No API keys configured for this user');
  } else {
    apiKeys.forEach(key => {
      const masked = key.apiKey.substring(0, 8) + '...';
      console.log(`  - ${key.label}: ${masked} (Priority: ${key.priority}, Active: ${key.isActive})`);
    });
  }

  // Check phone numbers
  const phoneNumbers = await prisma.purchasedPhoneNumber.findMany({
    where: { userId: user.id }
  });

  console.log('\n📱 Purchased Phone Numbers:');
  if (phoneNumbers.length === 0) {
    console.log('❌ No phone numbers purchased');
  } else {
    phoneNumbers.forEach(num => {
      console.log(`  - ${num.phoneNumber}`);
    });
  }

  // Check environment variables
  console.log('\n🌍 Environment Variables:');
  console.log(`  ELEVENLABS_API_KEY: ${process.env.ELEVENLABS_API_KEY ? '✅ Set (' + process.env.ELEVENLABS_API_KEY.substring(0, 10) + '...)' : '❌ NOT SET'}`);
  console.log(`  TWILIO_ACCOUNT_SID: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ NOT SET'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${process.env.TWILIO_PHONE_NUMBER ? process.env.TWILIO_PHONE_NUMBER : '❌ NOT SET'}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
