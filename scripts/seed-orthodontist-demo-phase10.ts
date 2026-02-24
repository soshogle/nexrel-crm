/**
 * Orthodontist Demo - Phase 10: Call Logs & Voice
 * Creates: CallLog (15-25), OutboundCall (5-10), VoiceAgent (1-2), VoiceUsage, PurchasedPhoneNumber
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

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 10: Call Logs & Voice\n');
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

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 10 data
  console.log('🧹 Cleaning existing Phase 10 data...');
  await prisma.voiceUsage.deleteMany({ where: { userId: user.id } });
  await prisma.outboundCall.deleteMany({ where: { userId: user.id } });
  await prisma.callLog.deleteMany({ where: { userId: user.id } });
  await prisma.voiceAgent.deleteMany({ where: { userId: user.id } });
  await prisma.purchasedPhoneNumber.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. VoiceAgent (1-2) + PurchasedPhoneNumber ─────────────────────────────
  console.log('📞 Creating voice agents and phone numbers...');
  const phone = await prisma.purchasedPhoneNumber.create({
    data: {
      userId: user.id,
      phoneNumber: '+15145551234',
      friendlyName: 'Montreal Orthodontics Main',
      country: 'CA',
      twilioSid: `PN${Date.now()}${randomInt(100, 999)}`,
      status: 'active',
    },
  });
  const voiceAgent = await prisma.voiceAgent.create({
    data: {
      userId: user.id,
      name: 'Montreal Orthodontics Reception',
      description: 'Handles incoming calls for appointment scheduling',
      type: 'INBOUND',
      status: 'ACTIVE',
      twilioPhoneNumber: phone.phoneNumber,
      businessName: 'Montreal Orthodontics',
      businessIndustry: 'Orthodontics',
      greetingMessage: 'Thank you for calling Montreal Orthodontics. How may I help you?',
    },
  });
  console.log('   ✓ Created 1 voice agent, 1 phone number\n');

  // ─── 2. CallLog (15-25) + VoiceUsage ───────────────────────────────────────
  console.log('📋 Creating call logs...');
  let callCount = 0;
  for (let i = 0; i < 20; i++) {
    const lead = leads[i % leads.length];
    const direction = randomElement(['INBOUND', 'OUTBOUND'] as const);
    const status = randomElement(['COMPLETED', 'COMPLETED', 'NO_ANSWER', 'FAILED'] as const);
    const duration = status === 'COMPLETED' ? randomInt(60, 480) : null;
    const callLog = await prisma.callLog.create({
      data: {
        userId: user.id,
        voiceAgentId: voiceAgent.id,
        leadId: lead.id,
        direction,
        status,
        outcome: status === 'COMPLETED' ? randomElement(['APPOINTMENT_BOOKED', 'INFORMATION_PROVIDED', 'VOICEMAIL'] as const) : null,
        fromNumber: direction === 'INBOUND' ? lead.phone || '+15145550000' : '5145551234',
        toNumber: direction === 'INBOUND' ? '5145551234' : lead.phone || '+15145550000',
        duration,
        transcription: status === 'COMPLETED' ? 'Patient: Hi, I need to book an appointment. Agent: I can help with that. When would you like to come in?' : null,
        sentiment: status === 'COMPLETED' ? 'POSITIVE' : null,
        callOutcome: status === 'COMPLETED' ? 'APPOINTMENT_BOOKED' : null,
        endedAt: randomDate(threeMonthsAgo, now),
      },
    });
    callCount++;
    if (status === 'COMPLETED' && duration) {
      await prisma.voiceUsage.create({
        data: {
          userId: user.id,
          voiceAgentId: voiceAgent.id,
          callLogId: callLog.id,
          durationSeconds: duration,
          costUSD: (duration / 60) * 0.15,
          minutesUsed: duration / 60,
          billingStatus: 'PENDING',
        },
      });
    }
  }
  console.log(`   ✓ Created ${callCount} call logs\n`);

  // ─── 3. OutboundCall (5-10) ─────────────────────────────────────────────────
  console.log('📤 Creating outbound calls...');
  let outboundCount = 0;
  for (let i = 0; i < 8; i++) {
    const lead = leads[(i + 10) % leads.length];
    const status = randomElement(['COMPLETED', 'COMPLETED', 'NO_ANSWER', 'SCHEDULED'] as const);
    await prisma.outboundCall.create({
      data: {
        userId: user.id,
        voiceAgentId: voiceAgent.id,
        leadId: lead.id,
        name: lead.contactPerson || lead.businessName,
        phoneNumber: lead.phone || '514-555-0000',
        status,
        scheduledFor: randomDate(threeMonthsAgo, now),
        attemptCount: status === 'COMPLETED' ? 1 : randomInt(1, 2),
        purpose: 'Appointment reminder',
        lastAttemptAt: status !== 'SCHEDULED' ? randomDate(threeMonthsAgo, now) : null,
        completedAt: status === 'COMPLETED' ? randomDate(threeMonthsAgo, now) : null,
      },
    });
    outboundCount++;
  }
  console.log(`   ✓ Created ${outboundCount} outbound calls\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 10 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Voice agent: 1, Phone number: 1`);
  console.log(`   • Call logs: ${callCount}, Outbound calls: ${outboundCount}`);
  console.log('\n🎉 Run Phase 11 next for DocPen sessions.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
