/**
 * Update real estate website Voice AI agents with the full searchListings tool schema.
 * Adds bathrooms, min_price, max_price, property_type so the agent knows to use them
 * when users say things like "2 baths" or "between 400k and 500k".
 *
 * Run: npx tsx scripts/update-real-estate-agent-tools.ts
 * Or for a specific website: npx tsx scripts/update-real-estate-agent-tools.ts <websiteId>
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const websiteIdArg = process.argv[2];

  console.log('🔧 Updating real estate Voice AI agent tools (searchListings params)\n');

  let websites: { id: string; name: string; elevenLabsAgentId: string | null; userId: string }[];

  if (websiteIdArg) {
    const w = await prisma.website.findUnique({
      where: { id: websiteIdArg },
      select: { id: true, name: true, elevenLabsAgentId: true, userId: true },
    });
    if (!w) {
      console.error('❌ Website not found:', websiteIdArg);
      process.exit(1);
    }
    websites = [w];
  } else {
    websites = await prisma.website.findMany({
      where: {
        voiceAIEnabled: true,
        elevenLabsAgentId: { not: null },
      },
      select: { id: true, name: true, elevenLabsAgentId: true, userId: true },
    });
  }

  if (websites.length === 0) {
    console.log('No websites with Voice AI enabled and agent ID found.');
    return;
  }

  const { websiteVoiceAI } = await import('../lib/website-builder/voice-ai');

  for (const w of websites) {
    const agentId = w.elevenLabsAgentId;
    if (!agentId) continue;

    console.log(`\n📌 ${w.name} (${w.id})`);
    console.log('   Agent:', agentId);

    const result = await websiteVoiceAI.updateRealEstateAgentTools(agentId, w.userId);

    if (result.success) {
      console.log('   ✅ Tools updated (searchListings now includes bathrooms, min_price, max_price, property_type)');
    } else {
      console.log('   ❌ Failed:', result.error);
    }
  }

  console.log('\n✅ Done.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
