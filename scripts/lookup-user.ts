/**
 * Lookup a user by ID to see their details and infer creation source.
 * Run: npx tsx scripts/lookup-user.ts gihbWEeekKSgZvbE
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.log('Usage: npx tsx scripts/lookup-user.ts <userId>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { agency: true },
  });

  if (!user) {
    console.log('❌ User not found:', userId);
    process.exit(1);
  }

  console.log('✅ User found:');
  console.log('  ID:', user.id);
  console.log('  Name:', user.name);
  console.log('  Email:', user.email);
  console.log('  Role:', user.role);
  console.log('  Account Status:', user.accountStatus);
  console.log('  Created At:', user.createdAt);
  console.log('  parentRole:', user.parentRole);
  console.log('  industry:', user.industry);

  // Infer creation source from role/status patterns
  if (user.role === 'BUSINESS_OWNER' && user.industry) {
    console.log('\n📌 Likely created by: Super Admin (platform-admin create-business-owner)');
  } else if (user.parentRole) {
    console.log('\n📌 Likely created by: Parent signup (club-specific flow)');
  } else if (user.role === 'USER' && user.accountStatus === 'PENDING_APPROVAL') {
    console.log('\n📌 Likely created by: Public signup (/api/auth/signup) or Google OAuth');
  } else if (user.role === 'SUPER_ADMIN') {
    console.log('\n📌 Likely created by: create-super-admin script');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
