/**
 * Orthodontist Demo - Phase 8: Workflows
 * Creates: WorkflowTemplate (10), WorkflowTask, WorkflowInstance, WorkflowTemplateEnrollment,
 *          TaskExecution, TaskTemplate (5-8), TaskAutomation (2-3)
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

const WORKFLOW_NAMES = [
  'New Patient Onboarding',
  'Consultation Follow-up',
  'Appointment Reminder',
  'Treatment Plan Follow-up',
  'Retainer Care Reminder',
  'Referral Thank You',
  'Post-Adjustment Check-in',
  'Insurance Pre-Authorization',
  'Broken Bracket Alert',
  'Retention Phase Welcome',
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 8: Workflows\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  const deals = await prisma.deal.findMany({ where: { userId: user.id }, take: 30 });
  if (leads.length < 15) {
    console.error('❌ Not enough leads. Run Phases 1-3 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads, ${deals.length} deals\n`);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 8 data
  console.log('🧹 Cleaning existing Phase 8 data...');
  const templates = await prisma.workflowTemplate.findMany({ where: { userId: user.id }, select: { id: true } });
  for (const t of templates) {
    await prisma.taskExecution.deleteMany({ where: { instance: { templateId: t.id } } });
    await prisma.workflowInstance.deleteMany({ where: { templateId: t.id } });
    await prisma.workflowTemplateEnrollment.deleteMany({ where: { workflowId: t.id } });
    await prisma.workflowTask.deleteMany({ where: { templateId: t.id } });
  }
  await prisma.workflowTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.taskTemplate.deleteMany({ where: { userId: user.id } });
  await prisma.taskAutomation.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. WorkflowTemplates (10) + WorkflowTasks ──────────────────────────────
  console.log('📋 Creating workflow templates and tasks...');
  let workflowTemplates: { id: string; tasks: { id: string }[] }[] = [];
  let instanceCount = 0;
  let execCount = 0;
  let enrollCount = 0;
  const taskTemplateNames = ['Consultation follow-up', 'Insurance verification', 'Appointment confirmation', 'Treatment plan review', 'Retainer check', 'Payment reminder'];
  try {
  for (let i = 0; i < 10; i++) {
    const template = await prisma.workflowTemplate.create({
      data: {
        userId: user.id,
        industry: Industry.ORTHODONTIST,
        name: WORKFLOW_NAMES[i],
        type: 'CUSTOM',
        description: `Orthodontist workflow: ${WORKFLOW_NAMES[i]}`,
        isActive: true,
        totalRecipients: randomInt(10, 40),
        sentCount: randomInt(5, 35),
        deliveredCount: randomInt(3, 30),
      },
    });
    const task1 = await prisma.workflowTask.create({
      data: {
        templateId: template.id,
        name: 'Send welcome SMS',
        taskType: 'SMS',
        assignedAgentType: 'PATIENT_COORDINATOR',
        delayValue: 0,
        delayUnit: 'MINUTES',
        position: { row: 0, col: 0 },
        displayOrder: 1,
        actionConfig: { actions: ['sms'], message: 'Welcome to Montreal Orthodontics!' },
      },
    });
    const task2 = await prisma.workflowTask.create({
      data: {
        templateId: template.id,
        name: 'Follow-up email',
        taskType: 'EMAIL',
        assignedAgentType: 'TREATMENT_COORDINATOR',
        delayValue: 2,
        delayUnit: 'DAYS',
        position: { row: 1, col: 0 },
        displayOrder: 2,
        actionConfig: { actions: ['email'], subject: 'Follow-up' },
      },
    });
    workflowTemplates.push({ id: template.id, tasks: [task1, task2] });
  }
  console.log(`   ✓ Created ${workflowTemplates.length} templates with tasks\n`);

  // ─── 2. WorkflowInstances + TaskExecutions ──────────────────────────────────
  console.log('🔄 Creating workflow instances...');
  for (let i = 0; i < 35; i++) {
    const tmpl = workflowTemplates[i % workflowTemplates.length];
    const lead = leads[i % leads.length];
    const status = randomElement(['ACTIVE', 'COMPLETED', 'COMPLETED', 'PAUSED'] as const);
    const instance = await prisma.workflowInstance.create({
      data: {
        templateId: tmpl.id,
        userId: user.id,
        industry: Industry.ORTHODONTIST,
        leadId: lead.id,
        dealId: deals[i % deals.length]?.id ?? null,
        status,
        currentTaskId: tmpl.tasks[0].id,
        startedAt: randomDate(threeMonthsAgo, now),
        completedAt: status === 'COMPLETED' ? randomDate(threeMonthsAgo, now) : null,
      },
    });
    instanceCount++;
    for (const task of tmpl.tasks) {
      const execStatus = randomElement(['PENDING', 'COMPLETED', 'COMPLETED', 'IN_PROGRESS'] as const);
      await prisma.taskExecution.create({
        data: {
          instanceId: instance.id,
          taskId: task.id,
          status: execStatus,
          scheduledFor: randomDate(threeMonthsAgo, now),
          startedAt: execStatus !== 'PENDING' ? randomDate(threeMonthsAgo, now) : null,
          completedAt: execStatus === 'COMPLETED' ? randomDate(threeMonthsAgo, now) : null,
        },
      });
      execCount++;
    }
  }
  console.log(`   ✓ Created ${instanceCount} instances, ${execCount} task executions\n`);

  // ─── 3. WorkflowTemplateEnrollment ───────────────────────────────────────────
  console.log('📝 Creating workflow template enrollments...');
  for (let i = 0; i < 20; i++) {
    const tmpl = workflowTemplates[i % workflowTemplates.length];
    const lead = leads[i % leads.length];
    try {
      await prisma.workflowTemplateEnrollment.create({
        data: {
          workflowId: tmpl.id,
          leadId: lead.id,
          status: randomElement(['ACTIVE', 'COMPLETED', 'ACTIVE'] as const),
          currentStep: randomInt(1, 2),
          nextSendAt: randomDate(now, new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)),
          enrolledAt: randomDate(threeMonthsAgo, now),
          completedAt: Math.random() > 0.6 ? randomDate(threeMonthsAgo, now) : null,
        },
      });
      enrollCount++;
    } catch {
      // unique constraint
    }
  }
  console.log(`   ✓ Created ${enrollCount} enrollments\n`);

  // ─── 4. TaskTemplate (5–8) ──────────────────────────────────────────────────
  console.log('📌 Creating task templates...');
  for (const name of taskTemplateNames) {
    await prisma.taskTemplate.create({
      data: {
        userId: user.id,
        name,
        description: `Orthodontist task: ${name}`,
        category: 'Clinical',
        defaultPriority: randomElement(['LOW', 'MEDIUM', 'HIGH'] as const),
        estimatedHours: 0.5 + Math.random() * 1.5,
        tags: ['orthodontist', 'patient'],
        checklistItems: [{ label: 'Complete', done: false }],
      },
    });
  }
  console.log(`   ✓ Created ${taskTemplateNames.length} task templates\n`);

  // ─── 5. TaskAutomation (2–3) ─────────────────────────────────────────────────
  console.log('⚙️ Creating task automations...');
  await prisma.taskAutomation.create({
    data: {
      userId: user.id,
      name: 'Auto-create follow-up on new consultation',
      description: 'Creates follow-up task when consultation is completed',
      isActive: true,
      triggerType: 'APPOINTMENT_COMPLETED',
      triggerConditions: { appointmentType: 'Consultation' },
      actionType: 'CREATE_TASK',
      actionConfig: { templateId: 'consultation-follow-up', delayDays: 3 },
      runCount: randomInt(10, 50),
      lastRun: randomDate(threeMonthsAgo, now),
    },
  });
  await prisma.taskAutomation.create({
    data: {
      userId: user.id,
      name: 'Appointment reminder 24h before',
      description: 'Sends SMS reminder 24 hours before appointment',
      isActive: true,
      triggerType: 'APPOINTMENT_SCHEDULED',
      triggerConditions: { hoursBefore: 24 },
      actionType: 'SEND_SMS',
      actionConfig: { template: 'appointment_reminder' },
      runCount: randomInt(20, 80),
      lastRun: randomDate(threeMonthsAgo, now),
    },
  });
  await prisma.taskAutomation.create({
    data: {
      userId: user.id,
      name: 'Retainer check after 6 months',
      description: 'Schedules retainer check 6 months after treatment completion',
      isActive: true,
      triggerType: 'TREATMENT_COMPLETED',
      triggerConditions: { type: 'retainer' },
      actionType: 'CREATE_APPOINTMENT',
      actionConfig: { type: 'Retainer Check', delayMonths: 6 },
      runCount: randomInt(5, 20),
      lastRun: randomDate(threeMonthsAgo, now),
    },
  });
  console.log('   ✓ Created 3 task automations\n');
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === 'P2022' || err?.code === 'P2021') {
      console.log('   ⚠️  Phase 8 skipped (WorkflowTemplate schema mismatch). Run: npx tsx scripts/migrate-all-dbs.ts\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  Phase 8 skipped - workflows not created');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return;
    }
    throw e;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 8 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Workflow templates: ${workflowTemplates.length}, Tasks: ${workflowTemplates.length * 2}`);
  console.log(`   • Instances: ${instanceCount}, Executions: ${execCount}`);
  console.log(`   • Enrollments: ${enrollCount}`);
  console.log(`   • Task templates: ${taskTemplateNames.length}, Automations: 3`);
  console.log('\n🎉 Run Phase 9 next for messaging & conversations.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
