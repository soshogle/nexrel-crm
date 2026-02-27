/**
 * Seed orthodontic treatments for Marie Tremblay.
 * Creates an Invisalign case mid-treatment and a completed retainer.
 */
import { prisma, findOrthodontistUser, ensureUserInOrthoDb } from './seed-orthodontist-db-helper';

async function main() {
  const user = await findOrthodontistUser();
  await ensureUserInOrthoDb(user);
  console.log(`User: ${user.name} (${user.id})`);

  const uc = await prisma.userClinic.findFirst({
    where: { userId: user.id },
    include: { clinic: true },
  });
  if (!uc) throw new Error('No clinic found for user');
  const clinicId = uc.clinicId;
  console.log(`Clinic: ${uc.clinic.name} (${clinicId})`);

  const marie = await prisma.lead.findFirst({
    where: { userId: user.id, contactPerson: { contains: 'Marie', mode: 'insensitive' } },
    select: { id: true, contactPerson: true },
  });
  if (!marie) throw new Error('Marie Tremblay lead not found');
  console.log(`Patient: ${marie.contactPerson} (${marie.id})`);

  // Clean existing
  await prisma.orthoTreatment.deleteMany({
    where: { leadId: marie.id, userId: user.id },
  });
  console.log('Cleared existing ortho treatments');

  // 1. Active Invisalign case — mid-treatment
  const invisalign = await prisma.orthoTreatment.create({
    data: {
      leadId: marie.id,
      userId: user.id,
      clinicId,
      treatmentType: 'ALIGNER',
      status: 'ACTIVE',
      startDate: new Date('2025-09-15'),
      estimatedEndDate: new Date('2026-09-15'),
      arch: 'BOTH',
      alignerBrand: 'Invisalign',
      alignerCaseNumber: 'INV-2025-QC-87421',
      totalAligners: 22,
      currentAligner: 12,
      wearSchedule: 22,
      changeFrequency: 14,
      nextChangeDate: new Date('2026-03-10'),
      refinementNumber: 0,
      clinCheckUrl: 'https://my.invisalign.com/case/INV-2025-QC-87421',
      iprPlan: [
        { tooth: '12', mesial: 0.2, distal: 0.0 },
        { tooth: '22', mesial: 0.2, distal: 0.0 },
        { tooth: '13', mesial: 0.0, distal: 0.3 },
        { tooth: '23', mesial: 0.0, distal: 0.3 },
        { tooth: '32', mesial: 0.15, distal: 0.15 },
        { tooth: '42', mesial: 0.15, distal: 0.15 },
      ],
      visits: [
        {
          date: '2025-09-15',
          alignerNumber: 1,
          notes: 'Initial delivery. Attachments placed on 13, 14, 23, 24, 33, 43. Patient instructed on 22h/day wear.',
        },
        {
          date: '2025-10-13',
          alignerNumber: 3,
          notes: 'Good tracking. IPR performed on 12M, 22M (0.2mm each). Progressing well.',
        },
        {
          date: '2025-11-24',
          alignerNumber: 6,
          notes: 'Tracking well. Mild discomfort reported with aligner 5, resolved. IPR on 32M/D, 42M/D.',
        },
        {
          date: '2026-01-05',
          alignerNumber: 8,
          notes: 'Good compliance. Tooth 23 slightly behind — added chewies for anterior region.',
        },
        {
          date: '2026-02-16',
          alignerNumber: 11,
          notes: 'Excellent tracking. IPR on 13D, 23D (0.3mm each). Ready for aligner 12.',
        },
      ],
      notes: 'Class I crowding, upper and lower arches. IPR preferred over extraction. Patient motivated, excellent compliance.',
    },
  });
  console.log(`✓ Created Invisalign treatment: Aligner 12/22 (${invisalign.id})`);

  // 2. Completed retainer — from previous treatment
  const retainer = await prisma.orthoTreatment.create({
    data: {
      leadId: marie.id,
      userId: user.id,
      clinicId,
      treatmentType: 'RETAINER',
      status: 'ACTIVE',
      startDate: new Date('2024-06-01'),
      arch: 'BOTH',
      retainerType: 'Essix',
      wearInstructions: 'Nights only (minimum 8 hours). Replace every 12 months or if cracked.',
      notes: 'Post-treatment retention from previous ortho (braces completed June 2024). Compliance is good.',
      visits: [
        {
          date: '2024-06-01',
          notes: 'Essix retainers delivered upper and lower. Fit verified. Wear full time for 3 months.',
        },
        {
          date: '2024-09-15',
          notes: 'Retention check — alignment stable. Transitioned to nights-only wear.',
        },
        {
          date: '2025-06-01',
          notes: 'Annual retention check. Retainers in good condition. Alignment stable.',
        },
      ],
    },
  });
  console.log(`✓ Created retainer treatment (${retainer.id})`);

  console.log('\nDone! Marie Tremblay now has:');
  console.log('  - Active Invisalign case (aligner 12 of 22)');
  console.log('  - Active Essix retainer (nights only)');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
