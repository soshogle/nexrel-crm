/**
 * Orthodontist Demo - Phase 13: Final Integration
 * Creates: DataInsight (5-10), AuditLog (20-30), TeamMember (2-4), CalendarConnection (1)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const USER_EMAIL = 'orthodontist@nexrel.com';

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 13: Final Integration\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    process.exit(1);
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 13 data
  console.log('🧹 Cleaning existing Phase 13 data...');
  await prisma.dataInsight.deleteMany({ where: { userId: user.id } });
  await prisma.auditLog.deleteMany({ where: { userId: user.id } });
  await prisma.teamMember.deleteMany({ where: { userId: user.id } });
  await prisma.calendarConnection.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. DataInsight (5-10) ───────────────────────────────────────────────────
  console.log('📊 Creating data insights...');
  const insightTypes = ['REVENUE_TREND', 'TRANSACTION_VOLUME', 'CUSTOMER_BEHAVIOR', 'PAYMENT_METHOD_PREFERENCE'] as const;
  const periods = ['WEEKLY', 'MONTHLY', 'QUARTERLY'] as const;
  let insightCount = 0;
  for (let i = 0; i < 8; i++) {
    const period = periods[i % periods.length];
    const start = new Date(threeMonthsAgo);
    const end = new Date(now);
    await prisma.dataInsight.create({
      data: {
        userId: user.id,
        insightType: insightTypes[i % insightTypes.length],
        period: period,
        startDate: start,
        endDate: end,
        totalTransactions: randomInt(50, 200),
        totalRevenue: randomInt(50000, 150000),
        averageOrderValue: randomInt(2000, 6000),
        uniqueCustomers: randomInt(30, 80),
        successRate: 0.85 + Math.random() * 0.12,
        growthRate: 0.05 + Math.random() * 0.15,
        trendData: { labels: ['Jan', 'Feb', 'Mar'], values: [12000, 14500, 13200] },
        dataPoints: randomInt(10, 50),
        confidenceScore: 0.8 + Math.random() * 0.15,
      },
    });
    insightCount++;
  }
  console.log(`   ✓ Created ${insightCount} data insights\n`);

  // ─── 2. AuditLog (20-30) ────────────────────────────────────────────────────
  console.log('📜 Creating audit logs...');
  const actions = ['CREATE', 'UPDATE', 'DELETE'] as const;
  const entities = ['Lead', 'Deal', 'Appointment', 'Invoice', 'Payment'];
  let auditCount = 0;
  for (let i = 0; i < 25; i++) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: randomElement(actions),
        severity: randomElement(['LOW', 'LOW', 'MEDIUM'] as const),
        entityType: randomElement(entities),
        entityId: `cuid_${randomInt(1000, 9999)}`,
        success: true,
        metadata: { source: 'orthodontist_demo' },
        createdAt: randomDate(threeMonthsAgo, now),
      },
    });
    auditCount++;
  }
  console.log(`   ✓ Created ${auditCount} audit logs\n`);

  // ─── 3. TeamMember (2-4) ─────────────────────────────────────────────────────
  console.log('👥 Creating team members...');
  const teamEmails = ['assistant@montrealortho.com', 'reception@montrealortho.com', 'billing@montrealortho.com'];
  let teamCount = 0;
  for (const email of teamEmails) {
    try {
      await prisma.teamMember.create({
        data: {
          userId: user.id,
          email,
          name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          role: teamCount === 0 ? 'ADMIN' : 'AGENT',
          status: teamCount === 0 ? 'ACTIVE' : randomElement(['ACTIVE', 'INVITED'] as const),
          joinedAt: teamCount === 0 ? randomDate(threeMonthsAgo, now) : null,
        },
      });
      teamCount++;
    } catch (e: any) {
      if (e?.code !== 'P2002') throw e;
    }
  }
  console.log(`   ✓ Created ${teamCount} team members\n`);

  // ─── 4. CalendarConnection (1) ───────────────────────────────────────────────
  console.log('📅 Creating calendar connection...');
  await prisma.calendarConnection.create({
    data: {
      userId: user.id,
      provider: 'GOOGLE',
      calendarName: 'Montreal Orthodontics',
      syncEnabled: true,
      syncStatus: 'SYNCED',
      lastSyncAt: randomDate(threeMonthsAgo, now),
    },
  });
  console.log('   ✓ Created 1 calendar connection\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 13 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Data insights: ${insightCount}`);
  console.log(`   • Audit logs: ${auditCount}`);
  console.log(`   • Team members: ${teamCount}`);
  console.log(`   • Calendar connection: 1`);
  console.log('\n🎉 Orthodontist demo mock data complete!');

  console.log('\n📋 Summary - Run all phases:');
  console.log('   npm run seed:orthodontist-demo:phase1');
  console.log('   npm run seed:orthodontist-demo:phase2');
  console.log('   ... through phase13');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
