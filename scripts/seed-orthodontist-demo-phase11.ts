/**
 * Orthodontist Demo - Phase 11: DocPen (10 Completed Sessions)
 * Creates: DocpenSession (10) with status SIGNED, transcriptionComplete, soapNoteGenerated,
 *          DocpenTranscription, DocpenSOAPNote, DocpenSessionAuditLog
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

const CHIEF_COMPLAINTS = [
  'Bite alignment consultation',
  'Braces adjustment follow-up',
  'Invisalign progress check',
  'Retainer fitting',
  'Initial orthodontic evaluation',
  'Broken bracket assessment',
];

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 11: DocPen Sessions\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  if (leads.length < 10) {
    console.error('❌ Not enough leads. Run Phases 1-2 first.');
    process.exit(1);
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 11 data
  console.log('🧹 Cleaning existing Phase 11 data...');
  const sessions = await prisma.docpenSession.findMany({ where: { userId: user.id }, select: { id: true } });
  for (const s of sessions) {
    await prisma.docpenSessionAuditLog.deleteMany({ where: { sessionId: s.id } });
    await prisma.docpenTranscription.deleteMany({ where: { sessionId: s.id } });
    await prisma.docpenSOAPNote.deleteMany({ where: { sessionId: s.id } });
  }
  await prisma.docpenSession.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. DocpenSession (10) + Transcription + SOAP + AuditLog ──────────────────
  console.log('📝 Creating DocPen sessions...');
  let sessionCount = 0;
  for (let i = 0; i < 10; i++) {
    const lead = leads[i % leads.length];
    const sessionDate = randomDate(threeMonthsAgo, now);
    const duration = randomInt(300, 900);
    const session = await prisma.docpenSession.create({
      data: {
        userId: user.id,
        leadId: lead.id,
        patientName: lead.contactPerson || lead.businessName,
        profession: 'ORTHODONTIC',
        status: 'SIGNED',
        sessionDate,
        sessionDuration: duration,
        chiefComplaint: randomElement(CHIEF_COMPLAINTS),
        consultantName: 'Dr. Tremblay',
        transcriptionComplete: true,
        soapNoteGenerated: true,
        reviewedAt: sessionDate,
        signedAt: sessionDate,
        signedBy: 'Dr. Tremblay',
        signatureHash: `hash_${Date.now()}_${i}`,
      },
    });
    sessionCount++;

    await prisma.docpenTranscription.createMany({
      data: [
        { sessionId: session.id, speakerRole: 'PRACTITIONER', speakerLabel: 'Dr. Tremblay', content: 'How are the braces feeling today?', startTime: 0, endTime: 10, confidence: 0.95 },
        { sessionId: session.id, speakerRole: 'PATIENT', speakerLabel: 'Patient', content: 'They feel good, no major discomfort.', startTime: 10, endTime: 18, confidence: 0.92 },
        { sessionId: session.id, speakerRole: 'PRACTITIONER', speakerLabel: 'Dr. Tremblay', content: 'Good. Let me check the alignment progress.', startTime: 18, endTime: 28, confidence: 0.94 },
      ],
    });
    await prisma.docpenSOAPNote.create({
      data: {
        sessionId: session.id,
        soapType: 'CONSULTATION_NOTE',
        subjective: 'Patient reports braces feeling comfortable. No discomfort.',
        objective: 'Examined alignment. Progress on track. Minor adjustments made.',
        assessment: 'Orthodontic treatment progressing as expected.',
        plan: 'Continue current treatment. Next adjustment in 6 weeks.',
        additionalNotes: 'D8080 - Comprehensive orthodontic treatment',
        aiModel: 'GPT-4o',
        processingTime: 1200,
        isCurrentVersion: true,
      },
    });
    await prisma.docpenSessionAuditLog.createMany({
      data: [
        { sessionId: session.id, event: 'session_created' },
        { sessionId: session.id, event: 'recording_started' },
        { sessionId: session.id, event: 'soap_generated' },
        { sessionId: session.id, event: 'reviewed' },
        { sessionId: session.id, event: 'signed' },
      ],
    });
  }
  console.log(`   ✓ Created ${sessionCount} DocPen sessions with transcriptions, SOAP notes, audit logs\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 11 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • DocPen sessions: ${sessionCount} (all signed, transcribed, SOAP generated)`);
  console.log('\n🎉 Run Phase 12 next for AI jobs & tasks.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
