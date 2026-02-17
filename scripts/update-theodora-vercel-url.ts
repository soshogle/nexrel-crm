/**
 * Update Theodora's Website record with the new Vercel deployment URL.
 * Run this AFTER renaming the Vercel project to "theodora-stavropoulos-remax".
 *
 * Steps:
 * 1. In Vercel: Settings → General → Project Name → change to "theodora-stavropoulos-remax"
 * 2. Run: npx tsx scripts/update-theodora-vercel-url.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const NEW_VERCEL_URL = 'https://theodora-stavropoulos-remax.vercel.app';

async function main() {
  console.log('🔄 Updating Theodora\'s website deployment URL\n');

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    return;
  }

  const website = theodora.websites[0];
  if (!website) {
    console.error('❌ No website found for Theodora');
    return;
  }

  const previousUrl = website.vercelDeploymentUrl;
  await prisma.website.update({
    where: { id: website.id },
    data: { vercelDeploymentUrl: NEW_VERCEL_URL },
  });

  console.log('✅ Updated successfully');
  console.log('   Website:', website.name);
  console.log('   Previous URL:', previousUrl || '(none)');
  console.log('   New URL:', NEW_VERCEL_URL);
  console.log('\n   CRM links will now point to the new URL.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
