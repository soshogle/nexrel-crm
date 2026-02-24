/**
 * Orthodontist Demo - Phase 7: Campaigns & Drip
 * Creates: EmailDripCampaign, EmailDripSequence, EmailDripEnrollment, EmailDripMessage,
 *          Campaign, CampaignLead, CampaignMessage, ScheduledEmail, ScheduledSms
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

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

const DRIP_CAMPAIGN_NAMES = [
  'New Patient Welcome',
  'Consultation Follow-up',
  'Treatment Education',
  'Appointment Reminder',
  'Retainer Care',
  'Referral Thank You',
  'Post-Treatment Care',
  'Invisalign Education',
  'Braces Care Tips',
  'Seasonal Promo',
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 7: Campaigns & Drip\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  if (leads.length < 15) {
    console.error('❌ Not enough leads. Run Phases 1-2 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads\n`);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneMonthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Clean Phase 7 data
  console.log('🧹 Cleaning existing Phase 7 data...');
  await prisma.emailDripMessage.deleteMany({ where: { enrollment: { campaign: { userId: user.id } } } });
  await prisma.emailDripEnrollment.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.emailDripSequence.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.emailDripCampaign.deleteMany({ where: { userId: user.id } });
  await prisma.campaignMessage.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaignLead.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaign.deleteMany({ where: { userId: user.id } });
  await prisma.scheduledEmail.deleteMany({ where: { userId: user.id } });
  await prisma.scheduledSms.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. Email Drip Campaigns (10) + Sequences + Enrollments + Messages ─────
  console.log('📧 Creating drip campaigns with sequences...');
  const dripCampaigns: { id: string; sequences: { id: string }[] }[] = [];
  for (let c = 0; c < 10; c++) {
    const campaign = await prisma.emailDripCampaign.create({
      data: {
        userId: user.id,
        name: DRIP_CAMPAIGN_NAMES[c],
        description: `Orthodontist drip campaign: ${DRIP_CAMPAIGN_NAMES[c]}`,
        status: randomElement(['DRAFT', 'ACTIVE', 'ACTIVE', 'COMPLETED'] as const),
        triggerType: randomElement(['MANUAL', 'LEAD_CREATED', 'SERVICE_COMPLETED'] as const),
        fromName: 'Montreal Orthodontics',
        fromEmail: 'info@montrealortho.com',
        totalEnrolled: 0,
        totalCompleted: 0,
      },
    });
    const seq1 = await prisma.emailDripSequence.create({
      data: {
        campaignId: campaign.id,
        sequenceOrder: 1,
        name: 'Email 1',
        subject: `Welcome to Montreal Orthodontics - ${DRIP_CAMPAIGN_NAMES[c]}`,
        htmlContent: '<p>Bonjour! Thank you for your interest in our orthodontic services.</p>',
        delayDays: 0,
      },
    });
    const seq2 = await prisma.emailDripSequence.create({
      data: {
        campaignId: campaign.id,
        sequenceOrder: 2,
        name: 'Email 2',
        subject: 'Follow-up: Your orthodontic journey',
        htmlContent: '<p>We wanted to follow up on your consultation.</p>',
        delayDays: 3,
      },
    });
    dripCampaigns.push({ id: campaign.id, sequences: [seq1, seq2] });
  }
  console.log(`   ✓ Created ${dripCampaigns.length} drip campaigns with sequences\n`);

  // Enrollments + Messages
  console.log('📬 Creating drip enrollments and messages...');
  let enrollmentCount = 0;
  let messageCount = 0;
  for (let i = 0; i < 25; i++) {
    const campaignData = dripCampaigns[i % dripCampaigns.length];
    const lead = leads[i % leads.length];
    const email = lead.email || `lead${lead.id.slice(-6)}@example.com`;
    const existing = await prisma.emailDripEnrollment.findUnique({
      where: { campaignId_leadId: { campaignId: campaignData.id, leadId: lead.id } },
    });
    if (existing) continue;
    const enrollment = await prisma.emailDripEnrollment.create({
      data: {
        campaignId: campaignData.id,
        leadId: lead.id,
        status: randomElement(['ACTIVE', 'COMPLETED', 'ACTIVE'] as const),
        currentSequenceId: campaignData.sequences[0].id,
        currentStep: randomInt(0, 2),
        totalOpened: randomInt(0, 3),
        totalClicked: randomInt(0, 1),
        enrolledAt: randomDate(threeMonthsAgo, now),
        completedAt: Math.random() > 0.6 ? randomDate(threeMonthsAgo, now) : null,
      },
    });
    enrollmentCount++;
    const seq = campaignData.sequences[0];
    const status = randomElement(['SENT', 'DELIVERED', 'OPENED', 'PENDING'] as const);
    await prisma.emailDripMessage.create({
      data: {
        enrollmentId: enrollment.id,
        sequenceId: seq.id,
        recipientEmail: email,
        recipientName: lead.contactPerson,
        subject: 'Welcome to Montreal Orthodontics',
        htmlContent: '<p>Thank you for your interest.</p>',
        status,
        scheduledFor: randomDate(threeMonthsAgo, now),
        sentAt: status !== 'PENDING' ? randomDate(threeMonthsAgo, now) : null,
        deliveredAt: status === 'DELIVERED' || status === 'OPENED' ? randomDate(threeMonthsAgo, now) : null,
        openedAt: status === 'OPENED' ? randomDate(threeMonthsAgo, now) : null,
        openCount: status === 'OPENED' ? 1 : 0,
      },
    });
    messageCount++;
  }
  await prisma.emailDripCampaign.updateMany({
    where: { userId: user.id },
    data: { totalEnrolled: enrollmentCount },
  });
  console.log(`   ✓ Created ${enrollmentCount} enrollments, ${messageCount} drip messages\n`);

  // ─── 2. Legacy Campaigns (3–5) + CampaignLead + CampaignMessage ─────────────
  console.log('📣 Creating legacy campaigns...');
  const campaignTypes = ['REVIEW_REQUEST', 'REFERRAL_REQUEST', 'EMAIL', 'SMS'] as const;
  const campaignStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED'] as const;
  const campaigns: { id: string }[] = [];
  for (let i = 0; i < 4; i++) {
    const c = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: `Orthodontist ${campaignTypes[i]} Campaign`,
        type: campaignTypes[i],
        status: campaignStatuses[i % campaignStatuses.length],
        emailSubject: campaignTypes[i] === 'EMAIL' ? 'Special offer for orthodontic care' : null,
        emailBody: campaignTypes[i] === 'EMAIL' ? 'We have a limited-time offer...' : null,
        smsTemplate: campaignTypes[i] === 'SMS' ? 'Reminder: Your appointment is tomorrow.' : null,
        reviewUrl: campaignTypes[i] === 'REVIEW_REQUEST' ? 'https://g.page/montreal-ortho/review' : null,
        referralReward: campaignTypes[i] === 'REFERRAL_REQUEST' ? '$50 gift card' : null,
        sentCount: randomInt(5, 30),
        totalRecipients: randomInt(20, 50),
      },
    });
    campaigns.push({ id: c.id });
  }
  let clCount = 0;
  let cmCount = 0;
  for (const c of campaigns) {
    for (let i = 0; i < 8; i++) {
      const lead = leads[i % leads.length];
      try {
        await prisma.campaignLead.create({
          data: {
            campaignId: c.id,
            leadId: lead.id,
            status: randomElement(['PENDING', 'SENT', 'DELIVERED', 'RESPONDED'] as const),
            sentAt: Math.random() > 0.5 ? randomDate(threeMonthsAgo, now) : null,
          },
        });
        clCount++;
      } catch {
        // unique constraint
      }
      if (Math.random() > 0.5) {
        await prisma.campaignMessage.create({
          data: {
            campaignId: c.id,
            recipientType: 'lead',
            recipientId: lead.id,
            recipientEmail: lead.email || 'contact@example.com',
            recipientPhone: lead.phone || '514-555-0000',
            recipientName: lead.contactPerson,
            status: randomElement(['PENDING', 'SENT', 'DELIVERED'] as const),
            sentAt: randomDate(threeMonthsAgo, now),
          },
        });
        cmCount++;
      }
    }
  }
  console.log(`   ✓ Created ${campaigns.length} campaigns, ${clCount} campaign leads, ${cmCount} campaign messages\n`);

  // ─── 3. ScheduledEmail (5–15) ───────────────────────────────────────────────
  console.log('📤 Creating scheduled emails...');
  let schedEmailCount = 0;
  for (let i = 0; i < 12; i++) {
    const lead = leads[i % leads.length];
    const email = lead.email || `lead${i}@example.com`;
    const status = randomElement(['PENDING', 'SENT', 'CANCELLED'] as const);
    await prisma.scheduledEmail.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        toEmail: email,
        toName: lead.contactPerson,
        subject: 'Appointment reminder - Montreal Orthodontics',
        body: 'This is a reminder for your upcoming appointment.',
        scheduledFor: randomDate(now, oneMonthAhead),
        status,
        sentAt: status === 'SENT' ? randomDate(threeMonthsAgo, now) : null,
      },
    });
    schedEmailCount++;
  }
  console.log(`   ✓ Created ${schedEmailCount} scheduled emails\n`);

  // ─── 4. ScheduledSms (5–15) ────────────────────────────────────────────────
  console.log('📱 Creating scheduled SMS...');
  let schedSmsCount = 0;
  for (let i = 0; i < 12; i++) {
    const lead = leads[i % leads.length];
    const phone = lead.phone || `514-555-${String(1000 + i).padStart(4, '0')}`;
    const status = randomElement(['PENDING', 'SENT', 'CANCELLED'] as const);
    await prisma.scheduledSms.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        toPhone: phone,
        toName: lead.contactPerson,
        message: 'Reminder: Your orthodontic appointment is tomorrow. Reply to confirm.',
        scheduledFor: randomDate(now, oneMonthAhead),
        status,
        sentAt: status === 'SENT' ? randomDate(threeMonthsAgo, now) : null,
      },
    });
    schedSmsCount++;
  }
  console.log(`   ✓ Created ${schedSmsCount} scheduled SMS\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 7 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Drip campaigns: ${dripCampaigns.length}, Enrollments: ${enrollmentCount}, Messages: ${messageCount}`);
  console.log(`   • Legacy campaigns: ${campaigns.length}, Leads: ${clCount}, Messages: ${cmCount}`);
  console.log(`   • Scheduled emails: ${schedEmailCount}, Scheduled SMS: ${schedSmsCount}`);
  console.log('\n🎉 Run Phase 8 next for workflows.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
