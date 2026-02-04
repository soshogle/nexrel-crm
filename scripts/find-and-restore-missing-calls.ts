#!/usr/bin/env tsx
/**
 * Find and Restore Missing Calls for User
 * 
 * This script:
 * 1. Finds the user by email
 * 2. Gets their voice agents and ElevenLabs agent IDs
 * 3. Fetches all conversations from ElevenLabs for those agents
 * 4. Checks which calls are missing from CallLog
 * 5. Creates CallLog entries for missing calls
 */

import { PrismaClient } from '@prisma/client';
import { ElevenLabsService } from '../lib/elevenlabs';

const prisma = new PrismaClient();

const USER_EMAIL = 'pharmacie4177@gmail.com';

async function main() {
  console.log(`🔍 Finding and restoring missing calls for ${USER_EMAIL}...\n`);

  try {
    // Step 1: Find the user
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

    console.log(`✅ Found user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Step 2: Get user's voice agents
    const voiceAgents = await prisma.voiceAgent.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        elevenLabsAgentId: true,
      },
    });

    if (voiceAgents.length === 0) {
      console.log('⚠️  No voice agents found for this user');
      return;
    }

    console.log(`📞 Found ${voiceAgents.length} voice agent(s):`);
    voiceAgents.forEach((agent) => {
      console.log(`   - ${agent.name} (ID: ${agent.id}, ElevenLabs: ${agent.elevenLabsAgentId || 'NOT SET'})`);
    });
    console.log('');

    // Step 3: Fetch conversations from ElevenLabs for each agent
    const elevenLabsService = new ElevenLabsService();
    const allConversations: any[] = [];

    for (const agent of voiceAgents) {
      if (!agent.elevenLabsAgentId) {
        console.log(`⚠️  Skipping agent ${agent.name} - no ElevenLabs agent ID`);
        continue;
      }

      try {
        console.log(`📥 Fetching conversations for agent: ${agent.name}...`);
        const response = await elevenLabsService.listConversations({
          agent_id: agent.elevenLabsAgentId,
          page_size: 100,
        });

        const conversations = response.conversations || [];
        console.log(`   Found ${conversations.length} conversations in ElevenLabs`);

        // Add agent info to each conversation
        conversations.forEach((conv: any) => {
          allConversations.push({
            ...conv,
            voiceAgentId: agent.id,
            voiceAgentName: agent.name,
          });
        });
      } catch (error: any) {
        console.error(`❌ Error fetching conversations for agent ${agent.name}:`, error.message);
      }
    }

    console.log(`\n📊 Total conversations found in ElevenLabs: ${allConversations.length}\n`);

    if (allConversations.length === 0) {
      console.log('⚠️  No conversations found in ElevenLabs');
      return;
    }

    // Step 4: Check which calls exist in CallLog
    const existingCallLogs = await prisma.callLog.findMany({
      where: {
        userId: user.id,
        elevenLabsConversationId: {
          not: null,
        },
      },
      select: {
        elevenLabsConversationId: true,
      },
    });

    const existingConvIds = new Set(
      existingCallLogs
        .map((log) => log.elevenLabsConversationId)
        .filter((id): id is string => id !== null)
    );

    console.log(`📋 Existing CallLog entries: ${existingConvIds.size}`);
    console.log(`🆕 Missing CallLog entries: ${allConversations.length - existingConvIds.size}\n`);

    // Step 5: Create CallLog entries for missing calls
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const conv of allConversations) {
      const convId = conv.conversation_id;

      if (existingConvIds.has(convId)) {
        skipped++;
        continue;
      }

      try {
        // Fetch full conversation details to get transcript and other data
        const convDetails = await elevenLabsService.getConversation(convId);

        // Extract phone numbers (try to get from conversation data)
        const fromNumber = convDetails.metadata?.from_number || convDetails.metadata?.from || 'UNKNOWN';
        const toNumber = convDetails.metadata?.to_number || convDetails.metadata?.to || 'UNKNOWN';

        // Format transcript
        let transcriptText = '';
        if (convDetails.transcript && Array.isArray(convDetails.transcript)) {
          transcriptText = convDetails.transcript
            .map((turn: any) => {
              const role = turn.role === 'agent' ? 'Agent' : 'User';
              const timestamp = turn.time_in_call_secs
                ? `[${Math.floor(turn.time_in_call_secs / 60)}:${String(Math.floor(turn.time_in_call_secs % 60)).padStart(2, '0')}]`
                : '';
              return `${timestamp} ${role}: ${turn.message}`;
            })
            .join('\n');
        }

        // Calculate duration
        const duration = convDetails.end_time_unix_secs && convDetails.start_time_unix_secs
          ? convDetails.end_time_unix_secs - convDetails.start_time_unix_secs
          : convDetails.analysis?.call_duration || 0;

        // Get recording URL
        const recordingUrl = convDetails.has_audio
          ? `/api/calls/audio/${convId}`
          : null;

        // Create CallLog entry
        await prisma.callLog.create({
          data: {
            userId: user.id,
            voiceAgentId: conv.voiceAgentId,
            elevenLabsConversationId: convId,
            direction: 'OUTBOUND', // Default, adjust if needed
            status: convDetails.status === 'done' ? 'COMPLETED' : 'INITIATED',
            fromNumber: fromNumber,
            toNumber: toNumber,
            duration: duration,
            transcription: transcriptText || null,
            transcript: transcriptText || null,
            recordingUrl: recordingUrl,
            conversationData: JSON.stringify(convDetails),
            endedAt: convDetails.end_time_unix_secs
              ? new Date(convDetails.end_time_unix_secs * 1000)
              : null,
            createdAt: convDetails.start_time_unix_secs
              ? new Date(convDetails.start_time_unix_secs * 1000)
              : new Date(),
          },
        });

        created++;
        console.log(`✅ Created CallLog for conversation ${convId} (${conv.voiceAgentName})`);
      } catch (error: any) {
        errors++;
        console.error(`❌ Error creating CallLog for ${convId}:`, error.message);
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped (already exist): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📞 Total conversations: ${allConversations.length}`);
    console.log('═══════════════════════════════════════════════\n');
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
