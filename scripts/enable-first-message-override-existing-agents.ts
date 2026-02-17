/**
 * Enable "First message" override on existing ElevenLabs agents
 *
 * Run this to fix agents created before the automatic override was added.
 * Usage: npx tsx scripts/enable-first-message-override-existing-agents.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { prisma } from '../lib/db';
import { enableFirstMessageOverride } from '../lib/elevenlabs-overrides';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const apiKey = process.env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_RE_API_KEY;

async function main() {
  if (!apiKey) {
    console.error('❌ ELEVENLABS_API_KEY or ELEVENLABS_RE_API_KEY required');
    process.exit(1);
  }

  const agentIds: string[] = [];

  // VoiceAgent table
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: { elevenLabsAgentId: true, name: true },
  });
  for (const v of voiceAgents) {
    if (v.elevenLabsAgentId) agentIds.push(v.elevenLabsAgentId);
  }

  // User.crmVoiceAgentId (AI Brain)
  const users = await prisma.user.findMany({
    where: { crmVoiceAgentId: { not: null } },
    select: { crmVoiceAgentId: true, name: true },
  });
  for (const u of users) {
    if (u.crmVoiceAgentId) agentIds.push(u.crmVoiceAgentId);
  }

  // Website.elevenLabsAgentId
  const websites = await prisma.website.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: { elevenLabsAgentId: true, name: true },
  });
  for (const w of websites) {
    if (w.elevenLabsAgentId) agentIds.push(w.elevenLabsAgentId);
  }

  // DocpenVoiceAgent (elevenLabsAgentId is required, no filter needed)
  const docpenAgents = await prisma.docpenVoiceAgent.findMany({
    select: { elevenLabsAgentId: true },
  });
  for (const d of docpenAgents) {
    if (d.elevenLabsAgentId) agentIds.push(d.elevenLabsAgentId);
  }

  // REAIEmployeeAgent (Real Estate AI employees)
  const reAgents = await prisma.rEAIEmployeeAgent.findMany({
    select: { elevenLabsAgentId: true },
  });
  for (const r of reAgents) agentIds.push(r.elevenLabsAgentId);

  // IndustryAIEmployeeAgent
  const industryAgents = await prisma.industryAIEmployeeAgent.findMany({
    select: { elevenLabsAgentId: true },
  });
  for (const i of industryAgents) agentIds.push(i.elevenLabsAgentId);

  const uniqueIds = [...new Set(agentIds)];
  console.log(`Found ${uniqueIds.length} unique agent(s) to update\n`);

  let ok = 0;
  let fail = 0;
  for (const id of uniqueIds) {
    const r = await enableFirstMessageOverride(id, apiKey);
    if (r.success) {
      ok++;
      console.log(`✅ ${id}`);
    } else {
      fail++;
      console.log(`❌ ${id}: ${r.error}`);
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
