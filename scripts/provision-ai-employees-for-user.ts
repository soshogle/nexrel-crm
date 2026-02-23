#!/usr/bin/env npx tsx
/**
 * Provision AI employees for a specific user (Professional, RE, Industry).
 * For accounts created by super admin that may not have gone through normal onboarding.
 *
 * Run: npx tsx scripts/provision-ai-employees-for-user.ts <userEmail>
 * Run: npx tsx scripts/provision-ai-employees-for-user.ts --search Theodora  (to find users)
 *
 * Example: npx tsx scripts/provision-ai-employees-for-user.ts theodora@example.com
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import { prisma } from '../lib/db';
import { provisionAIEmployeesForUserAsync } from '../lib/ai-employee-auto-provision';

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: npx tsx scripts/provision-ai-employees-for-user.ts <userEmail>');
    console.error('   or: npx tsx scripts/provision-ai-employees-for-user.ts --search <name>');
    process.exit(1);
  }

  // Search mode: list users matching name or email
  if (arg === '--search') {
    const search = process.argv[3];
    if (!search) {
      console.error('Usage: npx tsx scripts/provision-ai-employees-for-user.ts --search <name>');
      process.exit(1);
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      },
      select: { id: true, email: true, name: true, industry: true },
      take: 20,
    });
    if (users.length === 0) {
      console.error(`No users found matching "${search}"`);
      process.exit(1);
    }
    console.log(`Found ${users.length} user(s):\n`);
    for (const u of users) {
      console.log(`  ${u.email || '(no email)'}  |  ${u.name || '(no name)'}  |  ${u.industry || 'no industry'}`);
    }
    console.log(`\nRun with exact email: npx tsx scripts/provision-ai-employees-for-user.ts <email>`);
    return;
  }

  const userEmail = arg;

  // Try exact match first, then case-insensitive
  let user = await prisma.user.findFirst({
    where: { email: userEmail },
    select: { id: true, email: true, industry: true },
  });

  if (!user) {
    user = await prisma.user.findFirst({
      where: { email: { equals: userEmail, mode: 'insensitive' } },
      select: { id: true, email: true, industry: true },
    });
  }

  if (!user) {
    console.error(`User not found: ${userEmail}`);
    console.error('\nTry searching: npx tsx scripts/provision-ai-employees-for-user.ts --search Theodora');
    process.exit(1);
  }

  console.log(`Provisioning AI employees for ${user.email} (${user.industry || 'no industry'})...`);
  await provisionAIEmployeesForUserAsync(user.id);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
