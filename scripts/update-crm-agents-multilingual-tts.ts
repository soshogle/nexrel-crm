/**
 * Update existing CRM voice agents to use eleven_multilingual_v2 TTS for accent-free multilingual speech.
 * Note: ElevenLabs API does NOT accept "multilingual" as language - only ISO codes (en, es, fr, etc).
 * Multilingual behavior comes from: TTS model + LANGUAGE_PROMPT_SECTION + preferred_language dynamic var.
 *
 * EXCLUDES: Landing page agents (NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID, NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID)
 *
 * Run: npx tsx scripts/update-crm-agents-multilingual-tts.ts
 *
 * Includes 2s delay between requests and retry on 429 to avoid rate limits.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { prisma } from '../lib/db';

const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

/** Delay between API calls (ms) to avoid rate limits */
const DELAY_MS = 2000;
/** Retry 429 errors after this many ms */
const RATE_LIMIT_BACKOFF_MS = 60000;
const MAX_RETRIES = 2;

/** Landing page agents - DO NOT MODIFY */
const LANDING_PAGE_AGENT_IDS = new Set(
  [
    process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID,
    process.env.NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID,
  ].filter(Boolean) as string[]
);

async function getApiKey(): Promise<string> {
  const { voiceAIPlatform } = await import('../lib/voice-ai-platform');
  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVENLABS_RE_API_KEY ||
    (await voiceAIPlatform.getMasterApiKey()) ||
    '';
  if (!apiKey) throw new Error('No ElevenLabs API key configured');
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateAgentTtsAndLanguage(
  agentId: string,
  apiKey: string
): Promise<{ updated: boolean; error?: string }> {
  if (LANDING_PAGE_AGENT_IDS.has(agentId)) {
    return { updated: false };
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const getRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      headers: { 'xi-api-key': apiKey },
    });
    if (getRes.status === 429 && attempt < MAX_RETRIES) {
      console.log(`    ⏳ Rate limited, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry...`);
      await sleep(RATE_LIMIT_BACKOFF_MS);
      continue;
    }
    if (!getRes.ok) {
      return { updated: false, error: `Fetch failed: ${getRes.status}` };
    }

    const agent = await getRes.json();
    const conv = agent.conversation_config || {};
    const tts = conv.tts || {};
    const currentModelId = tts.model_id;

    if (currentModelId === 'eleven_multilingual_v2') {
      return { updated: false }; // Already up to date
    }

    const patchPayload = {
      conversation_config: {
        ...conv,
        tts: {
          ...tts,
          model_id: 'eleven_multilingual_v2',
        },
      },
    };

    const patchRes = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchPayload),
    });

    if (patchRes.status === 429 && attempt < MAX_RETRIES) {
      console.log(`    ⏳ Rate limited, waiting ${RATE_LIMIT_BACKOFF_MS / 1000}s before retry...`);
      await sleep(RATE_LIMIT_BACKOFF_MS);
      continue;
    }
    if (!patchRes.ok) {
      const errText = await patchRes.text();
      return { updated: false, error: `PATCH failed: ${patchRes.status} - ${errText}` };
    }

    return { updated: true };
  }
  return { updated: false, error: 'Max retries exceeded (rate limited)' };
}

async function main() {
  console.log('🔧 Updating CRM voice agents to eleven_multilingual_v2 TTS...\n');
  console.log('   (Excludes landing page agents)\n');

  const apiKey = await getApiKey();
  const agentIds: { id: string; name: string }[] = [];

  // VoiceAgent
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: { name: true, elevenLabsAgentId: true },
  });
  voiceAgents.forEach((a) => {
    if (a.elevenLabsAgentId) agentIds.push({ id: a.elevenLabsAgentId, name: a.name });
  });

  // User.crmVoiceAgentId
  const usersWithCrm = await prisma.user.findMany({
    where: { crmVoiceAgentId: { not: null } },
    select: { name: true, crmVoiceAgentId: true },
  });
  usersWithCrm.forEach((u) => {
    if (u.crmVoiceAgentId) agentIds.push({ id: u.crmVoiceAgentId, name: u.name || 'CRM User' });
  });

  // DocpenVoiceAgent
  const docpen = await prisma.docpenVoiceAgent.findMany({
    select: { profession: true, elevenLabsAgentId: true },
  });
  docpen.forEach((a) =>
    agentIds.push({ id: a.elevenLabsAgentId, name: `Docpen ${a.profession}` })
  );

  // Website
  const websites = await prisma.website.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: { name: true, elevenLabsAgentId: true },
  });
  websites.forEach((w) => {
    if (w.elevenLabsAgentId) agentIds.push({ id: w.elevenLabsAgentId, name: w.name });
  });

  // IndustryAIEmployeeAgent
  const industry = await prisma.industryAIEmployeeAgent.findMany({
    select: { name: true, elevenLabsAgentId: true },
  });
  industry.forEach((a) => agentIds.push({ id: a.elevenLabsAgentId, name: a.name }));

  // ProfessionalAIEmployeeAgent
  const professional = await prisma.professionalAIEmployeeAgent.findMany({
    select: { name: true, elevenLabsAgentId: true },
  });
  professional.forEach((a) => agentIds.push({ id: a.elevenLabsAgentId, name: a.name }));

  // REAIEmployeeAgent
  const re = await prisma.rEAIEmployeeAgent.findMany({
    select: { name: true, elevenLabsAgentId: true },
  });
  re.forEach((a) => agentIds.push({ id: a.elevenLabsAgentId, name: a.name }));

  const uniqueIds = [...new Map(agentIds.map((x) => [x.id, x])).values()];
  console.log(`📋 Found ${uniqueIds.length} CRM voice agents to check\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < uniqueIds.length; i++) {
    const { id, name } = uniqueIds[i];
    if (i > 0) await sleep(DELAY_MS); // Rate limit: 2s between requests
    if (LANDING_PAGE_AGENT_IDS.has(id)) {
      console.log(`  ⏭️  ${name} (landing page - skipped)`);
      skipped++;
      continue;
    }
    const result = await updateAgentTtsAndLanguage(id, apiKey);
    if (result.updated) {
      console.log(`  ✅ ${name}`);
      updated++;
    } else if (result.error) {
      console.error(`  ❌ ${name}: ${result.error}`);
      failed++;
    } else {
      skipped++;
    }
  }

  if (LANDING_PAGE_AGENT_IDS.size > 0) {
    console.log(`\n📌 Landing page agents excluded: ${[...LANDING_PAGE_AGENT_IDS].join(', ')}`);
  }
  console.log(`\n📊 Done. Updated: ${updated}, Skipped (already ok): ${skipped}, Failed: ${failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
