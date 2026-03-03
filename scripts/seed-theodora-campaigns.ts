/**
 * Seed Theodora's automated campaigns:
 *
 * 1. Secret Property Welcome (Email Drip) — WEBSITE_SECRET_REPORT_LEAD
 *    4-step nurture: welcome → exclusive preview → schedule showing → market update
 *
 * 2. Secret Property SMS Follow-up (SMS Drip) — WEBSITE_SECRET_REPORT_LEAD
 *    3-step: confirmation → new listings alert → schedule CTA
 *
 * 3. Website Inquiry Nurture (Email Drip) — WEBSITE_CONTACT_FORM_LEAD
 *    3-step: thank you → featured listings → call to action
 *
 * Run: npx tsx scripts/seed-theodora-campaigns.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';
const BROKER_NAME = 'Theodora Stavropoulos';
const FROM_EMAIL = 'theodora@nexrel.soshogle.com';

function emailWrap(body: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${preheader ? `<span style="display:none!important;font-size:1px;color:#fff;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${preheader}</span>` : ''}
</head><body style="margin:0;padding:0;font-family:'Helvetica Neue',Arial,sans-serif;background:#f4f4f7;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);">
<tr><td style="background:linear-gradient(135deg,#1a365d 0%,#2d5aa0 100%);padding:28px 36px;border-radius:8px 8px 0 0;">
<h1 style="margin:0;color:#fff;font-size:22px;font-weight:600;">${BROKER_NAME}</h1>
<p style="margin:4px 0 0;color:rgba(255,255,255,.8);font-size:13px;">RE/MAX 3000 Inc. | Montréal Real Estate</p>
</td></tr>
<tr><td style="padding:32px 36px;">
${body}
</td></tr>
<tr><td style="padding:20px 36px;background:#f9fafb;border-radius:0 0 8px 8px;border-top:1px solid #e5e7eb;">
<p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
${BROKER_NAME} | RE/MAX 3000 Inc.<br>
9280 boul. L'Acadie, Montréal, QC H4N 3C5<br>
514 333-3000 | <a href="mailto:Theodora.stavropoulos@remax-quebec.com" style="color:#2d5aa0;">Theodora.stavropoulos@remax-quebec.com</a>
</p>
</td></tr>
</table></td></tr></table></body></html>`;
}

async function main() {
  console.log('🌱 Seeding campaigns for Theodora\n');

  const user = await prisma.user.findUnique({ where: { email: THEODORA_EMAIL } });
  if (!user) {
    console.error('❌ Theodora user not found');
    return;
  }

  // ─── 1. Secret Property Welcome Email Drip ───
  console.log('📧 Creating: Secret Property Welcome Email Drip...');

  const existingSecretEmail = await prisma.emailDripCampaign.findFirst({
    where: { userId: user.id, name: 'Secret Property Welcome' },
  });

  if (existingSecretEmail) {
    console.log('   ⏩ Already exists, skipping');
  } else {
    const secretEmailCampaign = await prisma.emailDripCampaign.create({
      data: {
        userId: user.id,
        name: 'Secret Property Welcome',
        description:
          'Automated nurture sequence for buyers who unlock exclusive property reports or register for secret properties.',
        status: 'ACTIVE',
        triggerType: 'WEBSITE_SECRET_REPORT_LEAD',
        fromName: BROKER_NAME,
        fromEmail: FROM_EMAIL,
        replyTo: 'Theodora.stavropoulos@remax-quebec.com',
        tags: 'secret-property,buyer,nurture',
      },
    });

    const sequences = [
      {
        sequenceOrder: 1,
        name: 'Welcome & Report Delivery',
        subject: '{{firstName}}, your exclusive property report is ready',
        delayDays: 0,
        delayHours: 0,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Welcome to Our Exclusive Network</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">Thank you for your interest in our exclusive property collection. You now have access to properties that aren't listed on public MLS — these are opportunities available only to our registered buyers.</p>
<p style="color:#374151;line-height:1.7;">As a registered member, you'll receive:</p>
<ul style="color:#374151;line-height:2;">
  <li><strong>Early access</strong> to new exclusive listings before they hit the market</li>
  <li><strong>Market insights</strong> specific to your preferred neighborhoods</li>
  <li><strong>Priority booking</strong> for private showings</li>
</ul>
<p style="color:#374151;line-height:1.7;">I'd love to learn more about what you're looking for so I can match you with the perfect property.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="https://theodora-stavropoulos-remax.vercel.app/secret-properties" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Browse Exclusive Listings</a>
</p>
<p style="color:#374151;line-height:1.7;">Best regards,<br><strong>${BROKER_NAME}</strong></p>`,
          'Your exclusive property access is confirmed'
        ),
        textContent: `Hi {{firstName}},\n\nThank you for your interest in our exclusive property collection. You now have access to properties that aren't listed on public MLS.\n\nAs a registered member, you'll receive:\n- Early access to new exclusive listings\n- Market insights for your preferred neighborhoods\n- Priority booking for private showings\n\nBrowse exclusive listings: https://theodora-stavropoulos-remax.vercel.app/secret-properties\n\nBest regards,\n${BROKER_NAME}`,
      },
      {
        sequenceOrder: 2,
        name: 'Exclusive Preview',
        subject: '{{firstName}}, new exclusive properties just added',
        delayDays: 3,
        delayHours: 0,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">New Exclusive Properties Available</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">I wanted to personally let you know that we've recently added new properties to our exclusive portfolio. These listings are only available to our registered network of serious buyers like yourself.</p>
<div style="background:#f0f4ff;border-left:4px solid #2d5aa0;padding:16px 20px;margin:20px 0;border-radius:0 6px 6px 0;">
  <p style="margin:0;color:#1a365d;font-weight:600;">Why these properties aren't on the public market:</p>
  <p style="margin:8px 0 0;color:#374151;">Sellers of prestige properties often prefer discretion. By working exclusively with our network, they ensure only qualified, serious buyers view their homes.</p>
</div>
<p style="color:#374151;line-height:1.7;">Would you like to schedule a private preview? I can arrange viewings at your convenience.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="https://theodora-stavropoulos-remax.vercel.app/secret-properties" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View New Listings</a>
</p>
<p style="color:#374151;line-height:1.7;">Warm regards,<br><strong>${BROKER_NAME}</strong></p>`,
          'Exclusive properties just added to our portfolio'
        ),
        textContent: `Hi {{firstName}},\n\nWe've recently added new properties to our exclusive portfolio. These listings are only available to our registered buyer network.\n\nWould you like to schedule a private preview? I can arrange viewings at your convenience.\n\nView new listings: https://theodora-stavropoulos-remax.vercel.app/secret-properties\n\nWarm regards,\n${BROKER_NAME}`,
      },
      {
        sequenceOrder: 3,
        name: 'Schedule a Showing',
        subject: "{{firstName}}, let's find your dream home",
        delayDays: 7,
        delayHours: 0,
        skipIfEngaged: true,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Ready to See Properties in Person?</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">I know finding the right home is a significant decision, and sometimes photos don't tell the whole story. That's why I'd love to offer you a <strong>personalized property tour</strong> based on your preferences.</p>
<p style="color:#374151;line-height:1.7;">Here's how it works:</p>
<ol style="color:#374151;line-height:2;">
  <li>Tell me your must-haves (budget, bedrooms, neighborhoods)</li>
  <li>I'll curate a shortlist of matching exclusive properties</li>
  <li>We'll schedule private viewings at times that work for you</li>
</ol>
<p style="color:#374151;line-height:1.7;">No obligation — just a chance to explore what's available before these properties go public.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="mailto:Theodora.stavropoulos@remax-quebec.com?subject=Private%20Showing%20Request" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Request a Private Showing</a>
</p>
<p style="color:#374151;line-height:1.7;">Looking forward to hearing from you,<br><strong>${BROKER_NAME}</strong></p>`,
          'Schedule a private property tour — no obligation'
        ),
        textContent: `Hi {{firstName}},\n\nI'd love to offer you a personalized property tour based on your preferences.\n\n1. Tell me your must-haves\n2. I'll curate a shortlist of matching exclusive properties\n3. We'll schedule private viewings at your convenience\n\nNo obligation — just exploring what's available.\n\nReply to this email or contact me at Theodora.stavropoulos@remax-quebec.com\n\n${BROKER_NAME}`,
      },
      {
        sequenceOrder: 4,
        name: 'Market Update & Re-engagement',
        subject: '{{firstName}}, your Montréal market update',
        delayDays: 14,
        delayHours: 0,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Your Montréal Market Update</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">Here's what's happening in the Montréal real estate market that could impact your property search:</p>
<div style="background:#f9fafb;padding:20px;border-radius:8px;margin:20px 0;">
  <h3 style="margin:0 0 12px;color:#1a365d;font-size:16px;">Key Market Trends</h3>
  <ul style="color:#374151;line-height:2;margin:0;padding-left:20px;">
    <li>New listings are moving quickly — average days on market is decreasing</li>
    <li>Exclusive/off-market properties often sell 15-20% faster</li>
    <li>Pre-approved buyers get priority access to the best deals</li>
  </ul>
</div>
<p style="color:#374151;line-height:1.7;">As a member of our exclusive buyer network, you're always first in line. Don't miss out on properties that match your criteria.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="https://theodora-stavropoulos-remax.vercel.app/secret-properties" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">See Latest Exclusive Listings</a>
</p>
<p style="color:#374151;line-height:1.7;">Always here to help,<br><strong>${BROKER_NAME}</strong></p>`,
          "What's happening in Montréal real estate right now"
        ),
        textContent: `Hi {{firstName}},\n\nHere's your Montréal market update:\n\n- New listings are moving quickly\n- Exclusive/off-market properties sell 15-20% faster\n- Pre-approved buyers get priority access\n\nAs a member of our exclusive buyer network, you're always first in line.\n\nSee latest exclusive listings: https://theodora-stavropoulos-remax.vercel.app/secret-properties\n\n${BROKER_NAME}`,
      },
    ];

    for (const seq of sequences) {
      await prisma.emailDripSequence.create({
        data: {
          campaignId: secretEmailCampaign.id,
          ...seq,
        },
      });
    }

    console.log(`   ✅ Created with ${sequences.length} sequences`);
  }

  // ─── 2. Secret Property SMS Follow-up ───
  console.log('📱 Creating: Secret Property SMS Drip...');

  const existingSecretSms = await prisma.smsCampaign.findFirst({
    where: { userId: user.id, name: 'Secret Property SMS Follow-up' },
  });

  if (existingSecretSms) {
    console.log('   ⏩ Already exists, skipping');
  } else {
    const smsCampaign = await prisma.smsCampaign.create({
      data: {
        userId: user.id,
        name: 'Secret Property SMS Follow-up',
        message: 'Secret property buyer SMS drip',
        status: 'ACTIVE',
        isSequence: true,
        triggerType: 'WEBSITE_SECRET_REPORT_LEAD',
        dailyLimit: 50,
        tags: 'secret-property,buyer,sms',
      },
    });

    const smsSequences = [
      {
        sequenceOrder: 1,
        name: 'Welcome Confirmation',
        message:
          'Hi {{firstName}}, this is Theodora from RE/MAX 3000. Thank you for your interest in our exclusive properties! Check your email for your full report. Reply YES if you\'d like to schedule a private showing.',
        delayDays: 0,
        delayHours: 0,
      },
      {
        sequenceOrder: 2,
        name: 'New Listings Alert',
        message:
          '{{firstName}}, new exclusive listings just added to our portfolio in Montréal. These won\'t last — reply SHOW to book a private viewing with Theodora.',
        delayDays: 3,
        delayHours: 0,
        skipIfReplied: true,
      },
      {
        sequenceOrder: 3,
        name: 'Schedule CTA',
        message:
          '{{firstName}}, still looking for your dream property? I have exclusive listings matching your criteria. Call or text me at 514-333-3000 — Theodora',
        delayDays: 7,
        delayHours: 0,
        skipIfReplied: true,
      },
    ];

    for (const seq of smsSequences) {
      await prisma.smsSequence.create({
        data: {
          campaignId: smsCampaign.id,
          ...seq,
        },
      });
    }

    console.log(`   ✅ Created with ${smsSequences.length} sequences`);
  }

  // ─── 3. Website Inquiry Nurture Email Drip ───
  console.log('📧 Creating: Website Inquiry Nurture Email Drip...');

  const existingInquiry = await prisma.emailDripCampaign.findFirst({
    where: { userId: user.id, name: 'Website Inquiry Nurture' },
  });

  if (existingInquiry) {
    console.log('   ⏩ Already exists, skipping');
  } else {
    const inquiryCampaign = await prisma.emailDripCampaign.create({
      data: {
        userId: user.id,
        name: 'Website Inquiry Nurture',
        description:
          'Follow-up sequence for visitors who submit the website contact form.',
        status: 'ACTIVE',
        triggerType: 'WEBSITE_CONTACT_FORM_LEAD',
        fromName: BROKER_NAME,
        fromEmail: FROM_EMAIL,
        replyTo: 'Theodora.stavropoulos@remax-quebec.com',
        tags: 'website-inquiry,nurture',
      },
    });

    const inquirySequences = [
      {
        sequenceOrder: 1,
        name: 'Thank You & Introduction',
        subject: '{{firstName}}, thank you for reaching out!',
        delayDays: 0,
        delayHours: 1,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Thank You for Getting in Touch</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">Thank you for contacting me through my website. I've received your message and will get back to you shortly with a personalized response.</p>
<p style="color:#374151;line-height:1.7;">In the meantime, here's a bit about what I offer:</p>
<ul style="color:#374151;line-height:2;">
  <li>Over 15 years of experience in Montréal real estate</li>
  <li>Access to exclusive, off-market properties</li>
  <li>Comprehensive market analysis and pricing strategies</li>
  <li>Bilingual service (English, French, Greek)</li>
</ul>
<p style="color:#374151;line-height:1.7;">If your inquiry is urgent, don't hesitate to call me directly at <strong>514 333-3000</strong>.</p>
<p style="color:#374151;line-height:1.7;">Warm regards,<br><strong>${BROKER_NAME}</strong></p>`,
          'Thank you for your inquiry — I\'ll be in touch soon'
        ),
        textContent: `Hi {{firstName}},\n\nThank you for contacting me. I've received your message and will get back to you shortly.\n\nIf it's urgent, call me at 514 333-3000.\n\n${BROKER_NAME}`,
      },
      {
        sequenceOrder: 2,
        name: 'Featured Listings & Market Insight',
        subject: '{{firstName}}, check out these featured properties',
        delayDays: 3,
        delayHours: 0,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Featured Properties You Might Love</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">I wanted to share some of our featured listings with you. Whether you're buying, selling, or just exploring, these properties showcase the best of what Montréal has to offer.</p>
<p style="text-align:center;margin:28px 0;">
  <a href="https://theodora-stavropoulos-remax.vercel.app/listings" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Browse All Listings</a>
</p>
<div style="background:#f0f4ff;border-left:4px solid #2d5aa0;padding:16px 20px;margin:20px 0;border-radius:0 6px 6px 0;">
  <p style="margin:0;color:#1a365d;font-weight:600;">Did you know?</p>
  <p style="margin:8px 0 0;color:#374151;">I also have access to exclusive, off-market properties that aren't listed publicly. Ask me about our <strong>Secret Properties</strong> collection for serious buyers.</p>
</div>
<p style="color:#374151;line-height:1.7;">Looking forward to helping you,<br><strong>${BROKER_NAME}</strong></p>`,
          'Featured Montréal properties you might love'
        ),
        textContent: `Hi {{firstName}},\n\nHere are some featured listings for you.\n\nBrowse all: https://theodora-stavropoulos-remax.vercel.app/listings\n\nI also have access to exclusive off-market properties. Ask me about our Secret Properties collection.\n\n${BROKER_NAME}`,
      },
      {
        sequenceOrder: 3,
        name: 'Call to Action & Secret Properties Invite',
        subject: '{{firstName}}, get exclusive access to off-market properties',
        delayDays: 7,
        delayHours: 0,
        skipIfEngaged: true,
        htmlContent: emailWrap(
          `<h2 style="margin:0 0 16px;color:#1a365d;font-size:20px;">Exclusive Access Awaits</h2>
<p style="color:#374151;line-height:1.7;">Hi {{firstName}},</p>
<p style="color:#374151;line-height:1.7;">I wanted to extend a special invitation: access to our <strong>Secret Properties</strong> collection — exclusive listings that never appear on the public MLS.</p>
<p style="color:#374151;line-height:1.7;">These are premium properties from sellers who value privacy and discretion. As a registered buyer in our network, you'll get:</p>
<ul style="color:#374151;line-height:2;">
  <li>First look at new exclusive listings</li>
  <li>Detailed property reports and market analysis</li>
  <li>Priority scheduling for private viewings</li>
  <li>Direct communication with me for any questions</li>
</ul>
<p style="text-align:center;margin:28px 0;">
  <a href="https://theodora-stavropoulos-remax.vercel.app/secret-properties" style="background:#2d5aa0;color:#fff;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Explore Secret Properties</a>
</p>
<p style="color:#374151;line-height:1.7;">Don't miss out — exclusive listings move fast.<br><strong>${BROKER_NAME}</strong></p>`,
          'Your exclusive invitation to off-market properties'
        ),
        textContent: `Hi {{firstName}},\n\nI'd like to invite you to our Secret Properties collection — exclusive listings not on public MLS.\n\nYou'll get:\n- First look at new exclusive listings\n- Detailed property reports\n- Priority private viewings\n\nExplore: https://theodora-stavropoulos-remax.vercel.app/secret-properties\n\n${BROKER_NAME}`,
      },
    ];

    for (const seq of inquirySequences) {
      await prisma.emailDripSequence.create({
        data: {
          campaignId: inquiryCampaign.id,
          ...seq,
        },
      });
    }

    console.log(`   ✅ Created with ${inquirySequences.length} sequences`);
  }

  // ─── 4. Website Inquiry SMS Follow-up ───
  console.log('📱 Creating: Website Inquiry SMS Drip...');

  const existingInquirySms = await prisma.smsCampaign.findFirst({
    where: { userId: user.id, name: 'Website Inquiry SMS Follow-up' },
  });

  if (existingInquirySms) {
    console.log('   ⏩ Already exists, skipping');
  } else {
    const inquirySmsCampaign = await prisma.smsCampaign.create({
      data: {
        userId: user.id,
        name: 'Website Inquiry SMS Follow-up',
        message: 'Website inquiry SMS drip',
        status: 'ACTIVE',
        isSequence: true,
        triggerType: 'WEBSITE_CONTACT_FORM_LEAD',
        dailyLimit: 50,
        tags: 'website-inquiry,sms',
      },
    });

    const inquirySmsSequences = [
      {
        sequenceOrder: 1,
        name: 'Quick Acknowledgment',
        message:
          'Hi {{firstName}}, this is Theodora from RE/MAX 3000. I received your message and will follow up shortly. If urgent, call me at 514-333-3000.',
        delayDays: 0,
        delayHours: 0,
      },
      {
        sequenceOrder: 2,
        name: 'Follow Up',
        message:
          '{{firstName}}, just following up on your inquiry. I\'d love to help! Reply or call 514-333-3000 to chat. — Theodora',
        delayDays: 2,
        delayHours: 0,
        skipIfReplied: true,
      },
    ];

    for (const seq of inquirySmsSequences) {
      await prisma.smsSequence.create({
        data: {
          campaignId: inquirySmsCampaign.id,
          ...seq,
        },
      });
    }

    console.log(`   ✅ Created with ${inquirySmsSequences.length} sequences`);
  }

  console.log('\n✅ All campaigns seeded successfully!');
  console.log('\nCampaign Summary:');
  console.log('  📧 Secret Property Welcome (4-step email drip)');
  console.log('  📱 Secret Property SMS Follow-up (3-step SMS drip)');
  console.log('  📧 Website Inquiry Nurture (3-step email drip)');
  console.log('  📱 Website Inquiry SMS Follow-up (2-step SMS drip)');
  console.log('\nTriggers:');
  console.log('  WEBSITE_SECRET_REPORT_LEAD → Secret Property Welcome + SMS');
  console.log('  WEBSITE_CONTACT_FORM_LEAD  → Inquiry Nurture + SMS');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
