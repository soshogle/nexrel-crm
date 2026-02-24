/**
 * Orthodontist Demo - Phase 6: Referrals, Reviews, Reports, Feedback, BrandScan
 * Creates: Referral, Review, AiGeneratedReport, FeedbackCollection, BrandScan, BrandMention
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

const REVIEW_SOURCES = ['GOOGLE', 'FACEBOOK', 'YELP', 'TRUSTPILOT', 'HEALTHGRADES', 'ZOCDOC', 'INTERNAL', 'OTHER'] as const;
const BRAND_MENTION_SOURCES = ['GOOGLE', 'YELP', 'FACEBOOK', 'TRUSTPILOT', 'BBB', 'OTHER'] as const;

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const REVIEW_TEXTS = [
  'Excellent orthodontic care! My daughter\'s smile has improved so much. Highly recommend Montreal Orthodontics.',
  'Dr. Tremblay and the team are wonderful. Professional, friendly, and the results speak for themselves.',
  'Very satisfied with my Invisalign treatment. The staff made the process smooth and comfortable.',
  'Great experience from consultation to completion. Clear communication and flexible payment options.',
  'My son had braces here and we couldn\'t be happier. The office is clean and appointments run on time.',
  'Professional orthodontic care in Montreal. Would definitely refer friends and family.',
  'The team explained everything clearly. Treatment plan was tailored to my needs. Merci!',
  'Five stars for Montreal Orthodontics. Modern facility and caring staff.',
  'Retainer check was quick and efficient. Appreciate the follow-up care.',
  'Best orthodontist in Quebec. Worth the drive from Laval.',
];

const REFERRAL_NAMES = [
  'Marie-Claire Bouchard', 'Jean-François Gagnon', 'Sophie Leblanc', 'Pierre Dubois',
  'Isabelle Martin', 'Marc Tremblay', 'Nathalie Roy', 'André Lavoie',
  'Caroline Bergeron', 'François Mercier', 'Julie Côté', 'Philippe Gauthier',
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 6: Referrals, Reviews, Reports, Feedback, BrandScan\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  const appointments = await prisma.bookingAppointment.findMany({ where: { userId: user.id }, take: 40 });
  if (leads.length < 15) {
    console.error('❌ Not enough leads. Run Phases 1-2 and Phase 5 first.');
    process.exit(1);
  }

  console.log(`✅ Found ${leads.length} leads, ${appointments.length} appointments\n`);

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Clean Phase 6 data (skip if tables don't exist - schema may differ per DB)
  console.log('🧹 Cleaning existing Phase 6 data...');
  for (const fn of [
    () => prisma.brandMention.deleteMany({ where: { userId: user.id } }),
    () => prisma.brandScan.deleteMany({ where: { userId: user.id } }),
    () => prisma.feedbackCollection.deleteMany({ where: { userId: user.id } }),
    () => prisma.review.deleteMany({ where: { userId: user.id } }),
    () => prisma.referral.deleteMany({ where: { userId: user.id } }),
    () => prisma.aiGeneratedReport.deleteMany({ where: { userId: user.id } }),
  ]) {
    try {
      await fn();
    } catch (e: unknown) {
      if ((e as { code?: string })?.code !== 'P2021') throw e;
    }
  }
  console.log('   ✓ Cleaned\n');

  // ─── 1. Referrals (10–15) ──────────────────────────────────────────────────
  console.log('🤝 Creating referrals...');
  const referralStatuses = ['PENDING', 'CONTACTED', 'CONVERTED', 'EXPIRED', 'DECLINED'] as const;
  let refCount = 0;
  for (let i = 0; i < 12; i++) {
    const referrer = leads[i % leads.length];
    const status = randomElement(referralStatuses);
    const convertedLead = status === 'CONVERTED' ? leads[(i + 5) % leads.length] : null;
    if (convertedLead?.id === referrer.id) continue; // avoid self-referral
    await prisma.referral.create({
      data: {
        userId: user.id,
        referrerId: referrer.id,
        referredName: REFERRAL_NAMES[i % REFERRAL_NAMES.length],
        referredEmail: `ref${i}@example.com`,
        referredPhone: `514-${randomInt(200, 999)}-${randomInt(1000, 9999)}`,
        status,
        notes: status === 'CONVERTED' ? 'Referred by satisfied patient. Booked consultation.' : null,
        rewardGiven: status === 'CONVERTED' && Math.random() > 0.5,
        rewardDetails: status === 'CONVERTED' && Math.random() > 0.5 ? '$50 gift card sent' : null,
        convertedLeadId: convertedLead?.id ?? null,
      },
    });
    refCount++;
  }
  console.log(`   ✓ Created ${refCount} referrals\n`);

  // ─── 2. Reviews (15–25) ────────────────────────────────────────────────────
  console.log('⭐ Creating reviews...');
  let reviewCount = 0;
  for (let i = 0; i < 20; i++) {
    const lead = leads[i % leads.length];
    const rating = randomInt(3, 5);
    const sentiment = rating >= 4 ? 'POSITIVE' : rating === 3 ? 'NEUTRAL' : 'NEGATIVE';
    const sentimentScore = rating >= 4 ? 0.7 + Math.random() * 0.3 : rating === 3 ? 0 : -0.5 - Math.random() * 0.3;
    await prisma.review.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        campaignId: null,
        source: randomElement(REVIEW_SOURCES),
        rating,
        reviewText: randomElement(REVIEW_TEXTS),
        reviewUrl: Math.random() > 0.5 ? `https://google.com/reviews/${randomInt(1000, 9999)}` : null,
        reviewerName: lead.contactPerson,
        isPublic: true,
        sentiment,
        sentimentScore: Math.round(sentimentScore * 100) / 100,
        themes: ['friendly staff', 'professional care', 'clean office'],
        aiSummary: `Positive review highlighting ${rating}-star experience.`,
        aiResponseStatus: Math.random() > 0.6 ? 'PUBLISHED' : null,
        ownerResponse: Math.random() > 0.7 ? 'Thank you for your kind words!' : null,
        respondedAt: Math.random() > 0.7 ? randomDate(sixMonthsAgo, now) : null,
        createdAt: randomDate(sixMonthsAgo, now),
      },
    });
    reviewCount++;
  }
  console.log(`   ✓ Created ${reviewCount} reviews\n`);

  // ─── 3. AiGeneratedReport (5–10) ───────────────────────────────────────────
  console.log('📊 Creating AI-generated reports...');
  let reportCount = 0;
  try {
    const reportTypes = ['sales', 'leads', 'revenue', 'overview', 'custom'] as const;
    const periods = ['last_7_days', 'last_month', 'last_quarter', 'last_year'] as const;
    const reportTitles = [
      'Monthly Revenue Summary',
      'Lead Conversion Report',
      'Patient Acquisition Overview',
      'Treatment Pipeline Analysis',
      'Orthodontic Practice Performance',
      'New Patient Trends',
      'Revenue by Treatment Type',
      'Consultation-to-Conversion Report',
    ];
    for (let i = 0; i < 8; i++) {
      const reportType = reportTypes[i % reportTypes.length];
      await prisma.aiGeneratedReport.create({
        data: {
          userId: user.id,
          title: reportTitles[i % reportTitles.length],
          reportType,
          period: randomElement(periods),
          content: {
            summary: `AI-generated ${reportType} report for orthodontic practice.`,
            charts: [
              { type: 'bar', label: 'Monthly Revenue', data: [12000, 14500, 13200, 15800, 14100] },
              { type: 'line', label: 'New Leads', data: [18, 22, 19, 25, 21] },
            ],
            metrics: { totalRevenue: 69600, newLeads: 105, conversionRate: 0.42 },
          },
          createdAt: randomDate(sixMonthsAgo, now),
        },
      });
      reportCount++;
    }
    console.log(`   ✓ Created ${reportCount} AI reports\n`);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2021') {
      console.log('   ⚠️  AiGeneratedReport table missing - skipped\n');
    } else throw e;
  }

  // ─── 4. FeedbackCollection (10–15) ─────────────────────────────────────────
  console.log('📋 Creating feedback collections...');
  let feedbackCount = 0;
  try {
    const methods = ['SMS', 'VOICE', 'BOTH'] as const;
    const statuses = ['PENDING', 'COMPLETED', 'FAILED'] as const;
    const sentiments = ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const;
    for (let i = 0; i < 12; i++) {
      const lead = leads[i % leads.length];
      const appt = appointments[i % appointments.length];
      const status = randomElement(statuses);
      const sentiment = status === 'COMPLETED' ? randomElement(sentiments) : null;
      const rating = status === 'COMPLETED' && sentiment ? randomInt(1, 5) : null;
      await prisma.feedbackCollection.create({
        data: {
          userId: user.id,
          leadId: lead.id,
          appointmentId: appt?.id ?? null,
          method: randomElement(methods),
          status,
          sentiment,
          rating,
          feedbackText: status === 'COMPLETED' ? 'Great experience, would recommend!' : null,
          triggeredAt: randomDate(sixMonthsAgo, now),
          completedAt: status === 'COMPLETED' ? randomDate(sixMonthsAgo, now) : null,
          metadata: { channel: 'sms', templateId: 'post-appointment-feedback' },
        },
      });
      feedbackCount++;
    }
    console.log(`   ✓ Created ${feedbackCount} feedback collections\n`);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2021') {
      console.log('   ⚠️  FeedbackCollection table missing - skipped\n');
    } else throw e;
  }

  // ─── 5. BrandScan (1–2) + BrandMention (5–10) ───────────────────────────────
  console.log('🔍 Creating brand scans and mentions...');
  let mentionCount = 0;
  try {
    const scan = await prisma.brandScan.create({
      data: {
        userId: user.id,
        status: 'COMPLETED',
        businessName: 'Montreal Orthodontics',
        location: 'Montreal, QC',
        sources: ['GOOGLE', 'YELP', 'FACEBOOK', 'TRUSTPILOT'],
        reviewsFound: 20,
        mentionsFound: 8,
        startedAt: randomDate(sixMonthsAgo, now),
        completedAt: randomDate(sixMonthsAgo, now),
      },
    });

  const mentionSnippets = [
    'Montreal Orthodontics offers excellent Invisalign treatment. Highly recommend!',
    'Best orthodontist in Montreal. Dr. Tremblay and team are fantastic.',
    'Had braces here - professional care and great results.',
    'Clean office, friendly staff. My kids love coming for adjustments.',
    'Referred by a friend. Very happy with the consultation and treatment plan.',
  ];
  for (let i = 0; i < 8; i++) {
    const sentiment = randomElement(['POSITIVE', 'POSITIVE', 'NEUTRAL']);
    const sentimentScore = sentiment === 'POSITIVE' ? 0.6 + Math.random() * 0.4 : sentiment === 'NEUTRAL' ? 0 : -0.3;
    await prisma.brandMention.create({
      data: {
        userId: user.id,
        scanId: scan.id,
        source: randomElement(BRAND_MENTION_SOURCES),
        sourceUrl: `https://${randomElement(['google', 'yelp', 'facebook'])}.com/review/${randomInt(1000, 9999)}`,
        title: `Review of Montreal Orthodontics`,
        snippet: randomElement(mentionSnippets),
        fullText: randomElement(mentionSnippets) + ' Full review text would appear here.',
        authorName: REFERRAL_NAMES[i % REFERRAL_NAMES.length],
        rating: randomInt(4, 5),
        sentiment,
        sentimentScore: Math.round(sentimentScore * 100) / 100,
        themes: ['orthodontics', 'Invisalign', 'braces', 'Montreal'],
        aiSummary: 'Positive mention of orthodontic services.',
        publishedAt: randomDate(sixMonthsAgo, now),
      },
    });
    mentionCount++;
  }
  console.log(`   ✓ Created 1 brand scan, ${mentionCount} brand mentions\n`);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2021') {
      console.log('   ⚠️  BrandScan/BrandMention tables missing - skipped\n');
    } else throw e;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 6 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Referrals: ${refCount}`);
  console.log(`   • Reviews: ${reviewCount}`);
  console.log(`   • AI Reports: ${reportCount}`);
  console.log(`   • Feedback: ${feedbackCount}`);
  console.log(`   • Brand scan: 1, Mentions: ${mentionCount}`);
  console.log('\n🎉 Run Phase 7 next for drip campaigns and scheduled messages.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
