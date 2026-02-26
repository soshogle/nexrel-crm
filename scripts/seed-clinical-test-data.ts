/**
 * Seed Script: Clinical Test Data for New Dashboard Features
 * Generates:
 *   1. STL files (programmatic dental arch geometry) for 3D Scan Viewer
 *   2. Sample intraoral + extraoral photos (valid placeholder PNGs)
 *   3. Mock lab orders with communication messages
 *   4. Mock insurance pre-authorization records
 *   5. Mock referral records (incoming & outgoing)
 *   6. PatientDocument records linking files to patients
 *
 * Run: npx ts-node --skip-project scripts/seed-clinical-test-data.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { deflateSync } from 'zlib';
import { PrismaClient } from '@prisma/client';

const USER_EMAIL = 'orthodontist@nexrel.com';

function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL_ORTHODONTIST || process.env.DATABASE_URL;
  return new PrismaClient({
    log: ['error'],
    ...(url ? { datasources: { db: { url } } } : {}),
  });
}

const prisma = getPrisma();

// ─── UTILITY: Random date ──────────────────────────────────────────────────

function randomDate(daysAgoMax: number, daysAgoMin: number = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * (daysAgoMax - daysAgoMin) + daysAgoMin));
  return d;
}

function uniqueId(prefix: string, idx: number): string {
  const d = new Date();
  const ts = d.getTime().toString(36).slice(-6);
  const r = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  return `${prefix}-${ts}-${r}-${idx}`;
}

// ─── 1. GENERATE STL FILES ─────────────────────────────────────────────────

function generateBinarySTL(triangles: { n: number[]; v1: number[]; v2: number[]; v3: number[] }[]): Buffer {
  const buf = Buffer.alloc(80 + 4 + triangles.length * 50);
  buf.write('Binary STL - Dental Arch Test Model', 0);
  buf.writeUInt32LE(triangles.length, 80);
  let off = 84;
  for (const t of triangles) {
    for (const v of t.n) { buf.writeFloatLE(v, off); off += 4; }
    for (const v of t.v1) { buf.writeFloatLE(v, off); off += 4; }
    for (const v of t.v2) { buf.writeFloatLE(v, off); off += 4; }
    for (const v of t.v3) { buf.writeFloatLE(v, off); off += 4; }
    buf.writeUInt16LE(0, off); off += 2;
  }
  return buf;
}

function toothGeo(cx: number, cy: number, w: number, h: number): { n: number[]; v1: number[]; v2: number[]; v3: number[] }[] {
  const tris: { n: number[]; v1: number[]; v2: number[]; v3: number[] }[] = [];
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const a1 = (i / seg) * Math.PI * 2, a2 = ((i + 1) / seg) * Math.PI * 2;
    const rx = w / 2, ry = w / 2.5;
    const x1 = cx + Math.cos(a1) * rx, y1 = cy + Math.sin(a1) * ry;
    const x2 = cx + Math.cos(a2) * rx, y2 = cy + Math.sin(a2) * ry;
    const nm = [Math.cos((a1 + a2) / 2), Math.sin((a1 + a2) / 2), 0];
    tris.push({ n: nm, v1: [x1, y1, 0], v2: [x2, y2, 0], v3: [x2, y2, h] });
    tris.push({ n: nm, v1: [x1, y1, 0], v2: [x2, y2, h], v3: [x1, y1, h] });
    tris.push({ n: [0, 0, 1], v1: [cx, cy, h], v2: [x1, y1, h], v3: [x2, y2, h] });
    tris.push({ n: [0, 0, -1], v1: [cx, cy, 0], v2: [x2, y2, 0], v3: [x1, y1, 0] });
  }
  return tris;
}

function dentalArchSTL(upper: boolean): Buffer {
  const tris: { n: number[]; v1: number[]; v2: number[]; v3: number[] }[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 15) * Math.PI - Math.PI / 2;
    const r = 25;
    const cx = Math.cos(angle) * r;
    const cy = Math.sin(angle) * r * (upper ? 1 : -1);
    const w = (i <= 2 || i >= 13) ? 5 : (i <= 4 || i >= 11) ? 3.5 : (i <= 5 || i >= 10) ? 3 : 2.8;
    tris.push(...toothGeo(cx, cy, w, upper ? 8 : 7));
  }
  return generateBinarySTL(tris);
}

// ─── 2. GENERATE PLACEHOLDER PNG ────────────────────────────────────────────

function crc32(buf: Buffer): number {
  let c = 0xFFFFFFFF;
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = (v & 1) ? 0xEDB88320 ^ (v >>> 1) : v >>> 1;
    t[n] = v;
  }
  for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function makePNG(w: number, h: number, rgb: [number, number, number]): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrPayload = Buffer.alloc(13);
  ihdrPayload.writeUInt32BE(w, 0); ihdrPayload.writeUInt32BE(h, 4);
  ihdrPayload[8] = 8; ihdrPayload[9] = 2; // 8-bit RGB
  const ihdrType = Buffer.from('IHDR');
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), ihdrType, ihdrPayload,
    (() => { const b = Buffer.alloc(4); b.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrPayload]))); return b; })(),
  ]);

  // IDAT
  const raw: number[] = [];
  for (let y = 0; y < h; y++) {
    raw.push(0); // filter: none
    for (let x = 0; x < w; x++) {
      const f = 1 - (y / h) * 0.2;
      raw.push(Math.floor(rgb[0] * f), Math.floor(rgb[1] * f), Math.floor(rgb[2] * f));
    }
  }
  const compressed = deflateSync(Buffer.from(raw));
  const idatType = Buffer.from('IDAT');
  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length);
  const idatCrc = Buffer.alloc(4); idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])));
  const idatChunk = Buffer.concat([idatLen, idatType, compressed, idatCrc]);

  // IEND
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4); iendCrc.writeUInt32BE(crc32(iendType));
  const iendChunk = Buffer.concat([Buffer.from([0, 0, 0, 0]), iendType, iendCrc]);

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

// ─── 3. DATA CONSTANTS ─────────────────────────────────────────────────────

const REFERRING_DOCTORS = [
  { name: 'Dr. Marie-Claire Beaumont', clinic: 'Clinique Dentaire Beaumont', phone: '(514) 555-0123', email: 'mbeaumont@clinbeaumont.ca', specialty: 'General Dentist' },
  { name: 'Dr. Pierre Gagnon', clinic: 'Centre Dentaire Laval', phone: '(450) 555-0234', email: 'pgagnon@centrelaval.ca', specialty: 'General Dentist' },
  { name: 'Dr. Sylvie Tremblay', clinic: 'Hôpital Sainte-Justine', phone: '(514) 555-0345', email: 'stremblay@hsj.qc.ca', specialty: 'Oral Surgeon' },
  { name: 'Dr. François Leclerc', clinic: 'Clinique ORL Montréal', phone: '(514) 555-0456', email: 'fleclerc@orlmtl.ca', specialty: 'ENT Specialist' },
  { name: 'Dr. Anne-Marie Côté', clinic: 'Pédiatrie Côté', phone: '(514) 555-0567', email: 'amcote@pedcote.ca', specialty: 'Pediatric Dentist' },
  { name: 'Dr. Jean-Philippe Dubois', clinic: 'Clinique Maxillofaciale', phone: '(514) 555-0678', email: 'jpdubois@maxillo.ca', specialty: 'Maxillofacial Surgeon' },
];

const OUTGOING_DOCS = [
  { name: 'Dr. Robert Bhatt', clinic: 'Montréal Periodontics', phone: '(514) 555-1234', email: 'rbhatt@mtlperio.ca', specialty: 'Periodontist' },
  { name: 'Dr. Lisa Chen', clinic: 'Endodontic Associates', phone: '(514) 555-2345', email: 'lchen@endoassoc.ca', specialty: 'Endodontist' },
  { name: 'Dr. Michael Torres', clinic: 'Centre Implantologie Montréal', phone: '(514) 555-3456', email: 'mtorres@implant.ca', specialty: 'Prosthodontist' },
];

const LABS = [
  { name: 'OrthoLab Québec', phone: '(514) 555-7001', email: 'orders@ortholab.ca' },
  { name: 'Spectrum Orthodontic Lab', phone: '(450) 555-7002', email: 'production@spectrumortho.ca' },
  { name: 'DentalTech Solutions', phone: '(514) 555-7003', email: 'orders@dentaltech.ca' },
  { name: 'Align Technology (Invisalign)', phone: '1-800-555-7004', email: 'cases@aligntech.com' },
];

// ─── MAIN ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🏥 Seeding Clinical Test Data for New Dashboard Features\n');

  // Find user
  let user: { id: string; name: string | null } | null = null;
  try {
    user = await prisma.user.findUnique({ where: { email: USER_EMAIL }, select: { id: true, name: true } });
  } catch {
    const metaUrl = process.env.DATABASE_URL_META;
    if (metaUrl) {
      const meta = new PrismaClient({ datasources: { db: { url: metaUrl } } });
      user = await meta.user.findUnique({ where: { email: USER_EMAIL }, select: { id: true, name: true } });
      await meta.$disconnect();
    }
  }
  if (!user) { console.error('❌ User not found'); process.exit(1); }
  console.log(`✅ User: ${user.name || user.id}`);

  // Find clinic — ONLY via orthodontist's UserClinic membership (no fallback to other users' clinics)
  const membership = await prisma.userClinic.findFirst({
    where: { userId: user.id },
    select: { clinicId: true, clinic: { select: { id: true, name: true } } },
  }).catch(() => null);

  if (!membership?.clinicId) {
    console.error('❌ No clinic found for orthodontist@nexrel.com. Create a clinic and add this user via UserClinic.');
    process.exit(1);
  }
  const clinicId = membership.clinicId;
  console.log(`✅ Clinic: ${(membership as any).clinic?.name || clinicId}`);

  // Find patients — ONLY leads belonging to orthodontist@nexrel.com
  const leads = await prisma.lead.findMany({
    where: { userId: user.id },
    select: { id: true, contactPerson: true, email: true },
    take: 10,
  });
  console.log(`✅ Found ${leads.length} patients (all under orthodontist@nexrel.com)\n`);
  if (leads.length === 0) { console.error('❌ No leads found for orthodontist@nexrel.com'); process.exit(1); }

  // Prefer Marie Tremblay as primary patient (for demo consistency)
  const primaryLead = leads.find((l) =>
    (l.contactPerson || '').toLowerCase().includes('tremblay') ||
    (l.contactPerson || '').toLowerCase().includes('marie')
  ) || leads[0];
  console.log(`📋 Primary patient for seeded data: ${primaryLead.contactPerson || primaryLead.email || primaryLead.id}\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. STL FILES — Use real downloaded files (run download-dental-test-files.ts first)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('📦 Preparing 3D scan STL files...');
  const stlDir = path.join(process.cwd(), 'public', 'test-assets', 'dental', '3d-scans');
  fs.mkdirSync(stlDir, { recursive: true });

  const realStlFiles = [
    { name: 'mandibular-3shape-real.stl', upper: false, desc: 'Lower arch - real 3Shape TRIOS scan' },
    { name: 'maxillary-3shape-real.stl', upper: true, desc: 'Upper arch - real 3Shape TRIOS scan' },
    { name: 'tooth-1-molar.stl', upper: true, desc: 'Tooth #1 (upper right 3rd molar)' },
    { name: 'tooth-14-molar.stl', upper: true, desc: 'Tooth #14 (upper left 1st molar)' },
    { name: 'tooth-19-molar.stl', upper: false, desc: 'Tooth #19 (lower left 1st molar)' },
  ];

  const stlFiles: { name: string; upper: boolean; desc: string }[] = [];
  for (const f of realStlFiles) {
    const p = path.join(stlDir, f.name);
    if (fs.existsSync(p)) {
      stlFiles.push(f);
      console.log(`   ✅ ${f.name} (${(fs.statSync(p).size / 1024).toFixed(1)} KB) — ${f.desc}`);
    } else {
      console.log(`   ⏭️  ${f.name} not found (run: npx ts-node scripts/download-dental-test-files.ts)`);
    }
  }

  if (stlFiles.length === 0) {
    console.log('   Generating fallback STLs...');
    const fallbacks = [
      { name: 'upper-arch-scan.stl', upper: true, desc: 'Full upper arch (generated)' },
      { name: 'lower-arch-scan.stl', upper: false, desc: 'Full lower arch (generated)' },
    ];
    for (const fb of fallbacks) {
      fs.writeFileSync(path.join(stlDir, fb.name), dentalArchSTL(fb.upper));
      stlFiles.push(fb);
      console.log(`   ✅ ${fb.name} (generated)`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. GENERATE PLACEHOLDER PHOTOS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📸 Generating placeholder photos...');
  const baseDir = path.join(process.cwd(), 'public', 'test-assets', 'dental');

  const intraPhotos = [
    { file: 'intraoral-frontal.png', view: 'frontal', rgb: [220, 200, 190] as [number, number, number] },
    { file: 'intraoral-left-buccal.png', view: 'left-buccal', rgb: [210, 195, 185] as [number, number, number] },
    { file: 'intraoral-right-buccal.png', view: 'right-buccal', rgb: [215, 198, 188] as [number, number, number] },
    { file: 'intraoral-upper-occlusal.png', view: 'upper-occlusal', rgb: [225, 210, 200] as [number, number, number] },
    { file: 'intraoral-lower-occlusal.png', view: 'lower-occlusal', rgb: [218, 203, 193] as [number, number, number] },
  ];

  const extraPhotos = [
    { file: 'extraoral-frontal.png', view: 'face-frontal', rgb: [240, 220, 200] as [number, number, number] },
    { file: 'extraoral-profile.png', view: 'face-profile', rgb: [235, 215, 195] as [number, number, number] },
    { file: 'extraoral-smile.png', view: 'face-smile', rgb: [245, 225, 205] as [number, number, number] },
  ];

  for (const p of intraPhotos) {
    const dir = path.join(baseDir, 'intraoral');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, p.file), makePNG(320, 240, p.rgb));
    console.log(`   ✅ intraoral/${p.file}`);
  }
  for (const p of extraPhotos) {
    const dir = path.join(baseDir, 'extraoral');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, p.file), makePNG(320, 240, p.rgb));
    console.log(`   ✅ extraoral/${p.file}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2b. SEED DOCUMENT CONSENT (required for uploads — fixes 403)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📜 Seeding document consent (for uploads)...');
  try {
    const existing = await prisma.documentConsent.findFirst({
      where: { leadId: primaryLead.id, userId: user.id, consentType: 'DATA_COLLECTION', granted: true },
    });
    if (!existing) {
      await prisma.documentConsent.create({
        data: {
          leadId: primaryLead.id,
          userId: user.id,
          consentType: 'DATA_COLLECTION',
          purpose: 'Clinical document collection for treatment',
          legalBasis: 'Consent',
          consentMethod: 'Written',
          granted: true,
          grantedAt: new Date(),
          grantedBy: user.id,
        },
      });
      console.log('   ✅ Document consent created for primary patient');
    } else {
      console.log('   ⏭️  Consent already exists');
    }
  } catch (err: any) {
    console.log(`   ⚠️  Consent skip: ${err.message?.substring(0, 60)}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SEED PATIENT DOCUMENT RECORDS (photos + scans)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📁 Seeding document records...');
  let docCount = 0;
  const retentionExpiry = new Date();
  retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);

  for (const p of [...intraPhotos, ...extraPhotos]) {
    const isExtra = p.view.startsWith('face-');
    const subdir = isExtra ? 'extraoral' : 'intraoral';
    try {
      await prisma.patientDocument.create({
        data: {
          userId: user.id,
          clinicId,
          leadId: primaryLead.id,
          documentType: 'PHOTO',
          category: isExtra ? 'extraoral' : 'intraoral',
          fileName: p.file,
          fileType: 'image/png',
          fileSize: 15000,
          encryptedStoragePath: `/test-assets/dental/${subdir}/${p.file}`,
          encryptionKeyId: 'test-key-001',
          retentionExpiry,
          accessLevel: 'RESTRICTED',
          createdBy: user.id,
          tags: [p.view],
          description: `Clinical photo — ${p.view}`,
        },
      });
      docCount++;
    } catch (err: any) {
      console.log(`   ⚠️  Doc skip: ${err.message?.substring(0, 60)}`);
    }
  }

  for (const f of stlFiles) {
    try {
      await prisma.patientDocument.create({
        data: {
          userId: user.id,
          clinicId,
          leadId: primaryLead.id,
          documentType: 'OTHER',
          category: '3d-scan',
          fileName: f.name,
          fileType: 'application/octet-stream',
          fileSize: fs.statSync(path.join(stlDir, f.name)).size,
          encryptedStoragePath: `/test-assets/dental/3d-scans/${f.name}`,
          encryptionKeyId: 'test-key-001',
          retentionExpiry,
          accessLevel: 'RESTRICTED',
          createdBy: user.id,
          tags: [f.upper ? 'full-arch-upper' : 'full-arch-lower'],
          description: f.desc,
        },
      });
      docCount++;
    } catch (err: any) {
      console.log(`   ⚠️  Doc skip: ${err.message?.substring(0, 60)}`);
    }
  }
  console.log(`   ✅ Created ${docCount} document records`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. SEED LAB ORDERS WITH COMMUNICATION
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🔬 Seeding lab orders with communication threads...');
  let labCount = 0;

  const labScenarios = [
    { type: 'RETAINER' as const, status: 'DELIVERED' as const, desc: 'Hawley retainer, upper and lower', instr: 'Adams clasps on #3 and #14. Ball clasps between #8-9.' },
    { type: 'ORTHODONTIC' as const, status: 'IN_PROGRESS' as const, desc: 'Rapid palatal expander (RPE)', instr: 'Expansion screw midline. Acrylic to first premolars.' },
    { type: 'NIGHT_GUARD' as const, status: 'COMPLETED' as const, desc: 'Hard/soft night guard, upper arch', instr: '2mm hard outer, soft inner. Flat occlusal surface.' },
    { type: 'RETAINER' as const, status: 'SUBMITTED' as const, desc: 'Essix retainer set, upper and lower', instr: 'Clear material. 1mm thickness. Trim at gingival margin.' },
    { type: 'ORTHODONTIC' as const, status: 'PENDING' as const, desc: 'Herbst appliance', instr: 'Mandibular advancement 5mm. Crown-type on first molars.' },
    { type: 'OTHER' as const, status: 'RECEIVED' as const, desc: 'Space maintainer, band and loop', instr: 'Band on #19, loop mesial to maintain space for #20.' },
  ];

  for (let i = 0; i < Math.min(labScenarios.length, leads.length); i++) {
    const sc = labScenarios[i];
    const lead = leads[i];
    const lab = LABS[i % LABS.length];
    const created = randomDate(60, 5);
    const delivery = new Date(created); delivery.setDate(delivery.getDate() + 14 + Math.floor(Math.random() * 14));

    const messages = generateLabMessages(lab.name, created, sc.status);

    try {
      await prisma.dentalLabOrder.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          clinicId,
          orderNumber: uniqueId('LAB', i + 100),
          labName: lab.name,
          labContact: { name: lab.name, phone: lab.phone, email: lab.email },
          orderType: sc.type,
          description: sc.desc,
          instructions: sc.instr,
          patientInfo: { name: lead.contactPerson, id: lead.id },
          deliveryDate: delivery,
          status: sc.status,
          cost: 200 + Math.floor(Math.random() * 1200),
          trackingNumber: sc.status === 'DELIVERED' ? `PUR-2025-${880000 + i}` : undefined,
          notes: JSON.stringify({ messages }),
          createdAt: created,
        },
      });
      labCount++;
      console.log(`   ✅ ${lab.name} — ${sc.type} (${sc.status}) for ${lead.contactPerson}`);
    } catch (err: any) {
      console.log(`   ⚠️  Lab skip: ${err.message?.substring(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SEED INSURANCE PRE-AUTHORIZATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n🛡️  Seeding insurance pre-authorization records...');
  let preAuthCount = 0;

  const preAuthScenarios = [
    { provider: 'Sun Life', insType: 'PRIVATE' as const, treatment: 'Comprehensive Orthodontics (Braces)', cost: 6500, status: 'APPROVED' as const, approved: 5200, policy: 'SL-2024-88123' },
    { provider: 'Manulife', insType: 'PRIVATE' as const, treatment: 'Invisalign / Clear Aligners', cost: 7200, status: 'SUBMITTED' as const, policy: 'MAN-2025-44290' },
    { provider: 'RAMQ', insType: 'RAMQ' as const, treatment: 'Phase I Interceptive Treatment', cost: 3800, status: 'PROCESSING' as const, policy: 'RAMQ-NAM-1234' },
    { provider: 'Great-West Life', insType: 'PRIVATE' as const, treatment: 'Palatal Expander', cost: 2200, status: 'DENIED' as const, denial: 'Treatment not considered medically necessary per plan limitations.', policy: 'GWL-2024-67812' },
    { provider: 'Blue Cross', insType: 'PRIVATE' as const, treatment: 'Surgical Orthodontics', cost: 12000, status: 'DRAFT' as const, policy: 'BC-QC-998811' },
    { provider: 'Desjardins Insurance', insType: 'PRIVATE' as const, treatment: 'Retainer Fabrication', cost: 800, status: 'SUBMITTED' as const, policy: 'DJ-2025-11234' },
    { provider: 'Industrial Alliance', insType: 'PRIVATE' as const, treatment: 'Phase II Treatment', cost: 5800, status: 'APPROVED' as const, approved: 4640, policy: 'IA-2025-33219' },
  ];

  for (let i = 0; i < Math.min(preAuthScenarios.length, leads.length); i++) {
    const sc = preAuthScenarios[i];
    const lead = leads[i % leads.length];
    const created = randomDate(90, 5);

    try {
      await prisma.dentalInsuranceClaim.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          clinicId,
          claimNumber: uniqueId('PA', i + 200),
          insuranceType: sc.insType,
          providerName: sc.provider,
          policyNumber: sc.policy,
          patientInfo: { name: lead.contactPerson, id: lead.id },
          procedures: [{ code: 'D8080', description: sc.treatment, cost: sc.cost, dateOfService: created.toISOString() }],
          totalAmount: sc.cost,
          submittedAmount: sc.cost,
          estimatedCoverage: sc.approved || sc.cost * 0.8,
          status: sc.status,
          notes: generateNarrative(sc.treatment, lead.contactPerson || 'Patient'),
          denialReason: sc.denial || null,
          preAuthNumber: `PREAUTH-${sc.policy}`,
          ...(sc.status !== 'DRAFT' ? { submittedAt: new Date(created.getTime() + 86400000) } : {}),
          ...(sc.status === 'APPROVED' || sc.status === 'DENIED' ? { processedAt: new Date(created.getTime() + 86400000 * 12) } : {}),
          ...(sc.approved ? { paymentAmount: sc.approved, responseData: { approvedAmount: sc.approved } } : {}),
          createdAt: created,
        },
      });
      preAuthCount++;
      console.log(`   ✅ ${sc.provider} — ${sc.treatment} ($${sc.cost}) → ${sc.status}`);
    } catch (err: any) {
      console.log(`   ⚠️  Pre-auth skip: ${err.message?.substring(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. SEED REFERRALS (incoming & outgoing)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n📋 Seeding referral records...');
  let refCount = 0;

  const incomingReasons = [
    'Class II malocclusion with deep overbite. 8mm overjet. Requesting orthodontic evaluation.',
    'Severe lower crowding. Mixed dentition. Early interceptive treatment recommended.',
    'Post-surgical orthodontic alignment needed. Bilateral sagittal split osteotomy completed.',
    'Chronic mouth breather, suspected adenoid hypertrophy affecting jaw growth.',
    'Ectopic canines on panoramic x-ray. Upper left canine palatally displaced.',
    'TMJ dysfunction with anterior open bite. Orthodontic evaluation requested.',
  ];

  const outgoingReasons = [
    'Generalized periodontitis with 5-7mm pockets. Periodontal treatment needed before ortho.',
    'Tooth #14 non-vital with periapical radiolucency. Root canal needed prior to movement.',
    'Congenitally missing lateral incisors (#7, #10). Post-ortho implant placement needed.',
  ];

  // Incoming referrals
  for (let i = 0; i < Math.min(REFERRING_DOCTORS.length, leads.length); i++) {
    const doc = REFERRING_DOCTORS[i];
    const lead = leads[i];
    try {
      await prisma.referral.create({
        data: {
          userId: user.id,
          referrerId: lead.id,
          referredName: lead.contactPerson || 'Patient',
          referredEmail: lead.email || undefined,
          notes: `INCOMING from ${doc.name} (${doc.specialty}) at ${doc.clinic}. Phone: ${doc.phone}, Email: ${doc.email}. Reason: ${incomingReasons[i]}`,
          status: i < 2 ? 'PENDING' : 'CONVERTED',
          createdAt: randomDate(120, 3),
        },
      });
      refCount++;
      console.log(`   ✅ Incoming: ${doc.name} (${doc.specialty}) → ${lead.contactPerson}`);
    } catch (err: any) {
      console.log(`   ⚠️  Ref skip: ${err.message?.substring(0, 80)}`);
    }
  }

  // Outgoing referrals
  for (let i = 0; i < Math.min(OUTGOING_DOCS.length, leads.length); i++) {
    const doc = OUTGOING_DOCS[i];
    const lead = leads[(i + 4) % leads.length];
    try {
      await prisma.referral.create({
        data: {
          userId: user.id,
          referrerId: lead.id,
          referredName: `${doc.name} (${doc.specialty})`,
          referredEmail: doc.email,
          referredPhone: doc.phone,
          notes: `OUTGOING to ${doc.name} (${doc.specialty}) at ${doc.clinic}. Reason: ${outgoingReasons[i]}`,
          status: i === 1 ? 'CONVERTED' : 'PENDING',
          createdAt: randomDate(90, 5),
        },
      });
      refCount++;
      console.log(`   ✅ Outgoing → ${doc.name} (${doc.specialty}) for ${lead.contactPerson}`);
    } catch (err: any) {
      console.log(`   ⚠️  Ref skip: ${err.message?.substring(0, 80)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SEED SUMMARY');
  console.log('═'.repeat(60));
  console.log(`   STL Files:            ${stlFiles.length} files in public/test-assets/dental/3d-scans/`);
  console.log(`   Intraoral Photos:     ${intraPhotos.length} PNGs in public/test-assets/dental/intraoral/`);
  console.log(`   Extraoral Photos:     ${extraPhotos.length} PNGs in public/test-assets/dental/extraoral/`);
  console.log(`   Document Records:     ${docCount} linked to ${primaryLead.contactPerson}`);
  console.log(`   Lab Orders:           ${labCount} with communication threads`);
  console.log(`   Pre-Authorizations:   ${preAuthCount} across multiple statuses`);
  console.log(`   Referrals:            ${refCount} (incoming + outgoing)`);
  console.log('═'.repeat(60));

  console.log('\n📌 FOR HIGH-QUALITY REAL TEST FILES, download from:');
  console.log('   STL/PLY dental scans:');
  console.log('     • https://grabcad.com/library?query=dental+teeth');
  console.log('     • https://www.printables.com/model/83327-set-of-teeth-dental-model');
  console.log('     • https://data.dtu.dk/articles/dataset/3Shape_FDI_16_Meshes/23626650');
  console.log('   Clinical photos:');
  console.log('     • https://unsplash.com/s/photos/orthodontics');
  console.log('     • https://www.vecteezy.com/free-photos/dental-braces');
  console.log('   Place downloaded files in the corresponding test-assets directories.\n');

  await prisma.$disconnect();
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function generateLabMessages(labName: string, created: Date, status: string): any[] {
  const msgs: any[] = [];
  const day = 86400000;

  msgs.push({ sender: 'clinic', senderName: 'Dr. Office', message: 'New order submitted. Digital impression files attached. Please confirm receipt.', timestamp: new Date(created.getTime() + day).toISOString(), type: 'message' });

  if (['RECEIVED', 'IN_PROGRESS', 'COMPLETED', 'DELIVERED'].includes(status)) {
    msgs.push({ sender: 'lab', senderName: labName, message: 'Order received. Impression files look good. Starting production. Estimated: 10 business days.', timestamp: new Date(created.getTime() + day * 2).toISOString(), type: 'status_update' });
  }
  if (['IN_PROGRESS', 'COMPLETED', 'DELIVERED'].includes(status)) {
    msgs.push({ sender: 'lab', senderName: labName, message: 'Production in progress. Wax-up complete. Proceeding to finishing.', timestamp: new Date(created.getTime() + day * 5).toISOString(), type: 'status_update' });
    msgs.push({ sender: 'clinic', senderName: 'Dr. Office', message: 'Looks great. Please proceed with final fabrication.', timestamp: new Date(created.getTime() + day * 6).toISOString(), type: 'message' });
  }
  if (['COMPLETED', 'DELIVERED'].includes(status)) {
    msgs.push({ sender: 'lab', senderName: labName, message: 'Order complete! Ready for pickup or shipping. QC passed.', timestamp: new Date(created.getTime() + day * 10).toISOString(), type: 'status_update' });
  }
  if (status === 'DELIVERED') {
    msgs.push({ sender: 'lab', senderName: labName, message: 'Shipped via Purolator. Expected delivery: tomorrow by noon.', timestamp: new Date(created.getTime() + day * 11).toISOString(), type: 'delivery_update' });
    msgs.push({ sender: 'clinic', senderName: 'Dr. Office', message: 'Received. Fit is excellent. Thank you!', timestamp: new Date(created.getTime() + day * 12).toISOString(), type: 'message' });
  }

  return msgs;
}

function generateNarrative(treatment: string, patientName: string): string {
  const narrs: Record<string, string> = {
    'Comprehensive Orthodontics (Braces)': `Patient ${patientName}: Class II Div 1 malocclusion, 7mm overjet, 6mm deep overbite, moderate mandibular crowding. Cephalometric ANB 6°. Treatment: 24 months fixed appliances with possible TADs.`,
    'Invisalign / Clear Aligners': `Patient ${patientName}: Mild-moderate crowding (4mm upper, 3mm lower), slight midline deviation. ClinCheck: 28 aligners with IPR. Est. 7 months.`,
    'Phase I Interceptive Treatment': `Patient ${patientName}, age 8: Anterior crossbite #8-9, posterior crossbite left. Narrow maxilla. RPE + limited fixed appliances. 12-14 months.`,
    'Palatal Expander': `Patient ${patientName}: Bilateral posterior crossbite, 5mm transverse deficiency. RPE protocol: 0.25mm x2/day for 14 days, 6 months retention.`,
    'Surgical Orthodontics': `Patient ${patientName}: Severe skeletal Class III, ANB -5°, Wits -10mm. Pre-surgical ortho 12-18 months, then BSSO mandibular setback ~8mm.`,
    'Retainer Fabrication': `Patient ${patientName}: Completed comprehensive treatment. Upper Hawley retainer + lower bonded 3-3 fixed retainer.`,
    'Phase II Treatment': `Patient ${patientName}: Phase I complete, full permanent dentition. Residual alignment issues require Phase II fixed appliances, ~18 months.`,
  };
  return narrs[treatment] || `Patient ${patientName} requires ${treatment}. Clinical records support medical necessity.`;
}

main().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
