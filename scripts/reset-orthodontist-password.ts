/**
 * Reset orthodontist user password to allow login.
 * Uses auth DB (getMetaDb) - same DB auth uses for login.
 * Run: npx tsx scripts/reset-orthodontist-password.ts
 */
import bcrypt from 'bcryptjs';
import { getMetaDb } from '@/lib/db/meta-db';

const EMAIL = 'orthodontist@nexrel.com';
const NEW_PASSWORD = 'Orthodontist@2026!';

async function main() {
  const db = getMetaDb();
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);

  // Use raw query to avoid schema mismatch (e.g. missing deletedAt)
  const result = await db.$executeRaw`
    UPDATE "User"
    SET password = ${hashedPassword}
    WHERE email = ${EMAIL}
  `;

  if (result === 0) {
    console.log('❌ User not found:', EMAIL);
    console.log('   Ensure the user exists in the auth DB (DATABASE_URL_META or DATABASE_URL).');
    process.exit(1);
  }

  console.log('✅ Password reset successfully for', EMAIL);
  console.log('   New password:', NEW_PASSWORD);
  console.log('   You can now log in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    const db = getMetaDb();
    await db.$disconnect();
  });
