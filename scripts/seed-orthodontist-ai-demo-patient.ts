/**
 * Seeds one orthodontist demo patient with real dental assets.
 *
 * Creates/updates for orthodontist@nexrel.com:
 * - Lead (patient) for Dental Management selection
 * - DentalXRay records using real radiograph files in public/test-assets/dental/xrays
 * - DentalOdontogram chart
 * - DentalPeriodontalChart entries (current + prior)
 * - PatientDocument entries for real STL arch scans in public/test-assets/dental/3d-scans
 *
 * Run:
 *   npx tsx scripts/seed-orthodontist-ai-demo-patient.ts
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import {
  prisma,
  findOrthodontistUser,
  ensureUserInOrthoDb,
} from "./seed-orthodontist-db-helper";

const DEMO_PATIENT = {
  contactPerson: "Camille Desrosiers",
  email: "camille.desrosiers.ai-demo@nexrel.com",
  phone: "514-555-7821",
  address: "1250 Boulevard Rene-Levesque Ouest",
  city: "Montreal",
  state: "QC",
  zipCode: "H3B 4W8",
  country: "Canada",
};

const REAL_XRAYS = [
  {
    xrayType: "PANORAMIC",
    imageUrl: "/test-assets/dental/xrays/panoramic-orthopantomogram.jpg",
    teethIncluded: Array.from({ length: 32 }, (_, i) => String(i + 1)),
    notes: "Initial panoramic radiograph (real sample file)",
    aiAnalysis: {
      findings:
        "Symmetric condyles, mild anterior crowding, no acute periapical lesions. Existing restorations on 3 and 14 are stable.",
      confidence: 0.93,
      recommendations:
        "Proceed with orthodontic planning and routine periodontal maintenance.",
      model: "gpt-4o",
    },
  },
  {
    xrayType: "BITEWING",
    imageUrl: "/test-assets/dental/xrays/bitewing-xray-1.jpg",
    teethIncluded: ["2", "3", "4", "5", "13", "14", "15", "16"],
    notes: "Right bitewing radiograph (real sample file)",
    aiAnalysis: {
      findings:
        "No recurrent caries in visible posterior contacts. Crest height appears within expected range.",
      confidence: 0.9,
      recommendations: "Continue monitoring at standard recall intervals.",
      model: "gpt-4o",
    },
  },
  {
    xrayType: "BITEWING",
    imageUrl: "/test-assets/dental/xrays/bitewing-xray-2.jpg",
    teethIncluded: ["18", "19", "20", "21", "28", "29", "30", "31"],
    notes: "Left bitewing radiograph (real sample file)",
    aiAnalysis: {
      findings:
        "Posterior contacts intact with no obvious interproximal carious defects. Mild horizontal bone loss in lower molar region.",
      confidence: 0.88,
      recommendations:
        "Reinforce oral hygiene and re-evaluate periodontal trend in 3 months.",
      model: "gpt-4o",
    },
  },
];

const STL_FILES = [
  "maxillary-3shape-real.stl",
  "mandibular-3shape-real.stl",
  "tooth-1-molar.stl",
  "tooth-14-molar.stl",
  "tooth-19-molar.stl",
];

async function ensureClinic(userId: string) {
  const existing = await prisma.userClinic.findFirst({
    where: { userId },
    include: { clinic: true },
  });
  if (existing) return existing.clinic;

  const clinic = await prisma.clinic.create({
    data: {
      name: "Montreal Orthodontic Demo Clinic",
      address: "1000 Rue Sherbrooke Ouest",
      city: "Montreal",
      province: "QC",
      postalCode: "H3A 3R2",
      country: "Canada",
      phone: "514-555-9000",
      email: "demo-clinic@nexrel.com",
      timezone: "America/Toronto",
      currency: "CAD",
      language: "en",
    },
  });

  await prisma.userClinic.create({
    data: {
      userId,
      clinicId: clinic.id,
      role: "OWNER",
      isPrimary: true,
    },
  });

  return clinic;
}

function buildOdontogram() {
  return {
    "3": { condition: "filling", notes: "MOD composite" },
    "8": { condition: "crowding", notes: "Mild anterior crowding" },
    "9": { condition: "crowding", notes: "Mild anterior crowding" },
    "14": { condition: "filling", notes: "DO composite" },
    "19": { condition: "monitor", notes: "Mild bone support reduction" },
    "30": { condition: "monitor", notes: "Mild bone support reduction" },
  };
}

function buildPeriodontal(seedOffset = 0) {
  const measurements: Record<string, any> = {};
  for (let t = 1; t <= 32; t++) {
    const moderate = [19, 30].includes(t);
    const pdBase = moderate ? 4 : 2;
    measurements[String(t)] = {
      mesial: { pd: pdBase + ((t + seedOffset) % 2), bop: moderate },
      buccal: { pd: Math.max(pdBase - 1, 1), bop: false },
      distal: { pd: pdBase + ((t + 1 + seedOffset) % 2), bop: moderate },
      lingual: { pd: pdBase + (moderate ? 1 : 0), bop: moderate },
    };
  }
  return measurements;
}

async function main() {
  console.log("\n🦷 Seeding orthodontist AI demo patient with real files\n");

  const user = await findOrthodontistUser();
  await ensureUserInOrthoDb(user);
  console.log(`✅ User: ${user.id}`);

  const clinic = await ensureClinic(user.id);
  console.log(`✅ Clinic: ${clinic.id}`);

  const existingLead = await prisma.lead.findFirst({
    where: { userId: user.id, email: DEMO_PATIENT.email },
    select: { id: true },
  });

  const lead = existingLead
    ? await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          userId: user.id,
          contactPerson: DEMO_PATIENT.contactPerson,
          phone: DEMO_PATIENT.phone,
          address: DEMO_PATIENT.address,
          city: DEMO_PATIENT.city,
          state: DEMO_PATIENT.state,
          zipCode: DEMO_PATIENT.zipCode,
          country: DEMO_PATIENT.country,
          source: "ai_demo_real_files",
          status: "QUALIFIED",
          dentalHistory: {
            notes: "AI demo patient with real sample x-rays and arch scans",
            allergies: ["None known"],
            medications: ["None"],
          },
        },
      })
    : await prisma.lead.create({
        data: {
          userId: user.id,
          contactPerson: DEMO_PATIENT.contactPerson,
          email: DEMO_PATIENT.email,
          phone: DEMO_PATIENT.phone,
          businessName: DEMO_PATIENT.contactPerson,
          address: DEMO_PATIENT.address,
          city: DEMO_PATIENT.city,
          state: DEMO_PATIENT.state,
          zipCode: DEMO_PATIENT.zipCode,
          country: DEMO_PATIENT.country,
          source: "ai_demo_real_files",
          status: "QUALIFIED",
          dentalHistory: {
            notes: "AI demo patient with real sample x-rays and arch scans",
          },
          tags: ["AI_DEMO", "ORTHO_REAL_FILES"] as any,
        },
      });
  console.log(`✅ Lead: ${lead.contactPerson} (${lead.id})`);

  await prisma.dentalXRay.deleteMany({
    where: { leadId: lead.id, userId: user.id },
  });
  for (let i = 0; i < REAL_XRAYS.length; i++) {
    const x = REAL_XRAYS[i];
    await prisma.dentalXRay.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        xrayType: x.xrayType,
        teethIncluded: x.teethIncluded,
        dateTaken: new Date(Date.now() - i * 21 * 24 * 60 * 60 * 1000),
        notes: x.notes,
        imageUrl: x.imageUrl,
        imageFile: x.imageUrl,
        fullUrl: x.imageUrl,
        previewUrl: x.imageUrl,
        thumbnailUrl: x.imageUrl,
        aiAnalysis: x.aiAnalysis,
        aiAnalyzedAt: new Date(),
        aiModel: "gpt-4o",
      },
    });
  }
  console.log(`✅ X-rays: ${REAL_XRAYS.length}`);

  await prisma.dentalOdontogram.deleteMany({
    where: { leadId: lead.id, userId: user.id },
  });
  await prisma.dentalOdontogram.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      clinicId: clinic.id,
      toothData: buildOdontogram(),
      chartDate: new Date(),
      chartedBy: "AI Demo Seed",
      notes: "Demo odontogram for AI analysis",
    },
  });
  console.log("✅ Odontogram chart created");

  await prisma.dentalPeriodontalChart.deleteMany({
    where: { leadId: lead.id, userId: user.id },
  });
  await prisma.dentalPeriodontalChart.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      clinicId: clinic.id,
      chartDate: new Date(),
      chartedBy: "AI Demo Seed",
      measurements: buildPeriodontal(0),
      notes: "Current periodontal chart (demo)",
    },
  });
  await prisma.dentalPeriodontalChart.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      clinicId: clinic.id,
      chartDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      chartedBy: "AI Demo Seed",
      measurements: buildPeriodontal(1),
      notes: "Prior periodontal chart (demo baseline)",
    },
  });
  console.log("✅ Periodontal charts: 2");

  const stlDir = path.join(
    process.cwd(),
    "public",
    "test-assets",
    "dental",
    "3d-scans",
  );
  const retentionExpiry = new Date();
  retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7);
  let docsCreated = 0;
  for (const fileName of STL_FILES) {
    const filePath = path.join(stlDir, fileName);
    if (!fs.existsSync(filePath)) continue;
    const storagePath = `/test-assets/dental/3d-scans/${fileName}`;
    const exists = await prisma.patientDocument.findFirst({
      where: {
        leadId: lead.id,
        userId: user.id,
        encryptedStoragePath: storagePath,
      },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.patientDocument.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        leadId: lead.id,
        documentType: "OTHER",
        category: "3d-scan",
        fileName,
        fileType: "application/octet-stream",
        fileSize: fs.statSync(filePath).size,
        encryptedStoragePath: storagePath,
        encryptionKeyId: "demo-key-ortho",
        retentionExpiry,
        accessLevel: "RESTRICTED",
        createdBy: user.id,
        tags: ["AI_DEMO", "3D_SCAN"] as any,
        description: "Real STL sample for orthodontic AI demo",
      },
    });
    docsCreated++;
  }
  console.log(`✅ 3D scan docs added: ${docsCreated}`);

  console.log("\n🎉 Done");
  console.log(`- Lead ID: ${lead.id}`);
  console.log(`- Lead Email: ${lead.email}`);
  console.log(
    "- Open /dashboard/dental/clinical and select Camille Desrosiers",
  );
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e?.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
