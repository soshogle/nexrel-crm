#!/usr/bin/env tsx
/**
 * Check User Calls
 * 
 * Check what calls exist for a user in CallLog vs ElevenLabs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'pharmacie4177@gmail.com';

async function main() {
  console.log(`🔍 Checking calls for ${USER_EMAIL}...\n`);

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      console.error(`❌ User not found: ${USER_EMAIL}`);
      return;
    }

    console.log(`✅ User: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Check CallLog entries
    const callLogs = await prisma.callLog.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        elevenLabsConversationId: true,
        fromNumber: true,
        toNumber: true,
        duration: true,
        status: true,
        createdAt: true,
        voiceAgentId: true,
        voiceAgent: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    console.log(`📞 CallLog entries: ${callLogs.length}`);
    if (callLogs.length > 0) {
      console.log('\nRecent calls:');
      callLogs.slice(0, 10).forEach((call, idx) => {
        console.log(`   ${idx + 1}. ${call.fromNumber} → ${call.toNumber}`);
        console.log(`      Status: ${call.status}, Duration: ${call.duration}s`);
        console.log(`      Agent: ${call.voiceAgent?.name || 'N/A'}`);
        console.log(`      ElevenLabs ID: ${call.elevenLabsConversationId || 'NONE'}`);
        console.log(`      Created: ${call.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // Check voice agents
    const voiceAgents = await prisma.voiceAgent.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true,
      },
    });

    console.log(`\n🤖 Voice Agents: ${voiceAgents.length}`);
    if (voiceAgents.length === 0) {
      console.log('   ⚠️  No voice agents found - this is why calls aren\'t showing in history!');
    } else {
      voiceAgents.forEach((agent) => {
        console.log(`   - ${agent.name}`);
        console.log(`     ElevenLabs Agent ID: ${agent.elevenLabsAgentId || 'NOT SET'}`);
      });
    }

    // Check calls with ElevenLabs conversation IDs
    const callsWithElevenLabs = callLogs.filter(
      (call) => call.elevenLabsConversationId !== null
    );
    console.log(`\n📊 Calls with ElevenLabs IDs: ${callsWithElevenLabs.length}`);
  } catch (error: any) {
    console.error('❌ Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
