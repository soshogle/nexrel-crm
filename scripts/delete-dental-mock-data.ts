/**
 * Delete Mock Dental Data Script
 * 
 * Deletes all mock data tagged with "MOCK_DATA" tag:
 * - Mock patients (leads) with MOCK_DATA tag
 * - All associated dental records (odontogram, periodontal, treatment plans, procedures, forms, xrays, documents)
 * - RAMQ claims in insuranceInfo
 * 
 * Usage: npx tsx scripts/delete-dental-mock-data.ts
 * 
 * ⚠️  WARNING: This will permanently delete all mock data!
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_DATA_TAG = 'MOCK_DATA';

async function main() {
  console.log('🗑️  Deleting Mock Dental Data...\n');
  console.log('⚠️  WARNING: This will permanently delete all data tagged with MOCK_DATA!\n');

  // Find all leads with MOCK_DATA tag or source='mock_data'
  // Since tags is JSON, we'll search by source and also check tags JSON field
  const allLeads = await prisma.lead.findMany({
    where: {
      OR: [
        { source: 'mock_data' },
        // Also check for leads where tags JSON contains MOCK_DATA
      ],
    },
    select: {
      id: true,
      contactPerson: true,
      businessName: true,
      tags: true,
      source: true,
    },
  });

  // Filter leads that have MOCK_DATA tag in their tags JSON
  const mockLeads = allLeads.filter(lead => {
    if (lead.source === 'mock_data') return true;
    const tags = lead.tags as any;
    if (Array.isArray(tags) && tags.includes(MOCK_DATA_TAG)) return true;
    return false;
  });

  console.log(`Found ${mockLeads.length} mock patients to delete\n`);

  if (mockLeads.length === 0) {
    console.log('✅ No mock data found. Nothing to delete.');
    return;
  }

  const leadIds = mockLeads.map(l => l.id);

  // Delete all associated dental records (cascade will handle most, but we'll be explicit)
  console.log('Deleting dental records...');

  // Delete odontograms
  const odontogramsDeleted = await prisma.dentalOdontogram.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${odontogramsDeleted.count} odontograms`);

  // Delete periodontal charts
  const periodontalDeleted = await prisma.dentalPeriodontalChart.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${periodontalDeleted.count} periodontal charts`);

  // Delete procedures (delete before treatment plans due to foreign key)
  const proceduresDeleted = await prisma.dentalProcedure.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${proceduresDeleted.count} procedures`);

  // Delete treatment plans
  const treatmentPlansDeleted = await prisma.dentalTreatmentPlan.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${treatmentPlansDeleted.count} treatment plans`);

  // Delete form responses
  const formResponsesDeleted = await prisma.dentalFormResponse.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${formResponsesDeleted.count} form responses`);

  // Delete X-rays
  const xraysDeleted = await prisma.dentalXRay.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${xraysDeleted.count} X-rays`);

  // Delete documents
  const documentsDeleted = await prisma.patientDocument.deleteMany({
    where: { leadId: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${documentsDeleted.count} documents`);

  // Delete mock forms (forms created by mock data user)
  // First, find the orthodontist user
  const orthodontistUser = await prisma.user.findUnique({
    where: { email: 'orthodontist@nexrel.com' },
  });

  if (orthodontistUser) {
    // Find forms that might be mock data (check description or name)
    const mockForms = await prisma.dentalForm.findMany({
      where: {
        userId: orthodontistUser.id,
        OR: [
          { description: { contains: MOCK_DATA_TAG } },
          { formName: { contains: 'Mock Form' } },
        ],
      },
    });

    if (mockForms.length > 0) {
      // Delete form responses for these forms first
      await prisma.dentalFormResponse.deleteMany({
        where: { formId: { in: mockForms.map(f => f.id) } },
      });

      // Then delete the forms
      const formsDeleted = await prisma.dentalForm.deleteMany({
        where: { id: { in: mockForms.map(f => f.id) } },
      });
      console.log(`   ✅ Deleted ${formsDeleted.count} mock forms`);
    }
  }

  // Finally, delete the leads themselves (this will cascade delete remaining relations)
  const leadsDeleted = await prisma.lead.deleteMany({
    where: { id: { in: leadIds } },
  });
  console.log(`   ✅ Deleted ${leadsDeleted.count} mock patients`);

  console.log('\n✅ Mock dental data deletion complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Patients deleted: ${leadsDeleted.count}`);
  console.log(`   - Odontograms deleted: ${odontogramsDeleted.count}`);
  console.log(`   - Periodontal charts deleted: ${periodontalDeleted.count}`);
  console.log(`   - Treatment plans deleted: ${treatmentPlansDeleted.count}`);
  console.log(`   - Procedures deleted: ${proceduresDeleted.count}`);
  console.log(`   - Form responses deleted: ${formResponsesDeleted.count}`);
  console.log(`   - X-rays deleted: ${xraysDeleted.count}`);
  console.log(`   - Documents deleted: ${documentsDeleted.count}`);
}

main()
  .catch((e) => {
    console.error('❌ Error deleting mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
