/**
 * Mock Data Seed Script for orthodontist@nexrel.com
 * Creates comprehensive CRM data: leads, deals, campaigns, messages, calls, etc.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ORTHODONTIST_EMAIL = 'orthodontist@nexrel.com';

// Mock data arrays
const leadNames = [
  'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Martinez',
  'James Wilson', 'Amanda Brown', 'Robert Taylor', 'Lisa Anderson', 'Christopher Lee',
  'Michelle White', 'Daniel Garcia', 'Ashley Moore', 'Matthew Davis', 'Nicole Jackson',
  'Andrew Thompson', 'Stephanie Harris', 'Kevin Martin', 'Rachel Clark', 'Brandon Lewis',
  'Lauren Walker', 'Ryan Hall', 'Megan Young', 'Justin King', 'Samantha Wright',
  'Tyler Lopez', 'Brittany Hill', 'Jordan Green', 'Alexis Adams', 'Nathan Baker'
];

const companies = [
  'Johnson Orthodontics', 'Smile Care Center', 'Perfect Smile Dental', 'Bright Orthodontics',
  'Family Dental Group', 'Coastal Orthodontics', 'Metro Dental Care', 'Elite Orthodontics',
  'Premier Dental Solutions', 'Advanced Orthodontic Care', 'Sunset Dental Group',
  'Pacific Orthodontics', 'Valley Dental Associates', 'Summit Orthodontics', 'Apex Dental Care'
];

const dealTitles = [
  'Teen Braces Package', 'Invisalign Treatment', 'Adult Orthodontics', 'Retainer Program',
  'Comprehensive Treatment Plan', 'Phase 1 Treatment', 'Phase 2 Treatment', 'Emergency Consultation',
  'Follow-up Treatment', 'Maintenance Program', 'Full Mouth Reconstruction', 'Cosmetic Alignment',
  'Functional Orthodontics', 'Surgical Orthodontics', 'Clear Aligner Program'
];

const campaignNames = [
  'Summer Smile Campaign', 'Back to School Special', 'New Year New Smile', 'Valentine\'s Day Promotion',
  'Spring Cleaning Sale', 'Holiday Special', 'Referral Program', 'Social Media Campaign',
  'Email Newsletter', 'Google Ads Campaign', 'Facebook Ads', 'Instagram Promotion'
];

const messageTemplates = [
  'Thank you for your interest in our orthodontic services!',
  'We\'d love to schedule a consultation with you.',
  'Your treatment plan is ready for review.',
  'Reminder: Your next appointment is coming up.',
  'Congratulations on completing your treatment!',
  'We have a special offer that might interest you.',
  'Thank you for choosing our practice.',
  'Your braces adjustment appointment is confirmed.',
];

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
  console.log('🌱 Starting mock data seeding for orthodontist@nexrel.com...\n');

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email: ORTHODONTIST_EMAIL },
  });

  if (!user) {
    console.error(`❌ User not found with email: ${ORTHODONTIST_EMAIL}`);
    console.log('Please ensure the user exists before running this script.');
    return;
  }

  console.log(`✅ Found user: ${user.name} (${user.email})\n`);
  console.log(`   User ID: ${user.id}\n`);

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('🧹 Cleaning existing data...');
  await prisma.dealActivity.deleteMany({ where: { deal: { userId: user.id } } });
  await prisma.deal.deleteMany({ where: { userId: user.id } });
  await prisma.campaignLead.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaignMessage.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaign.deleteMany({ where: { userId: user.id } });
  await prisma.message.deleteMany({ where: { userId: user.id } });
  await prisma.callLog.deleteMany({ where: { userId: user.id } });
  await prisma.lead.deleteMany({ where: { userId: user.id } });
  console.log('✅ Existing data cleaned\n');

  // ===================
  // CREATE LEADS
  // ===================
  console.log('👥 Creating Leads...');
  const leads: any[] = [];
  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < 30; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
    const status = randomElement(statuses);
    
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        businessName: randomElement(companies),
        contactPerson: leadNames[i],
        email: `${leadNames[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        status: status as any,
        source: randomElement(['Website', 'Referral', 'Social Media', 'Google Ads', 'Walk-in', 'Phone']),
        notes: `Patient interested in ${randomElement(['braces', 'Invisalign', 'retainers', 'consultation'])}.`,
        createdAt,
        updatedAt: createdAt,
      },
    });
    leads.push(lead);
  }
  console.log(`✅ Created ${leads.length} leads\n`);

  // ===================
  // CREATE DEALS
  // ===================
  console.log('💰 Creating Deals...');
  const deals: any[] = [];
  const qualifiedLeads = leads.filter(l => l.status === 'QUALIFIED' || l.status === 'CONVERTED');
  
  for (let i = 0; i < 15; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const dealStatuses = ['OPEN', 'NEGOTIATION', 'WON', 'LOST', 'CLOSED'];
    const dealStatus = randomElement(dealStatuses);
    const value = randomInt(2000, 8000);
    const lead = i < qualifiedLeads.length ? qualifiedLeads[i] : randomElement(leads);

    const deal = await prisma.deal.create({
      data: {
        userId: user.id,
        title: randomElement(dealTitles),
        value: value,
        status: dealStatus as any,
        leadId: lead.id,
        expectedCloseDate: new Date(now.getTime() + randomInt(7, 90) * 24 * 60 * 60 * 1000),
        probability: randomInt(20, 90),
        notes: `Treatment plan includes ${randomElement(['braces', 'Invisalign', 'retainers'])}.`,
        createdAt,
        updatedAt: createdAt,
      },
    });
    deals.push(deal);

    // Create deal activities
    const activityCount = randomInt(2, 5);
    for (let j = 0; j < activityCount; j++) {
      await prisma.dealActivity.create({
        data: {
          dealId: deal.id,
          type: randomElement(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
          description: randomElement([
            'Initial consultation completed',
            'Treatment plan presented',
            'Follow-up call scheduled',
            'Payment plan discussed',
            'Appointment confirmed',
            'Treatment started',
            'Progress check completed',
          ]),
          createdAt: randomDate(createdAt, now),
        },
      });
    }
  }
  console.log(`✅ Created ${deals.length} deals with activities\n`);

  // ===================
  // CREATE CAMPAIGNS
  // ===================
  console.log('📢 Creating Campaigns...');
  const campaigns: any[] = [];
  
  for (let i = 0; i < 8; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const campaignStatuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED'];
    const campaignStatus = randomElement(campaignStatuses);
    const campaignType = randomElement(['EMAIL', 'SMS', 'VOICE']);

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: randomElement(campaignNames),
        type: campaignType as any,
        status: campaignStatus as any,
        startDate: createdAt,
        endDate: new Date(createdAt.getTime() + randomInt(7, 30) * 24 * 60 * 60 * 1000),
        description: `Campaign targeting ${randomElement(['new patients', 'existing patients', 'referrals'])}.`,
        createdAt,
        updatedAt: createdAt,
      },
    });
    campaigns.push(campaign);

    // Add leads to campaign
    const campaignLeads = leads.slice(i * 3, (i + 1) * 3);
    for (const lead of campaignLeads) {
      await prisma.campaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          status: randomElement(['PENDING', 'SENT', 'OPENED', 'CLICKED', 'REPLIED']),
        },
      });
    }

    // Create campaign messages
    const messageCount = randomInt(2, 4);
    for (let j = 0; j < messageCount; j++) {
      await prisma.campaignMessage.create({
        data: {
          campaignId: campaign.id,
          subject: `${campaign.name} - Message ${j + 1}`,
          content: randomElement(messageTemplates),
          scheduledAt: randomDate(createdAt, campaign.endDate || now),
          status: randomElement(['DRAFT', 'SCHEDULED', 'SENT', 'DELIVERED']),
        },
      });
    }
  }
  console.log(`✅ Created ${campaigns.length} campaigns with leads and messages\n`);

  // ===================
  // CREATE MESSAGES
  // ===================
  console.log('💬 Creating Messages...');
  const messageCount = 50;
  for (let i = 0; i < messageCount; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const lead = randomElement(leads);
    const messageType = randomElement(['EMAIL', 'SMS']);
    const direction = randomElement(['INBOUND', 'OUTBOUND']);

    await prisma.message.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        type: messageType as any,
        direction: direction as any,
        from: direction === 'OUTBOUND' ? user.email || 'office@orthodontist.com' : lead.email || 'patient@example.com',
        to: direction === 'OUTBOUND' ? lead.email || 'patient@example.com' : user.email || 'office@orthodontist.com',
        subject: messageType === 'EMAIL' ? randomElement([
          'Consultation Request',
          'Treatment Plan Inquiry',
          'Appointment Confirmation',
          'Follow-up Question',
          'Thank You Message',
        ]) : null,
        body: randomElement(messageTemplates),
        status: randomElement(['SENT', 'DELIVERED', 'READ', 'REPLIED']),
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
  console.log(`✅ Created ${messageCount} messages\n`);

  // ===================
  // CREATE CALL LOGS
  // ===================
  console.log('📞 Creating Call Logs...');
  const callCount = 40;
  for (let i = 0; i < callCount; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const lead = randomElement(leads);
    const direction = randomElement(['INBOUND', 'OUTBOUND']);
    const duration = randomInt(30, 600); // 30 seconds to 10 minutes
    const status = randomElement(['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED', 'VOICEMAIL']);

    await prisma.callLog.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        direction: direction as any,
        from: direction === 'OUTBOUND' ? user.phone || '555-000-0000' : lead.phone || '555-000-0000',
        to: direction === 'OUTBOUND' ? lead.phone || '555-000-0000' : user.phone || '555-000-0000',
        duration: status === 'COMPLETED' ? duration : 0,
        status: status as any,
        recordingUrl: status === 'COMPLETED' && Math.random() > 0.5 ? `https://recordings.example.com/call-${i}.mp3` : null,
        notes: randomElement([
          'Patient interested in consultation',
          'Scheduled follow-up appointment',
          'Discussed treatment options',
          'Left voicemail',
          'No answer - will try again later',
          'Patient requested callback',
        ]),
        createdAt,
        updatedAt: createdAt,
      },
    });
  }
  console.log(`✅ Created ${callCount} call logs\n`);

  // ===================
  // SUMMARY
  // ===================
  console.log('\n📊 Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const finalLeads = await prisma.lead.count({ where: { userId: user.id } });
  const finalDeals = await prisma.deal.count({ where: { userId: user.id } });
  const finalCampaigns = await prisma.campaign.count({ where: { userId: user.id } });
  const finalMessages = await prisma.message.count({ where: { userId: user.id } });
  const finalCalls = await prisma.callLog.count({ where: { userId: user.id } });
  
  const openDeals = await prisma.deal.findMany({
    where: { userId: user.id, status: { not: 'CLOSED' } },
    select: { value: true },
  });
  const totalRevenue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

  console.log(`✅ Leads: ${finalLeads}`);
  console.log(`✅ Deals: ${finalDeals} (Open: ${openDeals.length}, Revenue: $${totalRevenue.toLocaleString()})`);
  console.log(`✅ Campaigns: ${finalCampaigns}`);
  console.log(`✅ Messages: ${finalMessages}`);
  console.log(`✅ Call Logs: ${finalCalls}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Mock data seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
