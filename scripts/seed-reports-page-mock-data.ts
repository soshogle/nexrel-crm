/**
 * Seed mock AiGeneratedReport data for the Reports page.
 * Target: orthodontist@nexrel.com only.
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

const REPORTS = [
  {
    title: 'Monthly Revenue Summary',
    reportType: 'revenue',
    period: 'last_month',
    content: {
      summary:
        'Your practice generated $72,400 in revenue last month, up 8% from the prior month. Invisalign and traditional braces contributed equally. New patient consultations increased by 12%.',
      metrics: {
        total_revenue: 72400,
        new_leads: 28,
        conversion_rate: 0.44,
        total_deals: 156,
        open_deals: 42,
        total_campaigns: 8,
      },
      charts: [
        {
          title: 'Revenue by Treatment Type',
          data: [
            { name: 'Invisalign', value: 31200 },
            { name: 'Traditional Braces', value: 28900 },
            { name: 'Retainers', value: 8300 },
            { name: 'Consultations', value: 4000 },
          ],
        },
        {
          title: 'Monthly Revenue (CAD)',
          data: [
            { name: 'Oct', value: 65800 },
            { name: 'Nov', value: 69100 },
            { name: 'Dec', value: 72400 },
          ],
        },
      ],
    },
  },
  {
    title: 'Lead Conversion Report',
    reportType: 'leads',
    period: 'last_quarter',
    content: {
      summary:
        'Q4 saw 94 new leads with a 42% consultation-to-treatment conversion rate. Top sources: Google (38%), referrals (31%), and website forms (21%). Average time from lead to first appointment: 4.2 days.',
      metrics: {
        total_leads: 94,
        new_leads: 94,
        conversion_rate: 0.42,
        total_deals: 39,
        open_deals: 12,
      },
      charts: [
        {
          title: 'Leads by Source',
          data: [
            { name: 'Google', value: 36 },
            { name: 'Referrals', value: 29 },
            { name: 'Website', value: 20 },
            { name: 'Facebook', value: 6 },
            { name: 'Other', value: 3 },
          ],
        },
        {
          title: 'Weekly New Leads',
          data: [
            { name: 'Week 1', value: 18 },
            { name: 'Week 2', value: 22 },
            { name: 'Week 3', value: 24 },
            { name: 'Week 4', value: 30 },
          ],
        },
      ],
    },
  },
  {
    title: 'Practice Performance Overview',
    reportType: 'overview',
    period: 'last_month',
    content: {
      summary:
        'Montreal Orthodontics performed well in December. Patient satisfaction scores averaged 4.7/5. Appointment no-show rate dropped to 5%. Three new referral campaigns launched.',
      metrics: {
        total_leads: 312,
        total_deals: 156,
        open_deals: 42,
        total_revenue: 72400,
        total_campaigns: 8,
      },
      charts: [
        {
          title: 'Deals by Stage',
          data: [
            { name: 'Consultation', value: 28 },
            { name: 'Treatment Plan', value: 14 },
            { name: 'Active Treatment', value: 85 },
            { name: 'Retainer Phase', value: 29 },
          ],
        },
      ],
    },
  },
  {
    title: 'Treatment Pipeline Analysis',
    reportType: 'sales',
    period: 'last_quarter',
    content: {
      summary:
        'Pipeline value increased 15% this quarter. Invisalign leads are converting faster than braces. Average deal size: $4,200 CAD.',
      metrics: {
        total_deals: 156,
        open_deals: 42,
        total_revenue: 186000,
        conversion_rate: 0.44,
      },
      charts: [
        {
          title: 'Revenue by Month (CAD)',
          data: [
            { name: 'Oct', value: 65800 },
            { name: 'Nov', value: 69100 },
            { name: 'Dec', value: 72400 },
          ],
        },
      ],
    },
  },
  {
    title: 'New Patient Trends',
    reportType: 'leads',
    period: 'last_7_days',
    content: {
      summary:
        'Last 7 days: 8 new leads, 4 consultations booked. Referral rate remains strong. Two leads came from the new website contact form.',
      metrics: {
        total_leads: 8,
        new_leads: 8,
        conversion_rate: 0.5,
        total_deals: 4,
      },
      charts: [
        {
          title: 'Leads by Day',
          data: [
            { name: 'Mon', value: 1 },
            { name: 'Tue', value: 2 },
            { name: 'Wed', value: 1 },
            { name: 'Thu', value: 2 },
            { name: 'Fri', value: 2 },
          ],
        },
      ],
    },
  },
  {
    title: 'Voice Agent Usage',
    reportType: 'overview',
    period: 'last_month',
    content: {
      summary:
        'Your AI voice agents handled 127 calls this month. Appointment scheduling and FAQ agents were most used. Call completion rate: 89%.',
      metrics: {
        total_leads: 28,
        total_campaigns: 8,
        total_revenue: 72400,
      },
      agentStats: [
        { name: 'Appointment Scheduler', totalCalls: 67, campaigns: 3, aiEmployees: 2 },
        { name: 'FAQ Bot', totalCalls: 42, campaigns: 2, aiEmployees: 1 },
        { name: 'Consultation Qualifier', totalCalls: 18, campaigns: 1, aiEmployees: 1 },
      ],
      charts: [
        {
          title: 'Calls by Agent',
          data: [
            { name: 'Appointment Scheduler', value: 67 },
            { name: 'FAQ Bot', value: 42 },
            { name: 'Consultation Qualifier', value: 18 },
          ],
        },
      ],
    },
  },
  {
    title: 'Consultation-to-Conversion Report',
    reportType: 'custom',
    period: 'last_month',
    content: {
      summary:
        '28 consultations in December, 12 converted to treatment. Average conversion time: 3.2 days. Top converting source: referrals (58%).',
      metrics: {
        total_leads: 28,
        conversion_rate: 0.43,
        total_deals: 12,
        total_revenue: 50400,
      },
      charts: [
        {
          title: 'Conversion by Source',
          data: [
            { name: 'Referrals', value: 7 },
            { name: 'Google', value: 3 },
            { name: 'Website', value: 2 },
          ],
        },
      ],
    },
  },
];

async function main() {
  console.log('🌱 Seeding Reports page mock data for orthodontist@nexrel.com\n');

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  // Clean existing reports for this user
  console.log('🧹 Cleaning existing reports...');
  try {
    await prisma.aiGeneratedReport.deleteMany({ where: { userId: user.id } });
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'P2021') {
      console.log('   ⚠️  AiGeneratedReport table missing - exiting');
      process.exit(1);
    }
    throw e;
  }
  console.log('   ✓ Cleaned\n');

  // Create reports
  console.log('📊 Creating AI-generated reports...');
  let count = 0;
  for (let i = 0; i < REPORTS.length; i++) {
    const r = REPORTS[i];
    await prisma.aiGeneratedReport.create({
      data: {
        userId: user.id,
        title: r.title,
        reportType: r.reportType,
        period: r.period,
        content: r.content as any,
        createdAt: randomDate(sixMonthsAgo, now),
      },
    });
    count++;
  }
  console.log(`   ✓ Created ${count} reports\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Reports page mock data complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • User: ${USER_EMAIL}`);
  console.log(`   • Reports: ${count}`);
  console.log('\n🎉 Log in as orthodontist@nexrel.com and visit /dashboard/reports');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
