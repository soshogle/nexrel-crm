/**
 * Create or update Website record for Theodora Stavropoulos with Voice AI enabled.
 * Use this when her site (theodora-stavropoulos-remaxlate) needs the ElevenLabs voice bubble.
 *
 * Run: npx tsx scripts/create-theodora-website.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';

async function main() {
  console.log('🌐 Creating/updating Website record for Theodora Stavropoulos\n');

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: {
      websites: true,
      voiceAgents: {
        where: { elevenLabsAgentId: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!theodora) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    console.log('   Run create-theodora-agent.ts first.');
    return;
  }

  console.log('✅ Found user:', theodora.name);

  const voiceAgent = theodora.voiceAgents[0];
  const elevenLabsAgentId = voiceAgent?.elevenLabsAgentId ?? null;

  if (!elevenLabsAgentId) {
    console.error('❌ Theodora has no VoiceAgent with ElevenLabs agent ID.');
    console.log('   Run setup-theodora-voice-agent.ts first to create the phone agent.');
    console.log('   Or create a website via the Website Builder with Voice AI enabled.');
    return;
  }

  console.log('✅ Found ElevenLabs agent:', elevenLabsAgentId);

  const existing = theodora.websites.find(
    (w) => w.voiceAIEnabled && w.elevenLabsAgentId
  ) || theodora.websites[0];

  if (existing && existing.voiceAIEnabled && existing.elevenLabsAgentId) {
    console.log('\n✅ Website already exists with Voice AI enabled:');
    console.log('   ID:', existing.id);
    console.log('   Name:', existing.name);
    console.log('   Voice AI:', existing.voiceAIEnabled);
    console.log('   Agent ID:', existing.elevenLabsAgentId);
    console.log('\n📋 Add these to Theodora\'s Vercel project (theodora-stavropoulos-remax):');
    console.log('   NEXREL_CRM_URL=https://www.nexrel.soshogle.com');
    console.log('   NEXREL_WEBSITE_ID=' + existing.id);
    console.log('   WEBSITE_VOICE_CONFIG_SECRET=<same as CRM>');
    return;
  }

  if (existing) {
    console.log('\n📝 Updating existing website:', existing.name, '(' + existing.id + ')');
    const updated = await prisma.website.update({
      where: { id: existing.id },
      data: {
        voiceAIEnabled: true,
        elevenLabsAgentId,
        voiceAIConfig: {
          agentId: elevenLabsAgentId,
          enabled: true,
        },
      },
    });
    console.log('✅ Updated. Voice AI enabled.');
    console.log('\n📋 Add these to Theodora\'s Vercel project (theodora-stavropoulos-remax):');
    console.log('   NEXREL_CRM_URL=https://www.nexrel.soshogle.com');
    console.log('   NEXREL_WEBSITE_ID=' + updated.id);
    console.log('   WEBSITE_VOICE_CONFIG_SECRET=<same as CRM>');
    return;
  }

  console.log('\n📝 Creating new Website record...');
  const website = await prisma.website.create({
    data: {
      userId: theodora.id,
      name: 'Theodora Stavropoulos | RE/MAX 3000',
      type: 'SERVICE_TEMPLATE',
      templateType: 'SERVICE',
      status: 'READY',
      buildProgress: 100,
      structure: {},
      seoData: {},
      voiceAIEnabled: true,
      elevenLabsAgentId,
      voiceAIConfig: {
        agentId: elevenLabsAgentId,
        enabled: true,
      },
      enableTavusAvatar: false,
    },
  });

  console.log('✅ Created Website:', website.name);
  console.log('   ID:', website.id);
  console.log('\n📋 Add these to Theodora\'s Vercel project (theodora-stavropoulos-remax):');
  console.log('   NEXREL_CRM_URL=https://www.nexrel.soshogle.com');
  console.log('   NEXREL_WEBSITE_ID=' + website.id);
  console.log('   WEBSITE_VOICE_CONFIG_SECRET=<same as CRM>');
  console.log('\n   Then redeploy the site.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
