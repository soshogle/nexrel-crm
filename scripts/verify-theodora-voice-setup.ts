/**
 * Verify Theodora's Voice AI website setup.
 * Run: npx tsx scripts/verify-theodora-voice-setup.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const WEBSITE_ID = 'cmlpuuy8a0001pu4gz4y97hrm';

async function main() {
  console.log('🔍 Verifying Theodora Voice AI Setup\n');
  console.log('═'.repeat(60));

  let ok = true;

  // 1. User exists
  const user = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
  });
  if (!user) {
    console.log('❌ User not found:', THEODORA_EMAIL);
    ok = false;
  } else {
    console.log('✅ User:', user.name, `(${user.email})`);
  }

  // 2. Website record
  const website = await prisma.website.findUnique({
    where: { id: WEBSITE_ID },
  });
  if (!website) {
    console.log('❌ Website not found:', WEBSITE_ID);
    ok = false;
  } else {
    console.log('✅ Website:', website.name);
    console.log('   ID:', website.id);
    console.log('   voiceAIEnabled:', website.voiceAIEnabled);
    console.log('   elevenLabsAgentId:', website.elevenLabsAgentId || '(not set)');
    if (!website.voiceAIEnabled || !website.elevenLabsAgentId) {
      console.log('   ⚠️  Voice AI must be enabled and agent ID set');
      ok = false;
    }
    if (website.userId !== user?.id) {
      console.log('   ⚠️  Website userId does not match Theodora');
      ok = false;
    }
  }

  // 3. CRM env vars
  const crmUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  const secret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
  console.log('\n📋 CRM env (this repo):');
  console.log('   WEBSITE_VOICE_CONFIG_SECRET:', secret ? '***set***' : '❌ NOT SET');
  if (!secret) {
    console.log('   ⚠️  Template needs this to fetch voice config from CRM');
    ok = false;
  }

  // 4. Test voice-config API (if we can reach it)
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  console.log('\n📡 Testing voice-config API:', `${baseUrl}/api/websites/${WEBSITE_ID}/voice-config`);
  try {
    const res = await fetch(`${baseUrl}/api/websites/${WEBSITE_ID}/voice-config`, {
      headers: secret ? { 'x-website-secret': secret } : {},
    });
    if (res.ok) {
      const data = await res.json();
      console.log('✅ API response:', JSON.stringify(data, null, 2));
      if (!data.enableVoiceAI || !data.agentId) {
        console.log('   ⚠️  enableVoiceAI or agentId missing in response');
        ok = false;
      }
    } else {
      console.log('❌ API error:', res.status, await res.text());
      ok = false;
    }
  } catch (e: any) {
    console.log('⚠️  Could not reach API (is CRM running?):', e.message);
  }

  // 5. Template env checklist
  console.log('\n📋 Theodora\'s Vercel project (theodora-stavropoulos-remax) must have:');
  console.log('   NEXREL_CRM_URL=https://www.nexrel.soshogle.com');
  console.log('   NEXREL_WEBSITE_ID=' + WEBSITE_ID);
  console.log('   WEBSITE_VOICE_CONFIG_SECRET=<same as CRM>');

  console.log('\n' + '═'.repeat(60));
  if (ok) {
    console.log('✅ Setup looks correct. Voice bubble should show when template env vars are set.');
  } else {
    console.log('⚠️  Some checks failed. Fix the issues above.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
