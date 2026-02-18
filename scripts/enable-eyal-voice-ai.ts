#!/usr/bin/env tsx
/**
 * Enable Voice AI on Eyal's Darksword Armory website.
 * Sets voiceAIEnabled=true and elevenLabsAgentId (default: landing page demo agent).
 *
 * Run: npx tsx scripts/enable-eyal-voice-ai.ts
 * Or with custom agent: ELEVENLABS_AGENT_ID=agent_xxx npx tsx scripts/enable-eyal-voice-ai.ts
 */

import { prisma } from "@/lib/db";

const EYAL_WEBSITE_ID = "cmlkk9awe0002puiqm64iqw7t";
const DEFAULT_AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_DEMO_AGENT_ID || "agent_0301kap49d2afq5vp04v0r6p5k6q";

const SWORDSMAN_PROMPT = `You are a multilingual master swordsman and expert in medieval weaponry, sword-making, and antique arms. You represent Darksword Armory. Speak fluently in the visitor's language. Share knowledge about swords, armor, metallurgy, and antiques. Be warm and concise.`;

async function main() {
  const agentId = process.env.ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID;

  const website = await prisma.website.findUnique({
    where: { id: EYAL_WEBSITE_ID },
    select: { id: true, name: true, voiceAIEnabled: true, elevenLabsAgentId: true },
  });

  if (!website) {
    console.error("❌ Darksword Armory website not found:", EYAL_WEBSITE_ID);
    process.exit(1);
  }

  await prisma.website.update({
    where: { id: EYAL_WEBSITE_ID },
    data: {
      voiceAIEnabled: true,
      elevenLabsAgentId: agentId,
      voiceAIConfig: {
        customPrompt: SWORDSMAN_PROMPT,
      },
    },
  });

  console.log("✅ Voice AI enabled for Darksword Armory");
  console.log("   Website:", website.name);
  console.log("   Agent ID:", agentId);
  console.log("   Custom prompt: multilingual swordsman expert");
  console.log("\n   The voice bubble will appear on darksword-armory when deployed.");
  console.log("   Ensure NEXREL_CRM_URL, NEXREL_WEBSITE_ID, WEBSITE_VOICE_CONFIG_SECRET are set in Vercel.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
