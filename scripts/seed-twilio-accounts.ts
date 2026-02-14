/**
 * Seed TwilioAccount records for primary + backup
 * Uses env-based credentials (TWILIO_PRIMARY_*, TWILIO_BACKUP_*)
 *
 * Run: npx tsx scripts/seed-twilio-accounts.ts
 *
 * Required env vars (set in .env or Vercel):
 *   TWILIO_PRIMARY_ACCOUNT_SID=AC...
 *   TWILIO_PRIMARY_AUTH_TOKEN=...
 *   TWILIO_BACKUP_ACCOUNT_SID=AC...
 *   TWILIO_BACKUP_AUTH_TOKEN=...
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const PRIMARY_ACCOUNT_SID = process.env.TWILIO_PRIMARY_ACCOUNT_SID;
const BACKUP_ACCOUNT_SID = process.env.TWILIO_BACKUP_ACCOUNT_SID;

async function main() {
  console.log('📞 Seeding Twilio accounts...\n');

  if (!PRIMARY_ACCOUNT_SID) {
    console.error('❌ TWILIO_PRIMARY_ACCOUNT_SID is required');
    process.exit(1);
  }

  if (!BACKUP_ACCOUNT_SID) {
    console.error('❌ TWILIO_BACKUP_ACCOUNT_SID is required');
    process.exit(1);
  }

  // Upsert primary
  const primary = await prisma.twilioAccount.upsert({
    where: { accountSid: PRIMARY_ACCOUNT_SID },
    update: {
      name: 'Primary',
      envKey: 'PRIMARY',
      authToken: null,
      isPrimary: true,
      isActive: true,
      status: 'ACTIVE',
    },
    create: {
      name: 'Primary',
      accountSid: PRIMARY_ACCOUNT_SID,
      envKey: 'PRIMARY',
      authToken: null,
      isPrimary: true,
      isActive: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Primary account:', primary.name, `(${primary.accountSid})`);

  // Upsert backup
  const backup = await prisma.twilioAccount.upsert({
    where: { accountSid: BACKUP_ACCOUNT_SID },
    update: {
      name: 'Backup',
      envKey: 'BACKUP',
      authToken: null,
      isPrimary: false,
      isActive: true,
      status: 'ACTIVE',
    },
    create: {
      name: 'Backup',
      accountSid: BACKUP_ACCOUNT_SID,
      envKey: 'BACKUP',
      authToken: null,
      isPrimary: false,
      isActive: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Backup account:', backup.name, `(${backup.accountSid})`);

  // Ensure only one primary
  await prisma.twilioAccount.updateMany({
    where: {
      accountSid: { not: PRIMARY_ACCOUNT_SID },
      isPrimary: true,
    },
    data: { isPrimary: false },
  });

  console.log('\n📋 Vercel environment variables to set:');
  console.log('   TWILIO_PRIMARY_ACCOUNT_SID');
  console.log('   TWILIO_PRIMARY_AUTH_TOKEN');
  console.log('   TWILIO_BACKUP_ACCOUNT_SID');
  console.log('   TWILIO_BACKUP_AUTH_TOKEN');
  console.log('\n🎉 Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
