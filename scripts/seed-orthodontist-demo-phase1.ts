/**
 * Orthodontist Demo - Phase 1: Foundation & User Setup
 * Creates: User config, Clinic, AppointmentTypes, BookingWidget, AutoReply, KnowledgeBase, Templates, Industry AI Agents
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set (same DB the app reads from).
 */

import { prisma, findOrthodontistUser, ensureUserInOrthoDb } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

// Quebec business hours (Mon-Fri 9-5, Sat 9-1)
const QUEBEC_BUSINESS_HOURS = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '09:00', close: '13:00', closed: false },
  sunday: { closed: true },
};
const QUEBEC_BUSINESS_DAYS_STR = JSON.stringify(QUEBEC_BUSINESS_HOURS);

// Orthodontist appointment types
const APPOINTMENT_TYPES = [
  { name: 'Consultation', description: 'Initial orthodontic consultation', category: 'CONSULTATION' as const, duration: 60, price: 0 },
  { name: 'Adjustment', description: 'Braces or aligner adjustment', category: 'SERVICE' as const, duration: 30, price: 0 },
  { name: 'Retainer Check', description: 'Retainer fit and follow-up', category: 'SERVICE' as const, duration: 30, price: 0 },
  { name: 'Emergency', description: 'Urgent orthodontic care', category: 'SERVICE' as const, duration: 30, price: 150 },
  { name: 'Invisalign Fitting', description: 'Invisalign aligner fitting', category: 'SERVICE' as const, duration: 45, price: 0 },
  { name: 'Phase 1 Evaluation', description: 'Early treatment evaluation', category: 'CONSULTATION' as const, duration: 45, price: 0 },
  { name: 'Treatment Plan Review', description: 'Review treatment plan and options', category: 'CONSULTATION' as const, duration: 60, price: 0 },
  { name: 'Debonding', description: 'Braces removal appointment', category: 'SERVICE' as const, duration: 60, price: 0 },
];

// Knowledge base entries
const KNOWLEDGE_ENTRIES = [
  { title: 'About Our Practice', content: 'We are a full-service orthodontic practice in Montreal, Quebec offering braces, Invisalign, and retainers for children and adults.', category: 'business_info', tags: '["about","orthodontics"]', priority: 10 },
  { title: 'Braces Treatment', content: 'Traditional metal braces, ceramic braces, and lingual braces. Treatment typically 18-24 months.', category: 'services', tags: '["braces","treatment"]', priority: 9 },
  { title: 'Invisalign', content: 'Clear aligner treatment for teens and adults. Removable, comfortable, and discreet.', category: 'services', tags: '["invisalign","aligners"]', priority: 9 },
  { title: 'Retainers', content: 'Post-treatment retainers to maintain your new smile. We offer removable and fixed options.', category: 'services', tags: '["retainers","maintenance"]', priority: 8 },
  { title: 'Insurance', content: 'We accept most insurance plans including RAMQ and private insurance. Pre-authorization available.', category: 'insurance', tags: '["insurance","ramq","coverage"]', priority: 8 },
  { title: 'Payment Plans', content: 'Flexible payment plans available. No interest financing for qualified patients.', category: 'billing', tags: '["payment","financing"]', priority: 8 },
  { title: 'Care Instructions - Braces', content: 'Avoid sticky foods, brush after meals, use wax for discomfort. Call us for loose brackets or wires.', category: 'care', tags: '["braces","care","instructions"]', priority: 7 },
  { title: 'Care Instructions - Invisalign', content: 'Wear aligners 20-22 hours daily. Remove for eating and brushing. Store in case when not in use.', category: 'care', tags: '["invisalign","care","aligners"]', priority: 7 },
  { title: 'Emergency Care', content: 'For orthodontic emergencies (broken bracket, loose wire, severe pain), call us during business hours. After-hours: leave message for callback.', category: 'emergency', tags: '["emergency","urgent"]', priority: 10 },
  { title: 'New Patient Process', content: '1. Consultation 2. Records and treatment plan 3. Insurance verification 4. Treatment start 5. Regular adjustments 6. Retainer phase.', category: 'process', tags: '["new patient","process"]', priority: 10 },
  { title: 'Office Hours', content: 'Mon-Fri 9am-5pm, Sat 9am-1pm. Closed Sundays and holidays.', category: 'contact', tags: '["hours","schedule"]', priority: 10 },
  { title: 'Location', content: 'Montreal Orthodontics, 1234 Rue Saint-Denis, Montreal, QC H2X 3K8. Near Metro Sherbrooke.', category: 'contact', tags: '["address","location","montreal"]', priority: 9 },
];

