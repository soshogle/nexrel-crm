/**
 * Voice Agent Diagnostics Script
 * 
 * This script helps diagnose issues with voice agents and their WebSocket connections.
 * Run with: yarn tsx scripts/diagnose_voice_agent.ts
 */

import 'dotenv/config';
import { prisma } from '../lib/db';
import { elevenLabsService } from '../lib/elevenlabs';

async function diagnoseVoiceAgent() {
  console.log('\n🔍 Voice Agent Diagnostics\n');
  console.log('=' .repeat(60));

  try {
    // 1. Check database voice agents
    console.log('\n1️⃣ Checking database for voice agents...');
    const agents = await prisma.voiceAgent.findMany({
      include: {
        user: {
          select: {
            email: true,
            fullName: true,
          },
        },
      },
    });

    if (agents.length === 0) {
      console.log('  ⚠️  No voice agents found in database');
      return;
    }

    console.log(`  ✅ Found ${agents.length} voice agent(s)`);

    // 2. Check each agent
    for (const agent of agents) {
      console.log('\n' + '-'.repeat(60));
      console.log(`\n🤖 Agent: ${agent.name}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Type: ${agent.type}`);
      console.log(`   Status: ${agent.status}`);
      console.log(`   Owner: ${agent.user.fullName} (${agent.user.email})`);

      // Check Twilio phone number
      console.log('\n  📞 Twilio Configuration:');
      if (agent.twilioPhoneNumber) {
        console.log(`    ✅ Phone Number: ${agent.twilioPhoneNumber}`);
      } else {
        console.log(`    ❌ No Twilio phone number assigned`);
      }

      // Check ElevenLabs configuration
      console.log('\n  🎭 ElevenLabs Configuration:');
      if (!agent.elevenLabsAgentId) {
        console.log(`    ❌ No ElevenLabs agent ID`);
        console.log(`    ⚠️  This agent is NOT configured for voice calls`);
        console.log(`    🔧 Fix: Run Auto-Configure from the UI`);
        continue;
      }

      console.log(`    ✅ Agent ID: ${agent.elevenLabsAgentId}`);

      // 3. Verify agent exists in ElevenLabs
      console.log('\n  🔗 Verifying with ElevenLabs API...');
      try {
        const elevenLabsAgent = await elevenLabsService.getAgent(agent.elevenLabsAgentId);
        console.log(`    ✅ Agent found in ElevenLabs`);
        console.log(`    📦 Name: ${elevenLabsAgent.name}`);
        console.log(`    🎭 Conversation Config ID: ${elevenLabsAgent.conversation_config_id || 'N/A'}`);

        // Check phone number assignment
        if (elevenLabsAgent.phone_number_id) {
          console.log(`    ✅ Phone Number ID: ${elevenLabsAgent.phone_number_id}`);
          console.log(`    ✅ Agent is fully configured`);
        } else {
          console.log(`    ❌ No phone number assigned in ElevenLabs`);
          console.log(`    ⚠️  This will cause WebSocket connection issues`);
          console.log(`    🔧 Fix: Run Auto-Configure to assign phone number`);
        }

        // Test WebSocket URL generation
        console.log('\n  🔌 Testing WebSocket URL generation...');
        try {
          const signedUrl = await elevenLabsService.getSignedWebSocketUrl(agent.elevenLabsAgentId);
          console.log(`    ✅ Signed URL generated successfully`);
          console.log(`    🔗 URL preview: ${signedUrl.substring(0, 50)}...`);
        } catch (wsError: any) {
          console.log(`    ❌ Failed to get signed URL: ${wsError.message}`);
          console.log(`    ⚠️  WebSocket connections will fail`);
        }

      } catch (elevenError: any) {
        console.log(`    ❌ Agent NOT found in ElevenLabs`);
        console.log(`    ⚠️  Error: ${elevenError.message}`);
        console.log(`    🔧 Fix: Run Auto-Configure to recreate the agent`);
      }

      // 4. Check call logs
      console.log('\n  📊 Recent Call Activity:');
      const recentCalls = await prisma.callLog.findMany({
        where: { voiceAgentId: agent.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      if (recentCalls.length === 0) {
        console.log(`    🔶 No calls recorded yet`);
      } else {
        console.log(`    📞 ${recentCalls.length} recent call(s):`);
        for (const call of recentCalls) {
          console.log(`      - ${call.status}: ${call.fromNumber} → ${call.toNumber}`);
          console.log(`        ${call.direction} | ${call.createdAt.toLocaleString()}`);
        }
      }
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📋 Summary:\n');
    
    const configuredAgents = agents.filter(a => a.elevenLabsAgentId);
    const fullyConfigured = agents.filter(a => a.elevenLabsAgentId && a.twilioPhoneNumber);
    
    console.log(`  Total Agents: ${agents.length}`);
    console.log(`  With ElevenLabs ID: ${configuredAgents.length}`);
    console.log(`  Fully Configured: ${fullyConfigured.length}`);
    console.log(`  Need Configuration: ${agents.length - fullyConfigured.length}`);

    if (fullyConfigured.length < agents.length) {
      console.log('\n  ⚠️  Action Required:');
      console.log('  🔧 Run Auto-Configure for agents that need setup');
      console.log('  🔗 Go to: Dashboard → Voice Agents → Configure Agent');
    } else {
      console.log('\n  ✅ All agents are properly configured!');
    }

  } catch (error: any) {
    console.error('\n❌ Diagnostics failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostics
diagnoseVoiceAgent().then(() => {
  console.log('\n✅ Diagnostics complete!\n');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Diagnostics failed:', error);
  process.exit(1);
});
