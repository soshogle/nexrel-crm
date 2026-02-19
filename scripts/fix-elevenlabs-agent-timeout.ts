/**
 * Fix ElevenLabs agent turn timeout — set to 30 seconds (max) so calls don't cut off prematurely.
 * Updates all website agents and CRM voice agents.
 *
 * Run: npx tsx scripts/fix-elevenlabs-agent-timeout.ts
 * Or for a specific agent: npx tsx scripts/fix-elevenlabs-agent-timeout.ts <agentId>
 */

import { prisma } from '@/lib/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const TURN_TIMEOUT_SECONDS = 30; // Max allowed — gives users most time before agent prompts/ends

async function patchAgentTurnTimeout(agentId: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const getRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });
    if (!getRes.ok) {
      return { success: false, error: `Failed to fetch agent: ${getRes.status}` };
    }

    const current = await getRes.json();
    const convConfig = current.conversation_config || {};
    const conversation = convConfig.conversation || {};

    // Minimal PATCH — only conversation to avoid "both tools and tool_ids" error
    const updatePayload = {
      conversation_config: {
        conversation: {
          ...conversation,
          max_duration_seconds: conversation.max_duration_seconds ?? 1800,
          turn_timeout_seconds: TURN_TIMEOUT_SECONDS,
        },
      },
    };

    const patchRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!patchRes.ok) {
      const err = await patchRes.text();
      return { success: false, error: err };
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY not set');
    process.exit(1);
  }

  const agentIdArg = process.argv[2];
  const agentIds: { id: string; source: string }[] = [];

  if (agentIdArg) {
    agentIds.push({ id: agentIdArg, source: 'CLI arg' });
  } else {
    try {
      const websites = await prisma.website.findMany({
        where: { elevenLabsAgentId: { not: null }, voiceAIEnabled: true },
        select: { id: true, name: true, elevenLabsAgentId: true },
      });
      for (const w of websites) {
        if (w.elevenLabsAgentId) {
          agentIds.push({ id: w.elevenLabsAgentId, source: `Website: ${w.name}` });
        }
      }
    } catch (e) {
      console.warn('Could not fetch websites:', (e as Error).message);
    }

    try {
      const voiceAgents = await prisma.voiceAgent.findMany({
        where: { elevenLabsAgentId: { not: null }, status: 'ACTIVE' },
        select: { id: true, elevenLabsAgentId: true },
      });
      for (const v of voiceAgents) {
        if (v.elevenLabsAgentId && !agentIds.some((a) => a.id === v.elevenLabsAgentId)) {
          agentIds.push({ id: v.elevenLabsAgentId, source: `VoiceAgent: ${v.id}` });
        }
      }
    } catch (e) {
      console.warn('Could not fetch voice agents:', (e as Error).message);
    }

    try {
      const crmVoiceAgents = await prisma.crmVoiceAgent.findMany({
        where: { elevenLabsAgentId: { not: null } },
        select: { id: true, elevenLabsAgentId: true },
      });
      for (const c of crmVoiceAgents) {
        if (c.elevenLabsAgentId && !agentIds.some((a) => a.id === c.elevenLabsAgentId)) {
          agentIds.push({ id: c.elevenLabsAgentId, source: `CrmVoiceAgent: ${c.id}` });
        }
      }
    } catch {
      // CrmVoiceAgent may not exist in schema
    }
  }

  if (agentIds.length === 0) {
    console.log('No agents to update.');
    return;
  }

  console.log(`\n🔧 Setting turn_timeout_seconds=${TURN_TIMEOUT_SECONDS} for ${agentIds.length} agent(s)\n`);

  let ok = 0;
  let fail = 0;
  for (const { id, source } of agentIds) {
    const result = await patchAgentTurnTimeout(id, apiKey);
    if (result.success) {
      console.log(`   ✅ ${source} (${id})`);
      ok++;
    } else {
      console.log(`   ❌ ${source} (${id}): ${result.error}`);
      fail++;
    }
  }

  console.log(`\n✅ Updated ${ok} agent(s)${fail > 0 ? `, ${fail} failed` : ''}.\n`);
}

main().catch(console.error);
