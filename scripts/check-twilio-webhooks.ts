import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking Voice Agent Webhook Configurations...\n');
  
  const agents = await prisma.voiceAgent.findMany({
    select: {
      id: true,
      name: true,
      twilioPhoneNumber: true,
      elevenLabsAgentId: true,
      userId: true
    }
  });
  
  console.log(`Found ${agents.length} voice agents:\n`);
  
  agents.forEach((agent, i) => {
    console.log(`${i + 1}. ${agent.name}`);
    console.log(`   Phone: ${agent.twilioPhoneNumber}`);
    console.log(`   ElevenLabs Agent ID: ${agent.elevenLabsAgentId}`);
    console.log(`   User ID: ${agent.userId}\n`);
  });
  
  console.log('\n⚠️  IMPORTANT: You need to configure Twilio webhooks for each phone number:');
  console.log('\n📍 Required Webhook URLs:');
  console.log(`   Voice Callback: https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/voice-callback`);
  console.log(`   Status Callback: https://go-high-or-show-goog-8dv76n.abacusai.app/api/twilio/call-status`);
  console.log('\n📝 How to configure in Twilio:');
  console.log('   1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/active');
  console.log('   2. Click on your phone number');
  console.log('   3. Under "Voice Configuration":');
  console.log('      - A CALL COMES IN: Webhook + Voice Callback URL (HTTP POST)');
  console.log('      - PRIMARY HANDLER FAILS: (leave blank)');
  console.log('      - CALL STATUS CHANGES: Webhook + Status Callback URL (HTTP POST)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