// Email templates
const EMAIL_TEMPLATES = [
  { name: 'Welcome', subject: 'Welcome to Montreal Orthodontics!', body: 'Welcome {{firstName}}! We\'re excited to have you join our practice. Your consultation is scheduled for {{appointmentDate}}. Please arrive 15 minutes early to complete your new patient forms.', category: 'welcome' },
  { name: 'Appointment Reminder', subject: 'Reminder: Your next appointment', body: 'Hi {{firstName}}, this is a reminder about your appointment on {{appointmentDate}} at {{appointmentTime}}. Please reply if you need to reschedule.', category: 'appointment_reminder' },
  { name: 'Follow-up', subject: 'How was your visit?', body: 'Thank you for visiting us, {{firstName}}. We hope your adjustment went well. If you have any questions about your treatment, don\'t hesitate to reach out.', category: 'follow_up' },
  { name: 'Treatment Plan Review', subject: 'Your treatment plan is ready', body: 'Hi {{firstName}}, your treatment plan is ready for review. Please schedule a follow-up appointment to discuss your options and next steps.', category: 'treatment' },
  { name: 'Invoice', subject: 'Your invoice from Montreal Orthodontics', body: 'Please find attached your invoice for {{amount}}. Payment is due by {{dueDate}}. We accept credit card, debit, and payment plans.', category: 'invoice' },
  { name: 'Retainer Care', subject: 'Retainer care instructions', body: 'Congratulations on completing your treatment! Please wear your retainer as instructed. Keep it in its case when not in use and avoid hot water.', category: 'care' },
];

// SMS templates
const SMS_TEMPLATES = [
  { name: 'Appointment Reminder', message: 'Hi {{firstName}}! Reminder: Your appointment is on {{appointmentDate}} at {{appointmentTime}}. Reply YES to confirm or call to reschedule.', category: 'appointment_reminder' },
  { name: 'Welcome', message: 'Welcome to Montreal Orthodontics! We\'re looking forward to seeing you. Reply with any questions.', category: 'welcome' },
  { name: 'Care Instructions', message: 'Hi {{firstName}}! Remember: wear your aligners 20-22 hrs/day. Clean after meals. Call us if you have concerns.', category: 'care' },
  { name: 'Appointment Confirmation', message: 'Your appointment is confirmed for {{appointmentDate}} at {{appointmentTime}}. See you soon!', category: 'appointment_reminder' },
  { name: 'Follow-up', message: 'Hi {{firstName}}! How are you feeling after your adjustment? Reply if you need anything.', category: 'follow_up' },
];

