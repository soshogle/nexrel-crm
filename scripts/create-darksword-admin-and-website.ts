#!/usr/bin/env tsx
/**
 * Create Darksword Armory admin user + import website
 * - User: eyal@darksword-armory.com with admin access
 * - Industry: retail (via industryNiche; Industry enum uses TECHNOLOGY)
 * - Website: David Protein layout + Darksword content, ready for editing
 */

import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

const EMAIL = 'eyal@darksword-armory.com';
const PASSWORD = 'DarkswordArmory2026!'; // Change after first login
const NAME = 'Eyal Azerad';

async function main() {
  console.log('Creating Darksword Armory admin user and website...\n');

  // Load structure
  const structurePath = path.join(process.cwd(), 'darksword-davidprotein-structure.json');
  if (!fs.existsSync(structurePath)) {
    console.error('darksword-davidprotein-structure.json not found.');
    console.error('Run first: npx tsx scripts/build-darksword-davidprotein-site.ts');
    process.exit(1);
  }
  const structure = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));

  const normalizedEmail = EMAIL.trim().toLowerCase();

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (user) {
    console.log('User already exists:', normalizedEmail);
    console.log('Updating website if needed...\n');
  } else {
    const hashedPassword = await bcrypt.hash(PASSWORD, 12);
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: NAME,
        role: 'SUPER_ADMIN',
        industry: 'TECHNOLOGY', // Industry enum has no RETAIL; TECHNOLOGY is closest
        industryNiche: 'retail',
        onboardingCompleted: true,
      },
    });
    console.log('User created:', normalizedEmail);
  }

  // Delete existing website for this user (one website per user)
  const existingWebsite = await prisma.website.findFirst({
    where: { userId: user.id },
  });
  if (existingWebsite) {
    await prisma.website.delete({
      where: { id: existingWebsite.id },
    });
    console.log('Removed existing website to replace with Darksword site.');
  }

  // Create website with Darksword structure
  const website = await prisma.website.create({
    data: {
      userId: user.id,
      name: 'Darksword Armory',
      type: 'PRODUCT_TEMPLATE',
      templateType: 'PRODUCT',
      status: 'READY',
      buildProgress: 100,
      structure,
      seoData: structure.seo || structure.pages?.[0]?.seo || {},
    },
  });

  console.log('\n✅ Done!\n');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📧 Email:    ', normalizedEmail);
  console.log('🔑 Password:', PASSWORD);
  console.log('👤 Name:    ', NAME);
  console.log('🔐 Role:    ', user.role, '(admin access)');
  console.log('🏪 Industry:', user.industry, '/', user.industryNiche || 'retail');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n🌐 Website:');
  console.log('   ID:       ', website.id);
  console.log('   Name:     ', website.name);
  console.log('   Editor:   ', `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard/websites/${website.id}`);
  console.log('\n⚠️  Change the password after first login.');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
