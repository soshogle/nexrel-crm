/**
 * Seed ONLY 3D scan documents for Marie Tremblay (or first patient).
 * Use when scans don't show in the STL viewer.
 *
 * Run: npx tsx scripts/seed-3d-scans-only.ts
 * Requires: orthodontist@nexrel.com, UserClinic, at least one lead.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

// Use same DB as the app (DATABASE_URL) so scans show in the UI
const prisma = new PrismaClient();

async function main() {
  console.log('\n📦 Seeding 3D scan documents only...\n');

  const user = await prisma.user.findUnique({
    where: { email: 'orthodontist@nexrel.com' },
    select: { id: true, name: true },
  });
  if (!user) {
    console.error('❌ orthodontist@nexrel.com not found');
    process.exit(1);
  }

  const membership = await prisma.userClinic.findFirst({
    where: { userId: user.id },
    select: { clinicId: true, clinic: { select: { name: true } } },
  });
  if (!membership?.clinicId) {
    console.error('❌ No clinic for orthodontist. Create UserClinic first.');
    process.exit(1);
  }
  const clinicId = membership.clinicId;
  console.log(`✅ Clinic: ${(membership as any).clinic?.name || clinicId}`);

  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { id: true, contactPerson: true },
    take: 10,
  });
  if (leads.length === 0) {
    console.error('❌ No leads for orthodontist');
    process.exit(1);
  }

  const primaryLead =
    leads.find(
      (l) =>
        (l.contactPerson || '').toLowerCase().includes('tremblay') ||
        (l.contactPerson || '').toLowerCase().includes('marie')
    ) || leads[0];
  console.log(`✅ Patient: ${primaryLead.contactPerson} (${primaryLead.id})\n`);

  const stlDir = path.join(process.cwd(), 'public', 'test-assets', 'dental', '3d-scans');
  if (!fs.existsSync(stlDir)) {
    fs.mkdirSync(stlDir, { recursive: true });
  }

  const stlCandidates = [
    { name: 'mandibular-3shape-real.stl', upper: false, desc: 'Lower arch - 3Shape TRIOS' },
    { name: 'maxillary-3shape-real.stl', upper: true, desc: 'Upper arch - 3Shape TRIOS' },
    { name: 'tooth-1-molar.stl', upper: true, desc: 'Tooth #1' },
    { name: 'tooth-14-molar.stl', upper: true, desc: 'Tooth #14' },
    { name: 'tooth-19-molar.stl', upper: false, desc: 'Tooth #19' },
    { name: 'upper-arch-scan.stl', upper: true, desc: 'Upper arch (generated)' },
    { name: 'lower-arch-scan.stl', upper: false, desc: 'Lower arch (generated)' },
  ];

  const stlFiles: { name: string; upper: boolean; desc: string }[] = [];
  for (const f of stlCandidates) {
    const p = path.join(stlDir, f.name);
    if (fs.existsSync(p)) {
      stlFiles.push(f);
      console.log(`   📄 ${f.name}`);
    }
  }

  if (stlFiles.length === 0) {
    console.error('❌ No STL files in public/test-assets/dental/3d-scans/');
    console.log('   Run: npx ts-node scripts/download-dental-test-files.ts');
    process.exit(1);
  }

  const retentionExpiry = new Date();
  retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);

  let created = 0;
  for (const f of stlFiles) {
    const storagePath = `/test-assets/dental/3d-scans/${f.name}`;
    const fullPath = path.join(process.cwd(), 'public', storagePath);
    const fileSize = fs.statSync(fullPath).size;

    const existing = await prisma.patientDocument.findFirst({
      where: {
        leadId: primaryLead.id,
        userId: user.id,
        documentType: 'OTHER',
        category: '3d-scan',
        encryptedStoragePath: storagePath,
      },
    });
    if (existing) {
      console.log(`   ⏭️  ${f.name} already exists`);
      continue;
    }

    await prisma.patientDocument.create({
      data: {
        userId: user.id,
        clinicId,
        leadId: primaryLead.id,
        documentType: 'OTHER',
        category: '3d-scan',
        fileName: f.name,
        fileType: 'application/octet-stream',
        fileSize,
        encryptedStoragePath: storagePath,
        encryptionKeyId: 'test-key-001',
        retentionExpiry,
        accessLevel: 'RESTRICTED',
        createdBy: user.id,
        tags: [f.upper ? 'full-arch-upper' : 'full-arch-lower'],
        description: f.desc,
      },
    });
    created++;
    console.log(`   ✅ ${f.name}`);
  }

  console.log(`\n✅ Created ${created} 3D scan document(s) for ${primaryLead.contactPerson}`);
  console.log('   Refresh the dental page and select this patient to see scans.\n');
}

main()
  .catch((e) => {
    console.error('❌', e.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
