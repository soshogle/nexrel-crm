/**
 * Orthodontist Demo - Phase 12: AI Jobs & Human Tasks
 * Creates: AIEmployee, AIJob (50), Task (50), IndustryAIEmployeeExecution (20-30)
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { Industry } from '@prisma/client';
import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

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

const JOB_TYPES = ['lead_enrichment', 'appointment_reminder', 'follow_up_sms', 'insurance_verification', 'treatment_plan_review', 'invoice_generation'];
const TASK_TITLES = ['Follow up with patient', 'Verify insurance', 'Send treatment plan', 'Schedule retainer check', 'Review X-rays', 'Call back for consultation'];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 12: AI Jobs & Tasks\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  const deals = await prisma.deal.findMany({ where: { userId: user.id }, take: 30 });
  if (leads.length < 20) {
    console.error('❌ Not enough leads. Run Phases 1-3 first.');
    process.exit(1);
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 12 data
  console.log('🧹 Cleaning existing Phase 12 data...');
  await prisma.aIJobLog.deleteMany({ where: { job: { userId: user.id } } });
  await prisma.aIJob.deleteMany({ where: { userId: user.id } });
  await prisma.aIEmployee.deleteMany({ where: { userId: user.id } });
  await prisma.task.deleteMany({ where: { userId: user.id } });
  await prisma.industryAIEmployeeExecution.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. AIEmployee ─────────────────────────────────────────────────────────
  console.log('🤖 Creating AI employees...');
  const employee = await prisma.aIEmployee.create({
    data: {
      userId: user.id,
      name: 'Sarah - Patient Coordinator',
      type: 'BOOKING_COORDINATOR',
      description: 'Handles appointment scheduling and reminders',
      isActive: true,
      capabilities: { sms: true, email: true, voice: false },
    },
  });
  console.log('   ✓ Created 1 AI employee\n');

  // ─── 2. AIJob (50) ─────────────────────────────────────────────────────────
  console.log('📋 Creating AI jobs...');
  let jobCount = 0;
  for (let i = 0; i < 50; i++) {
    const lead = leads[i % leads.length];
    const status = randomElement(['COMPLETED', 'COMPLETED', 'COMPLETED', 'RUNNING', 'PENDING', 'FAILED'] as const);
    await prisma.aIJob.create({
      data: {
        userId: user.id,
        employeeId: employee.id,
        jobType: randomElement(JOB_TYPES),
        priority: randomElement(['LOW', 'MEDIUM', 'HIGH'] as const),
        status,
        input: { leadId: lead.id, action: 'follow_up' },
        output: status === 'COMPLETED' ? { success: true, messageSent: true } : null,
        progress: status === 'COMPLETED' ? 100 : status === 'RUNNING' ? randomInt(20, 80) : 0,
        startedAt: status !== 'PENDING' ? randomDate(threeMonthsAgo, now) : null,
        completedAt: status === 'COMPLETED' ? randomDate(threeMonthsAgo, now) : null,
        actualTime: status === 'COMPLETED' ? randomInt(5, 60) : null,
      },
    });
    jobCount++;
  }
  console.log(`   ✓ Created ${jobCount} AI jobs\n`);

  // ─── 3. Task (50) ───────────────────────────────────────────────────────────
  console.log('✅ Creating human tasks...');
  let taskCount = 0;
  for (let i = 0; i < 50; i++) {
    const lead = leads[i % leads.length];
    const deal = deals[i % deals.length];
    const status = randomElement(['TODO', 'IN_PROGRESS', 'COMPLETED', 'COMPLETED', 'COMPLETED'] as const);
    await prisma.task.create({
      data: {
        userId: user.id,
        title: randomElement(TASK_TITLES),
        description: `Task for ${lead.contactPerson || lead.businessName}`,
        status,
        priority: randomElement(['LOW', 'MEDIUM', 'HIGH'] as const),
        leadId: lead.id,
        dealId: deal?.id ?? null,
        dueDate: randomDate(now, new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)),
        completedAt: status === 'COMPLETED' ? randomDate(threeMonthsAgo, now) : null,
        aiSuggested: Math.random() > 0.6,
        tags: ['orthodontist', 'patient'],
      },
    });
    taskCount++;
  }
  console.log(`   ✓ Created ${taskCount} tasks\n`);

  // ─── 4. IndustryAIEmployeeExecution (20-30) ──────────────────────────────────
  console.log('📊 Creating industry AI employee executions...');
  const employeeTypes = ['APPOINTMENT_SCHEDULER', 'PATIENT_COORDINATOR', 'TREATMENT_COORDINATOR', 'BILLING_SPECIALIST'];
  let execCount = 0;
  for (let i = 0; i < 25; i++) {
    await prisma.industryAIEmployeeExecution.create({
      data: {
        userId: user.id,
        industry: Industry.ORTHODONTIST,
        employeeType: randomElement(employeeTypes),
        status: 'completed',
        result: { tasksCompleted: randomInt(1, 5), summary: 'Processed leads and sent reminders' },
        createdAt: randomDate(threeMonthsAgo, now),
      },
    });
    execCount++;
  }
  console.log(`   ✓ Created ${execCount} industry AI executions\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 12 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • AI employee: 1, AI jobs: ${jobCount}`);
  console.log(`   • Human tasks: ${taskCount}, Industry executions: ${execCount}`);
  console.log('\n🎉 Run Phase 13 next for final integration.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
