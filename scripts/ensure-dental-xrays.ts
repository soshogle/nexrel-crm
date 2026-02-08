/**
 * Ensure Dental X-Rays Script
 * 
 * Creates X-rays for all existing dental patients that don't have any X-rays.
 * This ensures the X-Ray Analysis card always shows a preview.
 * 
 * Usage: npx tsx scripts/ensure-dental-xrays.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

const MOCK_XRAY_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=400',
  'https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=400',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400',
];

async function main() {
  console.log('🦷 Ensuring all dental patients have X-rays...\n');

  // Find all users with DENTIST industry
  const dentistUsers = await prisma.user.findMany({
    where: { industry: 'DENTIST' },
  });

  if (dentistUsers.length === 0) {
    console.log('⚠️  No DENTIST users found. Creating mock data first...');
    console.log('   Run: npx tsx scripts/create-dental-mock-data.ts');
    return;
  }

  let totalXraysCreated = 0;

  for (const user of dentistUsers) {
    console.log(`\n👤 Processing user: ${user.email} (${user.id})`);

    // Find all leads for this user
    const leads = await prisma.lead.findMany({
      where: { userId: user.id },
    });

    console.log(`   Found ${leads.length} patients`);

    for (const lead of leads) {
      // Check if lead already has X-rays
      const existingXrays = await prisma.dentalXRay.findMany({
        where: { leadId: lead.id },
      });

      if (existingXrays.length > 0) {
        console.log(`   ✅ ${lead.contactPerson} already has ${existingXrays.length} X-ray(s)`);
        continue;
      }

      // Create 2-3 X-rays for this patient
      const numXrays = Math.floor(Math.random() * 2) + 2; // 2-3 X-rays
      const xrayTypes = ['PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'];
      
      for (let i = 0; i < numXrays; i++) {
        const xrayType = xrayTypes[Math.floor(Math.random() * xrayTypes.length)];
        const teethIncluded = Array.from({ length: Math.floor(Math.random() * 8) + 4 }, () => 
          Math.floor(Math.random() * 32) + 1
        ).map(String);

        // Randomly decide if this X-ray has AI analysis
        const hasAI = Math.random() > 0.3; // 70% chance

        const analysisTemplates = [
          {
            findings: 'No significant findings detected. All teeth appear healthy with normal bone structure.',
            confidence: 0.92,
            recommendations: 'Continue regular dental hygiene practices.',
          },
          {
            findings: 'Minor caries detected on tooth #3 and #14. Early stage intervention recommended.',
            confidence: 0.88,
            recommendations: 'Schedule follow-up appointment for treatment planning.',
          },
          {
            findings: 'Periodontal bone loss observed in lower molars. Recommend periodontal evaluation.',
            confidence: 0.85,
            recommendations: 'Consider periodontal treatment and improved oral hygiene.',
          },
        ];

        const selectedAnalysis = analysisTemplates[Math.floor(Math.random() * analysisTemplates.length)];

        await prisma.dentalXRay.create({
          data: {
            leadId: lead.id,
            userId: user.id,
            dicomFile: `mock/dicom/${lead.id}-${i}.dcm`,
            imageUrl: MOCK_XRAY_IMAGE_URLS[Math.floor(Math.random() * MOCK_XRAY_IMAGE_URLS.length)],
            previewUrl: MOCK_XRAY_IMAGE_URLS[Math.floor(Math.random() * MOCK_XRAY_IMAGE_URLS.length)],
            thumbnailUrl: MOCK_XRAY_IMAGE_URLS[Math.floor(Math.random() * MOCK_XRAY_IMAGE_URLS.length)],
            xrayType,
            teethIncluded,
            dateTaken: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000), // Stagger dates
            aiAnalysis: hasAI ? {
              ...selectedAnalysis,
              model: 'gpt-4-vision',
            } : null,
            aiAnalyzedAt: hasAI ? new Date() : null,
            aiModel: hasAI ? 'gpt-4-vision' : null,
            notes: `Mock X-ray for testing - ${xrayType}`,
          },
        });

        totalXraysCreated++;
      }

      console.log(`   ✅ Created ${numXrays} X-rays for ${lead.contactPerson}`);
    }
  }

  console.log(`\n✅ Complete! Created ${totalXraysCreated} X-rays total.`);
  console.log('\n💡 Now all patients should show X-ray previews in the dashboard!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
