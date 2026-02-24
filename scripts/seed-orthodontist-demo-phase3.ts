/**
 * Orthodontist Demo - Phase 3: Pipeline, Deals, Payments, Invoices
 * Creates sales pipeline, 50+ deals across stages, payments (CAD), invoices
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

const DEAL_TITLES = [
  'Teen Braces Package', 'Invisalign Treatment', 'Adult Orthodontics', 'Retainer Program',
  'Comprehensive Treatment Plan', 'Phase 1 Treatment', 'Phase 2 Treatment', 'Emergency Consultation',
  'Follow-up Treatment', 'Maintenance Program', 'Clear Aligner Program', 'Ceramic Braces',
  'Metal Braces Package', 'Early Intervention', 'Adult Clear Aligners', 'Lingual Braces',
  'Functional Orthodontics', 'Retainer Replacement', 'Debonding & Retainers',
];

const DEAL_ACTIVITIES = [
  'Initial consultation completed', 'Treatment plan presented', 'Follow-up call scheduled',
  'Payment plan discussed', 'Appointment confirmed', 'Treatment started',
  'Progress check completed', 'Contract sent', 'Contract signed', 'Payment received',
  'Insurance pre-auth submitted', 'Records appointment scheduled', 'Braces placed',
  'Adjustment completed', 'Retainer fitted',
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
  console.log('🌱 Orthodontist Demo - Phase 3: Pipeline, Deals, Payments, Invoices\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  if (leads.length === 0) {
    console.error('❌ No leads found. Run Phase 2 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads\n`);

  // Clean Phase 3 data
  console.log('🧹 Cleaning existing pipeline, deals, payments, invoices...');
  await prisma.invoice.deleteMany({ where: { userId: user.id } });
  await prisma.payment.deleteMany({ where: { userId: user.id } });
  await prisma.dealActivity.deleteMany({ where: { deal: { userId: user.id } } });
  await prisma.deal.deleteMany({ where: { userId: user.id } });
  await prisma.pipelineStage.deleteMany({ where: { pipeline: { userId: user.id } } });
  await prisma.pipeline.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // ─── 1. Pipeline & Stages ───────────────────────────────────────────────────
  console.log('📊 Creating pipeline...');
  const pipeline = await prisma.pipeline.create({
    data: {
      userId: user.id,
      name: 'Orthodontic Treatment Pipeline',
      description: 'Sales pipeline for orthodontic treatments',
      isDefault: true,
      displayOrder: 0,
    },
  });

  const stageData = [
    { name: 'Lead', probability: 10, order: 0 },
    { name: 'Qualified', probability: 25, order: 1 },
    { name: 'Consultation', probability: 50, order: 2 },
    { name: 'Proposal', probability: 75, order: 3 },
    { name: 'Negotiation', probability: 85, order: 4 },
    { name: 'Won', probability: 100, order: 5 },
    { name: 'Lost', probability: 0, order: 6 },
  ];

  const stages: { id: string; name: string }[] = [];
  for (const s of stageData) {
    const stage = await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        name: s.name,
        displayOrder: s.order,
        probability: s.probability,
      },
    });
    stages.push(stage);
  }
  console.log(`   ✓ Created pipeline with ${stages.length} stages\n`);

  // ─── 2. Deals ──────────────────────────────────────────────────────────────
  console.log('💰 Creating deals...');
  const stageDist = [
    { stage: 'Lead', count: 8 },
    { stage: 'Qualified', count: 10 },
    { stage: 'Consultation', count: 12 },
    { stage: 'Proposal', count: 8 },
    { stage: 'Negotiation', count: 6 },
    { stage: 'Won', count: 15 },
    { stage: 'Lost', count: 6 },
  ];

  const deals: { id: string; value: number; leadId: string | null; stage: string; createdAt: Date; lead: { contactPerson: string | null; businessName: string; email: string | null; phone: string | null } | null }[] = [];
  let leadIdx = 0;

  for (const dist of stageDist) {
    const stage = stages.find((s) => s.name === dist.stage);
    if (!stage) continue;

    for (let i = 0; i < dist.count; i++) {
      const lead = leads[leadIdx % leads.length];
      leadIdx++;
      const createdAt = randomDate(sixMonthsAgo, now);
      const value = randomInt(1800, 12000); // CAD
      const actualCloseDate = ['Won', 'Lost'].includes(dist.stage) ? randomDate(createdAt, now) : null;
      const lostReason = dist.stage === 'Lost' ? randomElement(['Price too high', 'Went with competitor', 'Not ready yet', 'Budget constraints']) : null;

      const deal = await prisma.deal.create({
        data: {
          userId: user.id,
          pipelineId: pipeline.id,
          stageId: stage.id,
          title: randomElement(DEAL_TITLES),
          value,
          currency: 'CAD',
          probability: stage.probability,
          priority: randomElement(['LOW', 'MEDIUM', 'HIGH']) as any,
          leadId: lead.id,
          expectedCloseDate: !actualCloseDate ? new Date(now.getTime() + randomInt(7, 90) * 86400000) : null,
          actualCloseDate,
          lostReason,
          description: `Treatment plan includes ${randomElement(['braces', 'Invisalign', 'retainers', 'comprehensive care'])}.`,
          createdAt,
          updatedAt: createdAt,
        },
        include: { lead: true },
      });
      deals.push({ ...deal, stage: dist.stage });

      for (let j = 0; j < randomInt(2, 6); j++) {
        await prisma.dealActivity.create({
          data: {
            dealId: deal.id,
            userId: user.id,
            type: randomElement(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK_COMPLETED', 'STAGE_CHANGED']) as any,
            description: randomElement(DEAL_ACTIVITIES),
            createdAt: randomDate(createdAt, now),
          },
        });
      }
    }
  }
  console.log(`   ✓ Created ${deals.length} deals with activities\n`);

  // ─── 3. Payments ───────────────────────────────────────────────────────────
  console.log('💳 Creating payments...');
  const wonStage = stages.find((s) => s.name === 'Won');
  const wonDeals = wonStage ? deals.filter((d) => d.stage === 'Won') : [];

  for (const deal of wonDeals.slice(0, 12)) {
    const paymentCount = randomInt(1, 3);
    const amount = deal.value / paymentCount;
    for (let i = 0; i < paymentCount; i++) {
      const paidAt = randomDate(deal.createdAt || sixMonthsAgo, now);
      const status = randomElement(['SUCCEEDED', 'SUCCEEDED', 'SUCCEEDED', 'PENDING']) as any;
      await prisma.payment.create({
        data: {
          userId: user.id,
          provider: 'STRIPE',
          amount,
          currency: 'CAD',
          status,
          paymentType: randomElement(['DEAL', 'INVOICE', 'SERVICE']) as any,
          customerName: deal.lead?.contactPerson || deal.lead?.businessName || 'Customer',
          customerEmail: deal.lead?.email || 'customer@example.com',
          customerPhone: deal.lead?.phone || null,
          dealId: deal.id,
          leadId: deal.leadId,
          description: `Payment ${i + 1}/${paymentCount} for ${deal.title}`,
          paymentMethod: randomElement(['card', 'ach', 'bank_transfer']),
          last4: randomInt(1000, 9999).toString(),
          cardBrand: randomElement(['visa', 'mastercard', 'amex']),
          paidAt: status === 'SUCCEEDED' ? paidAt : null,
          receiptUrl: status === 'SUCCEEDED' ? `https://receipts.example.com/payment-${deal.id}-${i}.pdf` : null,
          receiptNumber: status === 'SUCCEEDED' ? `RCP-${randomInt(10000, 99999)}` : null,
          createdAt: paidAt,
          updatedAt: paidAt,
        },
      });
    }
  }

  for (let i = 0; i < 8; i++) {
    const lead = randomElement(leads);
    const paidAt = randomDate(sixMonthsAgo, now);
    const status = randomElement(['SUCCEEDED', 'SUCCEEDED', 'PENDING']) as any;
    await prisma.payment.create({
      data: {
        userId: user.id,
        provider: 'STRIPE',
        amount: randomFloat(500, 5000),
        currency: 'CAD',
        status,
        paymentType: randomElement(['SERVICE', 'APPOINTMENT', 'OTHER']) as any,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'customer@example.com',
        customerPhone: lead.phone || null,
        leadId: lead.id,
        description: randomElement(['Consultation fee', 'Treatment deposit', 'Monthly payment', 'Retainer fee', 'Follow-up appointment']),
        paymentMethod: randomElement(['card', 'ach']),
        last4: randomInt(1000, 9999).toString(),
        cardBrand: randomElement(['visa', 'mastercard']),
        paidAt: status === 'SUCCEEDED' ? paidAt : null,
        receiptUrl: status === 'SUCCEEDED' ? `https://receipts.example.com/standalone-${i}.pdf` : null,
        receiptNumber: status === 'SUCCEEDED' ? `RCP-${randomInt(10000, 99999)}` : null,
        createdAt: paidAt,
        updatedAt: paidAt,
      },
    });
  }
  const paymentCount = await prisma.payment.count({ where: { userId: user.id } });
  console.log(`   ✓ Created ${paymentCount} payments\n`);

  // ─── 4. Invoices ───────────────────────────────────────────────────────────
  console.log('📄 Creating invoices...');
  const invoiceStatuses = ['PAID', 'PAID', 'SENT', 'OVERDUE', 'DRAFT'] as const;
  for (let i = 0; i < 15; i++) {
    const deal = randomElement(deals);
    const lead = deal.lead || leads[i % leads.length];
    const totalAmount = randomFloat(800, 6000);
    const status = randomElement(invoiceStatuses);
    const invoiceNum = `INV-2024-${String(1000 + i).padStart(4, '0')}`;
    const dueDate = randomDate(now, new Date(now.getTime() + 60 * 86400000));
    const paidAmount = status === 'PAID' ? totalAmount : status === 'SENT' ? randomFloat(0, totalAmount * 0.5) : 0;

    await prisma.invoice.create({
      data: {
        userId: user.id,
        invoiceNumber: invoiceNum,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'customer@example.com',
        customerPhone: lead.phone || null,
        status,
        issueDate: randomDate(sixMonthsAgo, now),
        dueDate,
        items: [{ description: 'Orthodontic treatment', quantity: 1, unitPrice: totalAmount, amount: totalAmount }],
        subtotal: totalAmount,
        taxRate: 0,
        taxAmount: 0,
        totalAmount,
        paidAmount,
        currency: 'CAD',
        paymentTerms: 'Net 30',
        dealId: i < 10 ? deal.id : null,
        leadId: lead.id,
        paidAt: status === 'PAID' ? randomDate(sixMonthsAgo, now) : null,
      },
    });
  }
  const invoiceCount = await prisma.invoice.count({ where: { userId: user.id } });
  console.log(`   ✓ Created ${invoiceCount} invoices\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 3 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Pipeline: 1 with ${stages.length} stages`);
  console.log(`   • Deals: ${deals.length} (CAD)`);
  console.log(`   • Payments: ${paymentCount}`);
  console.log(`   • Invoices: ${invoiceCount}`);
  console.log('\n🎉 Run Phase 4 next for inventory & e-commerce.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
