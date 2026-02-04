#!/usr/bin/env tsx
/**
 * Find ElevenLabs Calls for User
 * 
 * This script:
 * 1. Lists all agents in ElevenLabs
 * 2. Finds agents that might belong to the user (by name/email matching)
 * 3. Fetches all conversations for those agents
 * 4. Creates CallLog entries for missing calls
 */

import { PrismaClient } from '@prisma/client';
import { ElevenLabsService } from '../lib/elevenlabs';

const prisma = new PrismaClient();

const USER_EMAIL = 'pharmacie4177@gmail.com';
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

async function main() {
  console.log(`🔍 Finding ElevenLabs calls for ${USER_EMAIL}...\n`);

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

    // Step 2: List all agents in ElevenLabs
    // Try to get API key from environment or use ElevenLabsService
    const elevenLabsService = new ElevenLabsService();
    const apiKey = process.env.ELEVENLABS_API_KEY || '';
    
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not found in environment');
      console.log('   Trying to use ElevenLabsService...');
    }

    console.log('📋 Fetching all agents from ElevenLabs...');
    
    // Use ElevenLabsService to list agents if available, otherwise fetch directly
    let allAgents: any[] = [];
    
    try {
      // Try using ElevenLabsService method if it exists
      if (apiKey) {
        const agentsResponse = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents`, {
          headers: { 'xi-api-key': apiKey },
        });

        if (!agentsResponse.ok) {
          throw new Error(`Failed to fetch agents: ${agentsResponse.statusText}`);
        }

        const agentsData = await agentsResponse.json();
        allAgents = agentsData.agents || [];
      } else {
        // If no API key, we can't fetch from ElevenLabs
        console.log('⚠️  Cannot fetch agents without API key');
        console.log('   Checking CallLog entries instead...\n');
        
        // Check if there are any CallLog entries that might have been created but not synced
        const callLogs = await prisma.callLog.findMany({
          where: {
            userId: user.id,
            elevenLabsConversationId: { not: null },
          },
          select: {
            elevenLabsConversationId: true,
            createdAt: true,
            fromNumber: true,
            toNumber: true,
          },
          orderBy: { createdAt: 'desc' },
        });
        
        console.log(`📞 Found ${callLogs.length} CallLog entries with ElevenLabs IDs`);
        if (callLogs.length > 0) {
          console.log('\n   These calls should appear in the history tab.');
          console.log('   If they don\'t, the issue is with the API endpoint filtering.\n');
        }
        return;
      }
    } catch (error: any) {
      console.error(`❌ Error fetching agents:`, error.message);
      return;
    }
    
    console.log(`   Found ${allAgents.length} total agents in ElevenLabs\n`);

    // Step 3: Try to match agents to this user
    // Look for agents with names/emails that match the user
    const userName = (user.name || '').toLowerCase();
    const userEmailDomain = user.email.split('@')[0].toLowerCase();

    console.log('🔍 Searching for matching agents...');
    console.log(`   Looking for: "${userName}" or "${userEmailDomain}"\n`);

    const matchingAgents: any[] = [];
    
    for (const agent of allAgents) {
      const agentName = (agent.name || '').toLowerCase();
      const agentEmail = (agent.recording_email_address || '').toLowerCase();
      
      // Check if agent name or email matches user
      const nameMatch = userName && (agentName.includes(userName) || userName.includes(agentName));
      const emailMatch = agentEmail.includes(userEmailDomain) || agentEmail.includes(user.email.toLowerCase());
      
      if (nameMatch || emailMatch) {
        matchingAgents.push(agent);
        console.log(`✅ Found matching agent: ${agent.name}`);
        console.log(`   ID: ${agent.agent_id}`);
        console.log(`   Email: ${agent.recording_email_address || 'N/A'}`);
        console.log('');
      }
    }

    if (matchingAgents.length === 0) {
      console.log('⚠️  No matching agents found in ElevenLabs');
      console.log('   Showing all agents for manual review:\n');
      allAgents.slice(0, 20).forEach((agent: any, idx: number) => {
        console.log(`${idx + 1}. ${agent.name || 'Unnamed'}`);
        console.log(`   ID: ${agent.agent_id}`);
        console.log(`   Email: ${agent.recording_email_address || 'N/A'}`);
        console.log('');
      });
      return;
    }

    // Step 4: Fetch conversations for matching agents
    const elevenLabsService = new ElevenLabsService();
    const allConversations: any[] = [];

    for (const agent of matchingAgents) {
      try {
        console.log(`📥 Fetching conversations for agent: ${agent.name}...`);
        const response = await elevenLabsService.listConversations({
          agent_id: agent.agent_id,
          page_size: 100,
        });

        const conversations = response.conversations || [];
        console.log(`   Found ${conversations.length} conversations\n`);

        conversations.forEach((conv: any) => {
          allConversations.push({
            ...conv,
            agentId: agent.agent_id,
            agentName: agent.name,
          });
        });
      } catch (error: any) {
        console.error(`❌ Error fetching conversations:`, error.message);
      }
    }

    console.log(`📊 Total conversations found: ${allConversations.length}\n`);

    if (allConversations.length === 0) {
      console.log('⚠️  No conversations found');
      return;
    }

    // Step 5: Check existing CallLog entries
    const existingCallLogs = await prisma.callLog.findMany({
      where: {
        userId: user.id,
        elevenLabsConversationId: { not: null },
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

    // Step 6: Create CallLog entries for missing calls
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
        // Fetch full conversation details
        const convDetails = await elevenLabsService.getConversationDetails(convId);

        // Extract phone numbers
        const fromNumber = convDetails.metadata?.from_number || 
                          convDetails.metadata?.from || 
                          convDetails.from_number ||
                          'UNKNOWN';
        const toNumber = convDetails.metadata?.to_number || 
                        convDetails.metadata?.to || 
                        convDetails.to_number ||
                        'UNKNOWN';

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
            voiceAgentId: null, // No voice agent in database
            elevenLabsConversationId: convId,
            direction: 'OUTBOUND',
            status: convDetails.status === 'done' ? 'COMPLETED' : 'INITIATED',
            fromNumber: String(fromNumber),
            toNumber: String(toNumber),
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
        console.log(`✅ Created CallLog for conversation ${convId.substring(0, 20)}... (${conv.agentName})`);
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
