/**
 * Verification script: ElevenLabs Call API with conversation_config_override
 *
 * Usage: npm run verify:elevenlabs-overrides -- --dry-run
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

const projectRoot = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(projectRoot, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env.local') });

console.log('=== ElevenLabs Override Verification ===');

const API_BASE = 'https://api.elevenlabs.io/v1';

async function main() {
  const { prisma } = await import('../lib/db');
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  if (args.includes('--dry-run-nothing')) {
    console.warn('⚠️  Did you mean --dry-run? (--dry-run-nothing is not a valid flag)');
  }
  const withOverrides = !args.includes('--no-overrides');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  let agentId =
    process.env.ELEVENLABS_AGENT_ID ||
    process.env.ELEVENLABS_DEFAULT_AGENT_ID ||
    process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID;
  const testPhone = process.env.TEST_PHONE_NUMBER;

  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY is required');
    console.error('   Add it to .env.local in the project root: nexrel-crm/');
    console.error('   Or run: ELEVENLABS_API_KEY=your-key npm run verify:elevenlabs-overrides -- --dry-run');
    process.exit(1);
  }

  // Use agent from DB if no agent ID in env
  // Priority: 1) User.crmVoiceAgentId (AI Brain chat agent), 2) VoiceAgent.elevenLabsAgentId
  if (!agentId) {
    console.log('No agent ID in env - fetching from database...');

    // 1. Same agent used by AI Brain chat (User.crmVoiceAgentId)
    const userWithCrmAgent = await prisma.user.findFirst({
      where: { crmVoiceAgentId: { not: null } },
      select: { crmVoiceAgentId: true, name: true },
    });
    if (userWithCrmAgent?.crmVoiceAgentId) {
      agentId = userWithCrmAgent.crmVoiceAgentId;
      console.log(`✅ Using: CRM Voice Agent (AI Brain chat) - ${userWithCrmAgent.name || 'User'}`);
    } else {
      // 2. Fallback: VoiceAgent table
      const voiceAgent = await prisma.voiceAgent.findFirst({
        where: { elevenLabsAgentId: { not: null } },
        orderBy: { updatedAt: 'desc' },
      });
      if (voiceAgent?.elevenLabsAgentId) {
        agentId = voiceAgent.elevenLabsAgentId;
        console.log(`✅ Using: ${voiceAgent.name} (VoiceAgent)`);
      }
    }

    if (!agentId) {
      console.error('❌ No voice agent found in database.');
      console.error('   Use the AI Brain chat once to create it, or create a Voice Agent in Dashboard → Voice Agents.');
      console.error('   Or set ELEVENLABS_AGENT_ID in .env.local');
      process.exit(1);
    }
  }

  if (!dryRun && !testPhone) {
    console.error('❌ TEST_PHONE_NUMBER is required when not using --dry-run');
    console.error('   Set env: TEST_PHONE_NUMBER=+15551234567');
    process.exit(1);
  }

  console.log('\n🔍 ElevenLabs Call API Override Verification\n');
  console.log('Agent ID:', agentId);
  console.log('With overrides:', withOverrides);
  console.log('Dry run:', dryRun);
  if (testPhone) console.log('Test phone:', testPhone);
  console.log('');

  // 1. Fetch agent details
  console.log('Step 1: Fetching agent details...');
  let agentRes = await fetch(`${API_BASE}/convai/agents/${agentId}`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!agentRes.ok && agentRes.status === 404) {
    console.warn('⚠️  Agent not found in ElevenLabs (stale ID). Clearing from database...');
    await prisma.user.updateMany({
      where: { crmVoiceAgentId: agentId },
      data: { crmVoiceAgentId: null },
    });
    await prisma.voiceAgent.updateMany({
      where: { elevenLabsAgentId: agentId },
      data: { elevenLabsAgentId: null },
    });
    console.log('   Cleared. Using next available agent...');
    const fallback = await prisma.user.findFirst({
      where: { crmVoiceAgentId: { not: null } },
      select: { crmVoiceAgentId: true },
    }) ?? await prisma.voiceAgent.findFirst({
      where: { elevenLabsAgentId: { not: null } },
      select: { elevenLabsAgentId: true },
    });
    if (fallback?.crmVoiceAgentId || (fallback as any)?.elevenLabsAgentId) {
      agentId = (fallback as any).crmVoiceAgentId ?? (fallback as any).elevenLabsAgentId;
      agentRes = await fetch(`${API_BASE}/convai/agents/${agentId}`, {
        headers: { 'xi-api-key': apiKey },
      });
    }
  }

  if (!agentRes.ok) {
    console.error('❌ Failed to fetch agent:', agentRes.status, await agentRes.text());
    console.error('\n   Fix: Open AI Brain chat in the app - it will create a new agent automatically.');
    console.error('   Or set ELEVENLABS_AGENT_ID in .env.local to a valid agent ID from elevenlabs.io/app/agents');
    await prisma.$disconnect();
    process.exit(1);
  }

  const agent = await agentRes.json();
  console.log('✅ Agent found:', agent.name || agent.agent_id);
  console.log('   Phone assigned:', agent.phone_number_id ? 'Yes' : 'No');
  if (!agent.phone_number_id && !dryRun) {
    console.error('❌ Agent has no phone number - cannot test call. Assign a phone number in ElevenLabs dashboard.');
    process.exit(1);
  }
  if (!agent.phone_number_id && dryRun) {
    console.log('   (Dry-run: phone not required; needed for actual call test)');
  }

  // 2. Build call payload
  const payload: Record<string, unknown> = {
    phone_number: testPhone || '+15551234567', // placeholder for dry-run
  };

  if (withOverrides) {
    payload.conversation_config_override = {
      agent: {
        language: 'en',
      },
      tts: {
        voice_id: agent.conversation_config?.tts?.voice_id || undefined,
        stability: 0.7,
        speed: 1.0,
        similarity_boost: 0.75,
      },
    };
    console.log('\nOverride payload (conversation_config_override):');
    console.log(JSON.stringify(payload.conversation_config_override, null, 2));
  }

  if (dryRun) {
    console.log('\n📋 [DRY RUN] Would send:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n✅ Dry run complete. Run without --dry-run to actually test the call.');
    console.log('   Set TEST_PHONE_NUMBER to a valid E.164 number first.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // 3. Make the call request
  console.log('\nStep 2: Initiating call with overrides...');
  const callRes = await fetch(`${API_BASE}/convai/agents/${agentId}/call`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await callRes.text();
  console.log(`\nResponse status: ${callRes.status} ${callRes.statusText}`);

  if (callRes.ok) {
    console.log('✅ SUCCESS: Call initiated');
    try {
      const data = JSON.parse(responseText);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch {
      console.log('Response:', responseText);
    }
    console.log('\n🎉 OVERRIDES ARE SUPPORTED: conversation_config_override was accepted.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Parse error
  console.log('Response body:', responseText);

  let errorMsg = responseText;
  try {
    const err = JSON.parse(responseText);
    errorMsg = err.detail || err.message || JSON.stringify(err);
  } catch {
    // keep raw
  }

  if (callRes.status === 400 || callRes.status === 422) {
    console.error('\n❌ Request rejected (validation error)');
    if (
      errorMsg.toLowerCase().includes('conversation_config') ||
      errorMsg.toLowerCase().includes('override') ||
      errorMsg.toLowerCase().includes('unknown') ||
      errorMsg.toLowerCase().includes('unexpected')
    ) {
      console.error('\n⚠️  LIKELY: conversation_config_override is NOT supported by this endpoint.');
      console.error('   The API may reject unknown fields. Try with --no-overrides to confirm baseline works.');
    } else {
      console.error('   Error may be unrelated to overrides (e.g. invalid phone).');
    }
  } else if (callRes.status === 404) {
    console.error('\n❌ Agent or phone not found');
  } else if (callRes.status === 402) {
    console.error('\n❌ Insufficient credits or plan does not support outbound calls');
  } else {
    console.error('\n❌ Unexpected error:', errorMsg);
  }

  await prisma.$disconnect();
  process.exit(1);
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  try {
    await prisma.$disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
  process.exit(1);
});
