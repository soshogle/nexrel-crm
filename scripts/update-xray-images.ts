/**
 * One-off: Update x-ray records for Marie Tremblay with real radiograph images.
 * Downloads from public/test-assets/ won't need S3 — served directly by Next.js.
 */
import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const REAL_XRAYS = [
  {
    xrayType: 'PANORAMIC',
    imageUrl: '/test-assets/dental/xrays/panoramic-orthopantomogram.jpg',
    teethIncluded: Array.from({ length: 32 }, (_, i) => String(i + 1)),
    notes: 'Initial panoramic radiograph — CRANEX D digital system (CC-BY-SA 2.0, Wikimedia Commons)',
    aiAnalysis: {
      findings: 'Full dentition present. No significant bone loss. Fillings observed on #3 (MOD composite) and #14 (DO composite). All roots appear intact with normal periapical radiolucency. TMJ condyles symmetric.',
      confidence: 0.94,
      recommendations: 'Continue routine monitoring. No immediate intervention needed.',
      model: 'gpt-4o',
    },
  },
  {
    xrayType: 'BITEWING',
    imageUrl: '/test-assets/dental/xrays/bitewing-xray-1.jpg',
    teethIncluded: ['2', '3', '4', '5', '13', '14', '15', '16'],
    notes: 'Right bitewing — Sirona XIOS Plus sensor (CC-BY-4.0, TU Dresden)',
    aiAnalysis: {
      findings: 'MOD composite filling on #3 appears well-adapted. Interproximal bone levels within normal limits. No recurrent caries detected. Crestal bone height normal.',
      confidence: 0.91,
      recommendations: 'Filling on #3 in good condition. No intervention needed.',
      model: 'gpt-4o',
    },
  },
  {
    xrayType: 'BITEWING',
    imageUrl: '/test-assets/dental/xrays/bitewing-xray-2.jpg',
    teethIncluded: ['18', '19', '20', '21', '28', '29', '30', '31'],
    notes: 'Left bitewing — Sirona XIOS Plus sensor (CC-BY-4.0, TU Dresden)',
    aiAnalysis: {
      findings: 'DO composite filling on #14 with adequate marginal seal. Alveolar bone levels normal. No interproximal caries. Periodontal ligament space uniform.',
      confidence: 0.89,
      recommendations: 'All findings within normal limits for orthodontic patient.',
      model: 'gpt-4o',
    },
  },
];

async function main() {
  console.log('🦷 Updating x-ray records with real radiograph images...\n');

  const user = await findOrthodontistUser();
  console.log(`✅ User: ${user.name} (${user.id})\n`);

  const marieLead = await prisma.lead.findFirst({
    where: {
      userId: user.id,
      OR: [
        { contactPerson: { contains: 'Marie Tremblay' } },
        { businessName: { contains: 'Marie Tremblay' } },
        { contactPerson: { contains: 'Marie' } },
      ],
    },
  });

  if (!marieLead) {
    console.error('❌ Marie Tremblay lead not found. Run Phase 1-2 seed first.');
    process.exit(1);
  }
  console.log(`✅ Found Marie Tremblay: ${marieLead.id}\n`);

  // Delete existing x-rays for Marie
  const deleted = await prisma.dentalXRay.deleteMany({
    where: { leadId: marieLead.id },
  });
  console.log(`🧹 Deleted ${deleted.count} existing x-ray records\n`);

  // Get clinic via UserClinic membership
  const userClinic = await prisma.userClinic.findFirst({
    where: { userId: user.id },
    include: { clinic: true },
  });

  if (!userClinic?.clinic) {
    console.error('❌ No clinic found. Run Phase 3 seed first.');
    process.exit(1);
  }
  const clinic = userClinic.clinic;

  // Create new x-ray records with real images
  for (const xray of REAL_XRAYS) {
    await prisma.dentalXRay.create({
      data: {
        leadId: marieLead.id,
        userId: user.id,
        clinicId: clinic.id,
        xrayType: xray.xrayType,
        teethIncluded: xray.teethIncluded,
        dateTaken: new Date('2026-01-15'),
        notes: xray.notes,
        fullUrl: xray.imageUrl,
        previewUrl: xray.imageUrl,
        thumbnailUrl: xray.imageUrl,
        imageUrl: xray.imageUrl,
        aiAnalysis: xray.aiAnalysis,
        aiAnalyzedAt: new Date(),
      },
    });
    console.log(`   ✓ Created ${xray.xrayType} x-ray with image: ${xray.imageUrl}`);
  }

  console.log(`\n✅ Done! ${REAL_XRAYS.length} x-ray records created with real radiograph images.`);
  console.log('   View them at: /dashboard/dental/clinical (select Marie Tremblay)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