// Orthodontist AI employee types
const ORTHODONTIST_AI_EMPLOYEES = [
  { employeeType: 'APPOINTMENT_SCHEDULER', name: 'Sarah' },
  { employeeType: 'PATIENT_COORDINATOR', name: 'Michael' },
  { employeeType: 'TREATMENT_COORDINATOR', name: 'Jennifer' },
  { employeeType: 'BILLING_SPECIALIST', name: 'Emily' },
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 1: Foundation & User Setup\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}`);
    console.log('Create the user first (e.g. via signup or admin).');
    process.exit(1);
  }
  await ensureUserInOrthoDb(user);
  console.log(`✅ Found user: ${user.name} (${user.id})\n`);

  // ─── 1. Update User ─────────────────────────────────────────────────────────
  console.log('👤 Updating user profile...');
  await prisma.user.update({
    where: { id: user.id },
    data: {
      industry: 'ORTHODONTIST',
      onboardingProgress: JSON.stringify({ completed: true, completedAt: new Date().toISOString(), step: 7 }),
      onboardingCompleted: true,
      timezone: 'America/Montreal',
      currency: 'CAD',
      language: 'en',
      address: '1234 Rue Saint-Denis, Montreal, QC H2X 3K8',
      businessDescription: 'Full-service orthodontic practice offering braces, Invisalign, and retainers for children and adults in Montreal.',
      phone: '+1 (514) 555-1234',
      website: 'https://montreal-orthodontics.com',
      businessHours: 'Mon-Fri 9am-5pm, Sat 9am-1pm',
    },
  });
  console.log('   ✓ Industry, onboarding, timezone, currency, address set\n');

  // ─── 2. Clinic ─────────────────────────────────────────────────────────────
  console.log('🏥 Creating clinic...');
  let clinic = await prisma.clinic.findFirst({
    where: { userMemberships: { some: { userId: user.id } } },
  });

  if (!clinic) {
    clinic = await prisma.clinic.create({
      data: {
        name: 'Montreal Orthodontics',
        address: '1234 Rue Saint-Denis',
        city: 'Montreal',
        state: 'QC',
        zipCode: 'H2X 3K8',
        country: 'Canada',
        phone: '+1 (514) 555-1234',
        email: USER_EMAIL,
        website: 'https://montreal-orthodontics.com',
        timezone: 'America/Montreal',
        currency: 'CAD',
        language: 'en',
        primaryColor: '#9333ea',
        isActive: true,
      },
    });
    console.log(`   ✓ Created clinic: ${clinic.name}`);

    await prisma.userClinic.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        role: 'OWNER',
        isPrimary: true,
      },
    });
    console.log('   ✓ User linked to clinic (OWNER, primary)\n');
  } else {
    console.log(`   ✓ Clinic already exists: ${clinic.name}\n`);
  }

  // ─── 3. Appointment Types ───────────────────────────────────────────────────
  console.log('📅 Creating appointment types...');
  const existingTypes = await prisma.appointmentType.count({ where: { userId: user.id } });
  if (existingTypes === 0) {
    for (const at of APPOINTMENT_TYPES) {
      await prisma.appointmentType.create({
        data: {
          userId: user.id,
          name: at.name,
          description: at.description,
          category: at.category,
          duration: at.duration,
          price: at.price,
          currency: 'CAD',
          isActive: true,
        },
      });
    }
    console.log(`   ✓ Created ${APPOINTMENT_TYPES.length} appointment types\n`);
  } else {
    console.log(`   ✓ Appointment types already exist (${existingTypes})\n`);
  }

  // ─── 4. Booking Widget Settings ────────────────────────────────────────────
  console.log('📋 Booking widget settings...');
  await prisma.bookingWidgetSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      businessName: 'Montreal Orthodontics',
      businessDescription: 'Orthodontic care for the whole family',
      primaryColor: '#9333ea',
      timezone: 'America/Montreal',
      requireEmail: true,
      requirePhone: true,
      showAvailability: true,
      timeSlotInterval: 30,
      sendConfirmationEmail: true,
      sendReminderEmail: true,
      reminderHoursBefore: 24,
      availabilityHours: QUEBEC_BUSINESS_HOURS,
    },
    update: {
      businessName: 'Montreal Orthodontics',
      businessDescription: 'Orthodontic care for the whole family',
      timezone: 'America/Montreal',
      availabilityHours: QUEBEC_BUSINESS_HOURS,
    },
  });
  console.log('   ✓ Booking widget configured\n');

  // ─── 5. Auto Reply Settings ─────────────────────────────────────────────────
  console.log('🤖 Auto-reply settings...');
  await prisma.autoReplySettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      isEnabled: true,
      responseTone: 'professional',
      responseLanguage: 'en',
      businessHoursEnabled: true,
      businessHoursStart: '09:00',
      businessHoursEnd: '17:00',
      businessDays: QUEBEC_BUSINESS_DAYS_STR,
      timezone: 'America/Montreal',
      afterHoursMessage: 'Thank you for contacting Montreal Orthodontics. We are closed. We will respond during business hours (Mon-Fri 9am-5pm, Sat 9am-1pm).',
      confidenceThreshold: 0.7,
      useConversationHistory: true,
      historyDepth: 10,
    },
    update: {
      isEnabled: true,
      businessDays: QUEBEC_BUSINESS_DAYS_STR,
      timezone: 'America/Montreal',
      afterHoursMessage: 'Thank you for contacting Montreal Orthodontics. We are closed. We will respond during business hours (Mon-Fri 9am-5pm, Sat 9am-1pm).',
    },
  });
  console.log('   ✓ Auto-reply configured\n');

  // ─── 6. Knowledge Base ─────────────────────────────────────────────────────
  console.log('📚 Knowledge base...');
  const existingKb = await prisma.knowledgeBase.count({ where: { userId: user.id } });
  if (existingKb < KNOWLEDGE_ENTRIES.length) {
    for (const kb of KNOWLEDGE_ENTRIES) {
      const exists = await prisma.knowledgeBase.findFirst({
        where: { userId: user.id, title: kb.title },
      });
      if (!exists) {
        await prisma.knowledgeBase.create({
          data: {
            userId: user.id,
            title: kb.title,
            content: kb.content,
            category: kb.category,
            tags: kb.tags,
            priority: kb.priority,
            isActive: true,
          },
        });
      }
    }
    console.log(`   ✓ Created ${KNOWLEDGE_ENTRIES.length} knowledge base entries\n`);
  } else {
    console.log(`   ✓ Knowledge base already populated\n`);
  }

  // ─── 7. Email Templates ────────────────────────────────────────────────────
  console.log('📧 Email templates...');
  const existingEmail = await prisma.emailTemplate.count({ where: { userId: user.id } });
  if (existingEmail < EMAIL_TEMPLATES.length) {
    for (const t of EMAIL_TEMPLATES) {
      await prisma.emailTemplate.create({
        data: {
          userId: user.id,
          name: t.name,
          subject: t.subject,
          body: t.body,
          category: t.category,
        },
      }).catch(() => {});
    }
    console.log(`   ✓ Created ${EMAIL_TEMPLATES.length} email templates\n`);
  } else {
    console.log(`   ✓ Email templates already exist\n`);
  }

  // ─── 8. SMS Templates ──────────────────────────────────────────────────────
  console.log('📱 SMS templates...');
  const existingSms = await prisma.sMSTemplate.count({ where: { userId: user.id } });
  if (existingSms < SMS_TEMPLATES.length) {
    for (const t of SMS_TEMPLATES) {
      await prisma.sMSTemplate.create({
        data: {
          userId: user.id,
          name: t.name,
          message: t.message,
          category: t.category,
        },
      }).catch(() => {});
    }
    console.log(`   ✓ Created ${SMS_TEMPLATES.length} SMS templates\n`);
  } else {
    console.log(`   ✓ SMS templates already exist\n`);
  }

  // ─── 9. Industry AI Employee Agents ─────────────────────────────────────────
  console.log('🤖 Industry AI employee agents...');
  for (const emp of ORTHODONTIST_AI_EMPLOYEES) {
    await prisma.industryAIEmployeeAgent.upsert({
      where: {
        userId_industry_employeeType: {
          userId: user.id,
          industry: 'ORTHODONTIST',
          employeeType: emp.employeeType,
        },
      },
      create: {
        userId: user.id,
        industry: 'ORTHODONTIST',
        employeeType: emp.employeeType,
        name: emp.name,
        elevenLabsAgentId: `demo-ortho-${emp.employeeType.toLowerCase()}`,
        status: 'active',
      },
      update: { name: emp.name, status: 'active' },
    }).catch(() => {});
  }
  console.log(`   ✓ Created ${ORTHODONTIST_AI_EMPLOYEES.length} industry AI agents\n`);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 1 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   • User: ONBOARDING_COMPLETE, ORTHODONTIST, Quebec/CAD');
  console.log(`   • Clinic: ${clinic.name}`);
  console.log(`   • Appointment types: ${APPOINTMENT_TYPES.length}`);
  console.log(`   • Knowledge base: ${KNOWLEDGE_ENTRIES.length} entries`);
  console.log(`   • Email templates: ${EMAIL_TEMPLATES.length}`);
  console.log(`   • SMS templates: ${SMS_TEMPLATES.length}`);
  console.log(`   • AI agents: ${ORTHODONTIST_AI_EMPLOYEES.length}`);
  console.log('\n🎉 Run Phase 2 next for leads, contacts, notes, emails.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
