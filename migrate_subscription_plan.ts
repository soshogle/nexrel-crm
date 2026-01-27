import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Checking current subscription plans...');
  
  // Read existing plan values
  const subscriptions = await prisma.$queryRaw`
    SELECT id, "userId", plan FROM "UserSubscription"
  ` as any[];
  
  console.log(`Found ${subscriptions.length} subscriptions`);
  
  for (const sub of subscriptions) {
    console.log(`  - User ${sub.userId}: plan=${sub.plan}`);
  }
  
  console.log('\n✅ Migration script ready. The schema will map:');
  console.log('  - BASIC → FREE');
  console.log('  - PRO → PRO');
  console.log('  - ENTERPRISE → ENTERPRISE');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
