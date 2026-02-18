/**
 * Fix all existing voice agents to be multilingual.
 * - Updates DB (where applicable): replaces "Respond in English" with multilingual prompt
 * - Pushes to ElevenLabs: syncs updated prompt (multilingual via LANGUAGE_PROMPT_SECTION)
 *
 * Covers: VoiceAgent, DocpenVoiceAgent, Website, User.crmVoiceAgentId,
 *         IndustryAIEmployeeAgent, ProfessionalAIEmployeeAgent, REAIEmployeeAgent
 *
 * Excludes: CRM landing page agents (NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID, NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID)
 *
 * Run: npx tsx scripts/fix-all-agents-multilingual.ts
 */

import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

import { prisma } from "../lib/db";
import { elevenLabsProvisioning } from "../lib/elevenlabs-provisioning";
import { ensureMultilingualPrompt } from "../lib/voice-languages";

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

/** Agent IDs to skip - CRM landing page agents (do not modify) */
const LANDING_PAGE_AGENT_IDS = new Set(
  [
    process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID,
    process.env.NEXT_PUBLIC_ELEVENLABS_HOME_AGENT_ID,
  ].filter(Boolean) as string[]
);

async function fetchCurrentPrompt(
  agentId: string,
  apiKey: string
): Promise<string | null> {
  const res = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${agentId}`, {
    headers: { "xi-api-key": apiKey },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.conversation_config?.agent?.prompt?.prompt ?? null;
}

async function fixAgent(
  agentId: string,
  name: string,
  originalPrompt: string | null,
  userId: string | undefined,
  updateDb: ((prompt: string) => Promise<void>) | null
): Promise<{ updated: boolean; error?: string; skipped?: "landing" }> {
  if (LANDING_PAGE_AGENT_IDS.has(agentId)) {
    return { updated: false, skipped: "landing" };
  }
  const { voiceAIPlatform } = await import("../lib/voice-ai-platform");
  const apiKey =
    process.env.ELEVENLABS_API_KEY ||
    (await voiceAIPlatform.getMasterApiKey()) ||
    null;
  if (!apiKey) {
    return { updated: false, error: "No API key" };
  }

  let promptToUse = originalPrompt;
  if (!promptToUse) {
    promptToUse = await fetchCurrentPrompt(agentId, apiKey);
  }
  if (!promptToUse) {
    return { updated: false, error: "Could not get current prompt" };
  }

  const multilingualPrompt = ensureMultilingualPrompt(promptToUse);
  const needsUpdate =
    multilingualPrompt !== promptToUse ||
    promptToUse.includes("Respond in English") ||
    promptToUse.includes("Répondez en français") ||
    promptToUse.includes("Responde en español");

  if (!needsUpdate) {
    return { updated: false }; // Already multilingual via prompt
  }

  if (updateDb) {
    await updateDb(multilingualPrompt);
  }

  const result = await elevenLabsProvisioning.updateAgent(
    agentId,
    { systemPrompt: multilingualPrompt },
    userId
  );

  if (!result.success) return { updated: false, error: result.error };
  return { updated: true };
}

async function main() {
  console.log("🔧 Fixing all voice agents to be multilingual...\n");

  let totalUpdated = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  // 1. VoiceAgent
  const voiceAgents = await prisma.voiceAgent.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      systemPrompt: true,
      userId: true,
    },
  });
  console.log(`📋 VoiceAgent: ${voiceAgents.length} agents`);
  for (const a of voiceAgents) {
    const agentId = a.elevenLabsAgentId!;
    const r = await fixAgent(
      agentId,
      a.name,
      a.systemPrompt || "",
      a.userId,
      async (p) => {
        await prisma.voiceAgent.update({
          where: { id: a.id },
          data: { systemPrompt: p },
        });
      }
    );
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${a.name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 2. DocpenVoiceAgent
  const docpenAgents = await prisma.docpenVoiceAgent.findMany({
    select: {
      id: true,
      profession: true,
      elevenLabsAgentId: true,
      systemPrompt: true,
      userId: true,
    },
  });
  console.log(`\n📋 DocpenVoiceAgent: ${docpenAgents.length} agents`);
  for (const a of docpenAgents) {
    const name = `Docpen ${a.profession}`;
    const r = await fixAgent(
      a.elevenLabsAgentId,
      name,
      a.systemPrompt || "",
      a.userId,
      async (p) => {
        await prisma.docpenVoiceAgent.update({
          where: { id: a.id },
          data: { systemPrompt: p },
        });
      }
    );
    if (r.updated) {
      console.log(`  ✅ ${name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 3. Website (elevenLabsAgentId)
  const websites = await prisma.website.findMany({
    where: { elevenLabsAgentId: { not: null } },
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      userId: true,
    },
  });
  console.log(`\n📋 Website: ${websites.length} agents`);
  for (const w of websites) {
    const agentId = w.elevenLabsAgentId!;
    const r = await fixAgent(agentId, w.name, null, w.userId, null);
    if (r.updated) {
      console.log(`  ✅ ${w.name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${w.name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${w.name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 4. IndustryAIEmployeeAgent
  const industryAgents = await prisma.industryAIEmployeeAgent.findMany({
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      userId: true,
    },
  });
  console.log(`\n📋 IndustryAIEmployeeAgent: ${industryAgents.length} agents`);
  for (const a of industryAgents) {
    const r = await fixAgent(a.elevenLabsAgentId, a.name, null, a.userId, null);
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${a.name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 5. ProfessionalAIEmployeeAgent
  const professionalAgents = await prisma.professionalAIEmployeeAgent.findMany({
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      userId: true,
    },
  });
  console.log(`\n📋 ProfessionalAIEmployeeAgent: ${professionalAgents.length} agents`);
  for (const a of professionalAgents) {
    const r = await fixAgent(a.elevenLabsAgentId, a.name, null, a.userId, null);
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${a.name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 6. User.crmVoiceAgentId (CRM voice assistant)
  const usersWithCrmAgent = await prisma.user.findMany({
    where: { crmVoiceAgentId: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      crmVoiceAgentId: true,
    },
  });
  console.log(`\n📋 User CRM Voice Agent: ${usersWithCrmAgent.length} agents`);
  for (const u of usersWithCrmAgent) {
    const agentId = u.crmVoiceAgentId!;
    const name = u.name || u.email || u.id;
    const r = await fixAgent(agentId, name, null, u.id, null);
    if (r.updated) {
      console.log(`  ✅ ${name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  // 7. REAIEmployeeAgent
  const reAgents = await prisma.rEAIEmployeeAgent.findMany({
    select: {
      id: true,
      name: true,
      elevenLabsAgentId: true,
      userId: true,
    },
  });
  console.log(`\n📋 REAIEmployeeAgent: ${reAgents.length} agents`);
  for (const a of reAgents) {
    const r = await fixAgent(a.elevenLabsAgentId, a.name, null, a.userId, null);
    if (r.updated) {
      console.log(`  ✅ ${a.name}`);
      totalUpdated++;
    } else if (r.skipped === "landing") {
      console.log(`  ⏭️  ${a.name} (landing page - skipped)`);
      totalSkipped++;
    } else if (r.error) {
      console.error(`  ❌ ${a.name}: ${r.error}`);
      totalFailed++;
    } else {
      totalSkipped++;
    }
  }

  if (LANDING_PAGE_AGENT_IDS.size > 0) {
    console.log(`\n📌 Landing page agents excluded: ${[...LANDING_PAGE_AGENT_IDS].join(", ")}`);
  }
  console.log(`\n📊 Done. Updated: ${totalUpdated}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
