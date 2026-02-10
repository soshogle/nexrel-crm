/**
 * Enhanced Mock Data Seed Script
 * Creates comprehensive CRM data: leads, deals with pipeline stages, payments, sales data
 * For testing conversation AI's ability to generate graphs and charts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USER_EMAIL = 'orthodontist@nexrel.com';

// Mock data arrays
const leadNames = [
  'Sarah Johnson', 'Michael Chen', 'Emily Rodriguez', 'David Kim', 'Jessica Martinez',
  'James Wilson', 'Amanda Brown', 'Robert Taylor', 'Lisa Anderson', 'Christopher Lee',
  'Michelle White', 'Daniel Garcia', 'Ashley Moore', 'Matthew Davis', 'Nicole Jackson',
  'Andrew Thompson', 'Stephanie Harris', 'Kevin Martin', 'Rachel Clark', 'Brandon Lewis',
  'Lauren Walker', 'Ryan Hall', 'Megan Young', 'Justin King', 'Samantha Wright',
  'Tyler Lopez', 'Brittany Hill', 'Jordan Green', 'Alexis Adams', 'Nathan Baker',
  'Olivia Parker', 'Ethan Cooper', 'Sophia Bennett', 'Noah Richardson', 'Isabella Ward',
  'Lucas Mitchell', 'Ava Foster', 'Mason Phillips', 'Charlotte Campbell', 'Logan Parker',
  'Harper Evans', 'Aiden Turner', 'Amelia Collins', 'Carter Stewart', 'Evelyn Morris',
  'Jackson Rogers', 'Abigail Reed', 'Sebastian Cook', 'Emily Bailey', 'Henry Rivera'
];

const companies = [
  'Johnson Orthodontics', 'Smile Care Center', 'Perfect Smile Dental', 'Bright Orthodontics',
  'Family Dental Group', 'Coastal Orthodontics', 'Metro Dental Care', 'Elite Orthodontics',
  'Premier Dental Solutions', 'Advanced Orthodontic Care', 'Sunset Dental Group',
  'Pacific Orthodontics', 'Valley Dental Associates', 'Summit Orthodontics', 'Apex Dental Care',
  'Diamond Dental Studio', 'Crystal Clear Orthodontics', 'Smile Design Center', 'Modern Orthodontics',
  'Comprehensive Dental Care', 'Gentle Orthodontics', 'Innovative Smile Solutions'
];

const dealTitles = [
  'Teen Braces Package', 'Invisalign Treatment', 'Adult Orthodontics', 'Retainer Program',
  'Comprehensive Treatment Plan', 'Phase 1 Treatment', 'Phase 2 Treatment', 'Emergency Consultation',
  'Follow-up Treatment', 'Maintenance Program', 'Full Mouth Reconstruction', 'Cosmetic Alignment',
  'Functional Orthodontics', 'Surgical Orthodontics', 'Clear Aligner Program', 'Lingual Braces',
  'Ceramic Braces', 'Metal Braces Package', 'Early Intervention', 'Adult Clear Aligners'
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

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  console.log('🌱 Starting enhanced mock data seeding...\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  // Find the user - ONLY for orthodontist@nexrel.com
  const user = await prisma.user.findUnique({
    where: { email: USER_EMAIL },
  });

  if (!user) {
    console.error(`❌ User not found with email: ${USER_EMAIL}`);
    console.log('Please ensure the user exists before running this script.');
    return;
  }

  // Double-check we're targeting the correct user
  if (user.email !== USER_EMAIL) {
    console.error(`❌ User email mismatch! Expected ${USER_EMAIL}, got ${user.email}`);
    return;
  }

  console.log(`✅ Found user: ${user.name} (${user.email})`);
  console.log(`   User ID: ${user.id}\n`);

  // Clear existing data - ONLY for orthodontist@nexrel.com
  console.log(`🧹 Cleaning existing data for ${USER_EMAIL}...`);
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.dealActivity.deleteMany({ where: { deal: { userId: user.id } } });
  await prisma.deal.deleteMany({ where: { userId: user.id } });
  await prisma.pipelineStage.deleteMany({ where: { pipeline: { userId: user.id } } });
  await prisma.pipeline.deleteMany({ where: { userId: user.id } });
  await prisma.campaignLead.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaignMessage.deleteMany({ where: { campaign: { userId: user.id } } });
  await prisma.campaign.deleteMany({ where: { userId: user.id } });
  await prisma.message.deleteMany({ where: { userId: user.id } });
  await prisma.callLog.deleteMany({ where: { userId: user.id } });
  await prisma.lead.deleteMany({ where: { userId: user.id } });
  console.log(`✅ Existing data cleaned for ${USER_EMAIL}\n`);

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // ===================
  // CREATE PIPELINE & STAGES
  // ===================
  console.log('📊 Creating Sales Pipeline...');
  
  // Create default pipeline
  const pipeline = await prisma.pipeline.create({
    data: {
      userId: user.id,
      name: 'Sales Pipeline',
      description: 'Main sales pipeline for orthodontic treatments',
      isDefault: true,
      displayOrder: 0,
    },
  });

  // Create pipeline stages
  const stageNames = [
    { name: 'Lead', probability: 10, order: 0 },
    { name: 'Qualified', probability: 25, order: 1 },
    { name: 'Consultation', probability: 50, order: 2 },
    { name: 'Proposal', probability: 75, order: 3 },
    { name: 'Negotiation', probability: 85, order: 4 },
    { name: 'Won', probability: 100, order: 5 },
    { name: 'Lost', probability: 0, order: 6 },
  ];

  const stages: any[] = [];
  for (const stageData of stageNames) {
    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: stageData.name,
        displayOrder: stageData.order,
        probability: stageData.probability,
      },
    });
    stages.push(stage);
  }
  console.log(`✅ Created pipeline with ${stages.length} stages\n`);

  // ===================
  // CREATE LEADS
  // ===================
  console.log('👥 Creating Leads...');
  const leads: any[] = [];
  const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];

  for (let i = 0; i < 50; i++) {
    const createdAt = randomDate(oneYearAgo, now);
    const status = randomElement(leadStatuses);
    
    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        businessName: randomElement(companies),
        contactPerson: leadNames[i],
        email: `${leadNames[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: `555-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
        status: status as any,
        source: randomElement(['Website', 'Referral', 'Social Media', 'Google Ads', 'Walk-in', 'Phone', 'Email Campaign']),
        createdAt,
        updatedAt: createdAt,
      },
    });
    leads.push(lead);
  }
  console.log(`✅ Created ${leads.length} leads\n`);

  // ===================
  // CREATE DEALS WITH PIPELINE STAGES
  // ===================
  console.log('💰 Creating Deals with Pipeline Stages...');
  const deals: any[] = [];
  const qualifiedLeads = leads.filter(l => l.status === 'QUALIFIED' || l.status === 'CONVERTED');
  
  // Distribute deals across different stages
  const stageDistribution = [
    { stage: 'Lead', count: 8 },
    { stage: 'Qualified', count: 10 },
    { stage: 'Consultation', count: 12 },
    { stage: 'Proposal', count: 8 },
    { stage: 'Negotiation', count: 6 },
    { stage: 'Won', count: 15 },
    { stage: 'Lost', count: 6 },
  ];

  let leadIndex = 0;
  for (const dist of stageDistribution) {
    const stage = stages.find(s => s.name === dist.stage);
    if (!stage) continue;

    for (let i = 0; i < dist.count; i++) {
      const createdAt = randomDate(sixMonthsAgo, now);
      const value = randomInt(1500, 12000);
      const lead = leadIndex < leads.length ? leads[leadIndex] : randomElement(leads);
      leadIndex++;

      // For Won deals, set actualCloseDate
      // For Lost deals, set actualCloseDate and lostReason
      const actualCloseDate = dist.stage === 'Won' || dist.stage === 'Lost' 
        ? randomDate(createdAt, now) 
        : null;
      const lostReason = dist.stage === 'Lost' 
        ? randomElement(['Price too high', 'Went with competitor', 'Not ready yet', 'Budget constraints'])
        : null;

      const deal = await prisma.deal.create({
        data: {
          userId: user.id,
          pipelineId: pipeline.id,
          stageId: stage.id,
          title: randomElement(dealTitles),
          value: value,
          currency: 'USD',
          probability: stage.probability,
          priority: randomElement(['LOW', 'MEDIUM', 'HIGH']) as any,
          leadId: lead.id,
          expectedCloseDate: dist.stage !== 'Won' && dist.stage !== 'Lost' 
            ? new Date(now.getTime() + randomInt(7, 90) * 24 * 60 * 60 * 1000)
            : null,
          actualCloseDate,
          lostReason,
          description: `Treatment plan includes ${randomElement(['braces', 'Invisalign', 'retainers', 'comprehensive care'])}.`,
          createdAt,
          updatedAt: createdAt,
        },
      });
      deals.push(deal);

      // Create deal activities
      const activityCount = randomInt(2, 6);
      for (let j = 0; j < activityCount; j++) {
        await prisma.dealActivity.create({
          data: {
            dealId: deal.id,
            userId: user.id,
            type: randomElement(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK_COMPLETED', 'STAGE_CHANGED']) as any,
            description: randomElement([
              'Initial consultation completed',
              'Treatment plan presented',
              'Follow-up call scheduled',
              'Payment plan discussed',
              'Appointment confirmed',
              'Treatment started',
              'Progress check completed',
              'Contract sent',
              'Contract signed',
              'Payment received',
            ]),
            createdAt: randomDate(createdAt, now),
          },
        });
      }
    }
  }
  console.log(`✅ Created ${deals.length} deals across pipeline stages\n`);

  // ===================
  // CREATE PAYMENTS
  // ===================
  console.log('💳 Creating Payments...');
  const payments: any[] = [];
  
  // Get won deals for payments (fetch with lead data)
  const wonDealsWithLeads = await prisma.deal.findMany({
    where: { 
      userId: user.id,
      stageId: stages.find(s => s.name === 'Won')?.id,
    },
    include: {
      lead: true,
    },
    take: 12,
  });

  // Create payments for won deals (some partial, some full)
  for (const deal of wonDealsWithLeads) {
    const paymentCount = randomInt(1, 3); // 1-3 payments per deal
    const totalPaid = deal.value;
    const paymentAmount = totalPaid / paymentCount;

    for (let i = 0; i < paymentCount; i++) {
      const paidAt = randomDate(deal.createdAt, now);
      const paymentStatus = randomElement(['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED', 'PENDING', 'PROCESSING']) as any; // Mostly succeeded
      const paymentType = randomElement(['DEAL', 'INVOICE', 'SERVICE']) as any;

      const payment = await prisma.payment.create({
        data: {
          userId: user.id,
          provider: 'STRIPE',
          amount: paymentAmount,
          currency: 'USD',
          status: paymentStatus,
          paymentType,
          customerName: deal.lead?.contactPerson || deal.lead?.businessName || 'Customer',
          customerEmail: deal.lead?.email || 'customer@example.com',
          customerPhone: deal.lead?.phone || null,
          dealId: deal.id,
          leadId: deal.leadId,
          description: `Payment ${i + 1} of ${paymentCount} for ${deal.title}`,
          paymentMethod: randomElement(['card', 'ach', 'bank_transfer']),
          last4: randomInt(1000, 9999).toString(),
          cardBrand: randomElement(['visa', 'mastercard', 'amex']),
          paidAt: paymentStatus === 'SUCCEEDED' ? paidAt : null,
          receiptUrl: paymentStatus === 'SUCCEEDED' ? `https://receipts.example.com/payment-${payments.length + 1}.pdf` : null,
          receiptNumber: paymentStatus === 'SUCCEEDED' ? `RCP-${randomInt(10000, 99999)}` : null,
          createdAt: paidAt,
          updatedAt: paidAt,
        },
      });
      payments.push(payment);
    }
  }

  // Create some standalone payments (not linked to deals)
  for (let i = 0; i < 8; i++) {
    const lead = randomElement(leads);
    const paidAt = randomDate(sixMonthsAgo, now);
    const amount = randomFloat(500, 5000);
    const paymentStatus = randomElement(['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED', 'PENDING']) as any;

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        provider: 'STRIPE',
        amount,
        currency: 'USD',
        status: paymentStatus,
        paymentType: randomElement(['SERVICE', 'APPOINTMENT', 'OTHER']) as any,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'customer@example.com',
        customerPhone: lead.phone || null,
        leadId: lead.id,
        description: randomElement([
          'Consultation fee',
          'Treatment deposit',
          'Monthly payment',
          'Retainer fee',
          'Follow-up appointment',
        ]),
        paymentMethod: randomElement(['card', 'ach']),
        last4: randomInt(1000, 9999).toString(),
        cardBrand: randomElement(['visa', 'mastercard']),
        paidAt: paymentStatus === 'SUCCEEDED' ? paidAt : null,
        receiptUrl: paymentStatus === 'SUCCEEDED' ? `https://receipts.example.com/payment-standalone-${i + 1}.pdf` : null,
        receiptNumber: paymentStatus === 'SUCCEEDED' ? `RCP-${randomInt(10000, 99999)}` : null,
        createdAt: paidAt,
        updatedAt: paidAt,
      },
    });
    payments.push(payment);
  }

  console.log(`✅ Created ${payments.length} payments\n`);

  // ===================
  // CREATE CAMPAIGNS
  // ===================
  console.log('📢 Creating Campaigns...');
  const campaigns: any[] = [];
  const campaignNames = [
    'Summer Smile Campaign', 'Back to School Special', 'New Year New Smile', 'Valentine\'s Day Promotion',
    'Spring Cleaning Sale', 'Holiday Special', 'Referral Program', 'Social Media Campaign',
    'Email Newsletter', 'Google Ads Campaign', 'Facebook Ads', 'Instagram Promotion',
    'Q1 Marketing Push', 'Patient Retention Campaign', 'New Patient Welcome Series'
  ];
  
  for (let i = 0; i < 12; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const campaignStatuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED'];
    const campaignStatus = randomElement(campaignStatuses);
    const campaignType = randomElement(['EMAIL', 'SMS', 'VOICE_CALL', 'REVIEW_REQUEST', 'REFERRAL_REQUEST', 'FOLLOW_UP']);

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        name: campaignNames[i],
        type: campaignType as any,
        status: campaignStatus as any,
        scheduledFor: campaignStatus === 'SCHEDULED' ? createdAt : null,
        description: `Campaign targeting ${randomElement(['new patients', 'existing patients', 'referrals', 'inactive patients'])}.`,
        createdAt,
        updatedAt: createdAt,
      },
    });
    campaigns.push(campaign);

    // Add leads to campaign
    const campaignLeads = leads.slice(i * 3, (i + 1) * 3 + 5);
    for (const lead of campaignLeads) {
      await prisma.campaignLead.create({
        data: {
          campaignId: campaign.id,
          leadId: lead.id,
          status: randomElement(['PENDING', 'SENT', 'DELIVERED', 'RESPONDED', 'COMPLETED']) as any,
        },
      });
    }
  }
  console.log(`✅ Created ${campaigns.length} campaigns\n`);

  // ===================
  // CREATE MESSAGES
  // ===================
  console.log('💬 Creating Messages...');
  const messageCount = 75;
  for (let i = 0; i < messageCount; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const lead = randomElement(leads);
    const messageType = randomElement(['EMAIL', 'SMS']);
    const direction = randomElement(['INBOUND', 'OUTBOUND']);

    await prisma.message.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        content: randomElement([
          'Thank you for your interest in our orthodontic services!',
          'We\'d love to schedule a consultation with you.',
          'Your treatment plan is ready for review.',
          'Reminder: Your next appointment is coming up.',
          'Congratulations on completing your treatment!',
          'We have a special offer that might interest you.',
        ]),
        messageType: messageType.toLowerCase() === 'email' ? 'email' : 'sms',
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
  const callCount = 60;
  for (let i = 0; i < callCount; i++) {
    const createdAt = randomDate(sixMonthsAgo, now);
    const lead = randomElement(leads);
    const direction = randomElement(['INBOUND', 'OUTBOUND']);
    const duration = randomInt(30, 900); // 30 seconds to 15 minutes
    const status = randomElement(['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED']);

    await prisma.callLog.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        direction: direction as any,
        fromNumber: direction === 'OUTBOUND' ? user.phone || '555-000-0000' : lead.phone || '555-000-0000',
        toNumber: direction === 'OUTBOUND' ? lead.phone || '555-000-0000' : user.phone || '555-000-0000',
        duration: status === 'COMPLETED' ? duration : null,
        status: status as any,
        recordingUrl: status === 'COMPLETED' && Math.random() > 0.5 ? `https://recordings.example.com/call-${i}.mp3` : null,
        transcription: status === 'COMPLETED' && Math.random() > 0.7 ? randomElement([
          'Patient interested in consultation',
          'Scheduled follow-up appointment',
          'Discussed treatment options',
          'Left voicemail',
          'No answer - will try again later',
          'Patient requested callback',
          'Payment plan discussed',
          'Treatment progress reviewed',
        ]) : null,
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
  const finalPayments = await prisma.payment.count({ where: { userId: user.id } });
  const finalCampaigns = await prisma.campaign.count({ where: { userId: user.id } });
  const finalMessages = await prisma.message.count({ where: { userId: user.id } });
  const finalCalls = await prisma.callLog.count({ where: { userId: user.id } });
  
  // Get deals by stage
  const dealsByStage: Record<string, number> = {};
  for (const stage of stages) {
    const count = await prisma.deal.count({
      where: { userId: user.id, stageId: stage.id },
    });
    dealsByStage[stage.name] = count;
  }

  // Get open deals (without actualCloseDate)
  const openDeals = await prisma.deal.findMany({
    where: { 
      userId: user.id,
      actualCloseDate: null,
    },
    select: { value: true },
  });
  const totalPipelineValue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

  // Get successful payments
  const successfulPayments = await prisma.payment.findMany({
    where: { 
      userId: user.id,
      status: 'SUCCEEDED',
    },
    select: { amount: true },
  });
  const totalRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  console.log(`✅ Leads: ${finalLeads}`);
  console.log(`✅ Deals: ${finalDeals}`);
  console.log(`   - Pipeline Value: $${totalPipelineValue.toLocaleString()}`);
  console.log(`   - By Stage:`);
  for (const [stageName, count] of Object.entries(dealsByStage)) {
    console.log(`     • ${stageName}: ${count}`);
  }
  console.log(`✅ Payments: ${finalPayments} (Total Revenue: $${totalRevenue.toLocaleString()})`);
  console.log(`✅ Campaigns: ${finalCampaigns}`);
  console.log(`✅ Messages: ${finalMessages}`);
  console.log(`✅ Call Logs: ${finalCalls}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🎉 Enhanced mock data seeding completed successfully!\n');
  console.log('💡 You can now test the conversation AI with queries like:');
  console.log('   - "Show me my sales pipeline"');
  console.log('   - "What\'s my total revenue?"');
  console.log('   - "How many deals do I have?"');
  console.log('   - "Show me payment statistics"');
  console.log('   - "Display my sales performance"\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
