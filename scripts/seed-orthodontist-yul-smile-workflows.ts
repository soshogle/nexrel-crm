/**
 * Seed Yul Smile Orthodontist Workflow Templates
 * Creates the 4 proprietary in-clinic workflows from "Workflows Yul Smile - drafting"
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set, else default DB.
 */

import { Industry } from '@prisma/client';
import {
  getOrthoPrisma,
  findOrthodontistUser,
} from './seed-orthodontist-db-helper';
import {
  ORTHODONTIST_WORKFLOW_TEMPLATES,
  ORTHODONTIST_WORKFLOW_TRIGGERS,
} from '../lib/orthodontist/workflow-templates';

const USER_EMAIL = 'orthodontist@nexrel.com';

async function main() {
  console.log('🌱 Seeding Yul Smile Orthodontist Workflow Templates\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  // Use orthodontist DB if configured, else default (schema may differ)
  const prisma = getOrthoPrisma();

  // Clean existing orthodontist workflow templates (Yul Smile set)
  console.log('🧹 Cleaning existing Yul Smile workflow templates...');
  const existingTemplates = await prisma.workflowTemplate.findMany({
    where: {
      userId: user.id,
      industry: Industry.ORTHODONTIST,
      name: {
        in: ORTHODONTIST_WORKFLOW_TEMPLATES.map((t) => t.name),
      },
    },
    select: { id: true },
  });

  for (const t of existingTemplates) {
    await prisma.taskExecution.deleteMany({
      where: { instance: { templateId: t.id } },
    });
    await prisma.workflowInstance.deleteMany({ where: { templateId: t.id } });
    await prisma.workflowTemplateEnrollment.deleteMany({
      where: { workflowId: t.id },
    });
    await prisma.workflowTask.deleteMany({ where: { templateId: t.id } });
  }
  await prisma.workflowTemplate.deleteMany({
    where: {
      userId: user.id,
      industry: Industry.ORTHODONTIST,
      name: {
        in: ORTHODONTIST_WORKFLOW_TEMPLATES.map((t) => t.name),
      },
    },
  });
  console.log('   ✓ Cleaned\n');

  // Create the 4 workflow templates
  console.log('📋 Creating Yul Smile workflow templates...\n');

  for (const template of ORTHODONTIST_WORKFLOW_TEMPLATES) {
    const triggers = ORTHODONTIST_WORKFLOW_TRIGGERS[template.id] || [];
    const enrollmentTriggers = triggers.map((type) => ({ type }));
    const taskCreates = template.tasks.map((task, index) => {
      const isSms = task.taskType === 'SMS';
      const isEmail = task.taskType === 'EMAIL';
      const actions = isSms ? ['sms'] : isEmail ? ['email'] : ['task'];
      let message = task.description || task.name;
      let subject = '';
      if (task.name.includes('secure link')) {
        message =
          'Hi {{firstName}}! Your appointment is confirmed. Please complete your Medical Questionnaire and sign the Law 25 consent: [LINK]';
      } else if (task.name.includes('Digital Kit')) {
        message =
          'Thank you {{firstName}} for your visit! Here is the secure link to your Treatment Plan and Financial Agreement: [LINK]';
      } else if (task.name.includes('Spouse summary')) {
        subject = 'Treatment Plan Summary for Your Spouse';
        message =
          'Hello {{firstName}}, if discussing with your spouse, here is a summary of clinical benefits and financing options.';
      } else if (task.name.includes('Finance option')) {
        message =
          'Hi {{firstName}}, if the deposit is a hurdle, we can adjust installments. See options: [LINK]';
      } else if (task.name.includes('Psychological close')) {
        message =
          'Hello {{firstName}}, Dr. [Name] was asking if we should keep your file active or postpone? Reply "Active" or "Postpone".';
      } else if (task.name.includes('Thank referring')) {
        subject = 'Thank you - We have taken charge';
        message = 'Thank you Dr. [Name], we have taken charge of {{firstName}}.';
      } else if (task.name.includes('Book consultation')) {
        message =
          'Hi {{firstName}}! You have been referred to us. Reply to book your consultation or call [PHONE].';
      } else if (task.name.includes('Document') || task.name.includes('Staff alert')) {
        message =
          'Hi {{firstName}}, please complete your Medical Questionnaire and consent forms: [LINK]';
      } else if (task.name.includes('Send signing link')) {
        message = 'Hi {{firstName}}, sign your Financial Agreement here: [LINK]';
      } else if (task.name.includes('Archive')) {
        subject = 'Your Financial Agreement - Signed Copy';
        message = 'Hi {{firstName}}, attached is your signed Financial Agreement.';
      }

      return {
        name: task.name,
        description: task.description,
        taskType: task.taskType,
        assignedAgentType: 'PATIENT_COORDINATOR',
        delayValue: task.delayValue,
        delayUnit: task.delayUnit,
        isHITL: task.isHITL,
        isOptional: false,
        position: { row: Math.floor(index / 2), col: index % 2 },
        displayOrder: index + 1,
        actionConfig: {
          actions,
          message,
          subject: subject || undefined,
          smsMessage: isSms ? message : undefined,
          emailSubject: isEmail ? (subject || task.name) : undefined,
          emailBody: isEmail ? message : undefined,
        },
      };
    });

    try {
      const wf = await prisma.workflowTemplate.create({
        data: {
          userId: user.id,
          industry: Industry.ORTHODONTIST,
          name: template.name,
          type: 'CUSTOM',
          description: template.description,
          isActive: true,
          isDefault: false,
          enrollmentTriggers,
          tasks: {
            create: taskCreates,
          },
        },
        include: {
          tasks: { orderBy: { displayOrder: 'asc' } },
        },
      });
      console.log(`   ✓ ${wf.name} (${wf.tasks.length} tasks, triggers: ${triggers.join(', ')})`);
    } catch (e: unknown) {
      const err = e as { code?: string; meta?: { columnName?: string } };
      if (err?.code === 'P2022' || err?.code === 'P2021') {
        const col = (err?.meta as { column?: string })?.column;
        console.error(
          `\n⚠️  Schema mismatch (missing column: ${col || 'unknown'}).`
        );
        console.error(
          '   Run migrations on your database: npx prisma migrate deploy'
        );
        console.error(
          '   Or use default DB (unset DATABASE_URL_ORTHODONTIST) if ortho DB has older schema.\n'
        );
        throw e;
      }
      throw e;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Yul Smile workflows seeded successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nWorkflows created:');
  console.log('  1. Patient Admissions (Law 25 & Consents) - APPOINTMENT_CONFIRMED');
  console.log('  2. Referrals & Clinical Reports - REFERRAL_CONVERTED');
  console.log('  3. Financial Agreement (Treatment Coordinator) - TREATMENT_ACCEPTED');
  console.log('  4. Treatment Conversion (Undecided Patients) - CONSULTATION_PENDING');
  console.log('\nTriggers are wired to:');
  console.log('  • Appointments: status → CONFIRMED');
  console.log('  • Referrals: convert to lead');
  console.log('  • Deals: stage → Won/Closed Won');
  console.log('  • Leads: status → PENDING');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
