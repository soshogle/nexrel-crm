/**
 * Reset orthodontist user password to allow login.
 * Updates both auth DB (getMetaDb) and main DB - auth uses getMetaDb().
 * Run: npx tsx scripts/reset-orthodontist-password.ts
 */
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { getMetaDb } from '@/lib/db/meta-db';

const EMAIL = 'orthodontist@nexrel.com';
const NEW_PASSWORD = 'Orthodontist@2026!';

async function updatePassword(db: PrismaClient): Promise<number> {
  const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);
  return db.$executeRaw`
    UPDATE "User" SET password = ${hashedPassword} WHERE LOWER(email) = LOWER(${EMAIL})
  ` as Promise<number>;
}

async function main() {
  const metaDb = getMetaDb();
  const mainDb = new PrismaClient();

  try {
    const metaResult = await updatePassword(metaDb);
    const mainResult = await updatePassword(mainDb);

    if (metaResult === 0 && mainResult === 0) {
      console.log('❌ User not found:', EMAIL);
      process.exit(1);
    }

    console.log('✅ Password reset for', EMAIL);
    console.log('   Password:', NEW_PASSWORD);
    if (metaResult > 0) console.log('   Updated in auth DB');
    if (mainResult > 0) console.log('   Updated in main DB');
  } finally {
    await Promise.all([metaDb.$disconnect(), mainDb.$disconnect()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
