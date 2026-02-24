/**
 * Verify which Twilio account (primary vs backup) each phone number comes from.
 * Run: npx tsx scripts/verify-twilio-phone-sources.ts
 *
 * Loads .env.local for credentials.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(process.cwd(), '.env.local') });
config({ path: path.join(process.cwd(), '.env') });

async function main() {
  const { getPrimaryCredentials, getBackupCredentials } = await import('../lib/twilio-credentials');
  const { getPhoneNumbersFromPlatformAccounts } = await import('../lib/twilio-phone-numbers');
  const { prisma } = await import('../lib/db');

  console.log('=== Twilio Phone Number Source Verification ===\n');

  // 1. Check TwilioAccount table
  const accounts = await prisma.twilioAccount.findMany({
    where: { isActive: true },
    select: { id: true, name: true, accountSid: true, envKey: true, isPrimary: true },
  });
  console.log('TwilioAccount rows:', JSON.stringify(accounts, null, 2));

  // 2. Resolve credentials (mask SIDs for safety)
  const primary = await getPrimaryCredentials();
  const backup = await getBackupCredentials();

  console.log('\nPrimary credentials:', primary ? `SID ${primary.accountSid.slice(0, 8)}...` : 'NOT FOUND');
  console.log('Backup credentials:', backup ? `SID ${backup.accountSid.slice(0, 8)}...` : 'NOT FOUND');

  if (primary && backup && primary.accountSid === backup.accountSid) {
    console.log('\n⚠️  WARNING: Primary and backup resolve to the SAME account SID!');
  }

  // 3. Fetch numbers and show source for each
  const result = await getPhoneNumbersFromPlatformAccounts();
  if (!result.success || !result.numbers?.length) {
    console.log('\nNo platform numbers found:', result.error || 'empty');
    return;
  }

  const bySource = { primary: 0, backup: 0 };
  console.log('\nPhone numbers by source:');
  for (const n of result.numbers) {
    bySource[n.source ?? 'backup']++;
    console.log(`  ${n.phoneNumber}  source=${n.source ?? 'unknown'}`);
  }
  console.log(`\nSummary: ${bySource.primary} from primary, ${bySource.backup} from backup`);
}

main().catch(console.error);
