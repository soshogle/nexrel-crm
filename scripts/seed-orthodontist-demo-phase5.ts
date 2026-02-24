/**
 * Orthodontist Demo - Phase 5: Clinical & Administrative Dashboards
 * Creates: Odontograms, PeriodontalCharts, TreatmentPlans, Procedures, Forms, FormResponses,
 *          XRays (metadata), LabOrders, InsuranceClaims, BookingAppointments, PatientDocuments
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

const PROCEDURE_CODES = [
  { code: 'D0120', name: 'Periodic oral evaluation' },
  { code: 'D0150', name: 'Comprehensive oral evaluation' },
  { code: 'D0330', name: 'Panoramic radiographic image' },
  { code: 'D8080', name: 'Comprehensive orthodontic treatment' },
  { code: 'D8090', name: 'Comprehensive orthodontic treatment - adolescent' },
  { code: 'D8210', name: 'Removable appliance therapy' },
  { code: 'D8220', name: 'Fixed appliance therapy' },
  { code: 'D8660', name: 'Pre-orthodontic visit' },
  { code: 'D8670', name: 'Periodic orthodontic treatment visit' },
];

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
  console.log('🌱 Orthodontist Demo - Phase 5: Clinical & Admin Dashboards\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }

  const clinic = await prisma.clinic.findFirst({
    where: { userMemberships: { some: { userId: user.id } } },
  });
  if (!clinic) {
    console.error('❌ No clinic found. Run Phase 1 first.');
    process.exit(1);
  }

  const leads = await prisma.lead.findMany({ where: { userId: user.id }, take: 50 });
  const appointmentTypes = await prisma.appointmentType.findMany({ where: { userId: user.id }, take: 8 });
  if (leads.length === 0 || appointmentTypes.length === 0) {
    console.error('❌ No leads or appointment types. Run Phases 1-2 first.');
    process.exit(1);
  }

  console.log(`✅ Found clinic, ${leads.length} leads, ${appointmentTypes.length} appointment types\n`);

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const threeMonthsAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Clean Phase 5 data
  console.log('🧹 Cleaning existing clinical data...');
  await prisma.patientDocument.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalInsuranceClaim.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalLabOrder.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalFormResponse.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalProcedure.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalTreatmentPlan.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalXRay.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalPeriodontalChart.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalOdontogram.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.dentalForm.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.bookingAppointment.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  // ─── 1. Dental Forms ───────────────────────────────────────────────────────
  console.log('📋 Creating dental forms...');
  const forms = await Promise.all([
    prisma.dentalForm.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        formName: 'Medical History',
        description: 'Patient medical history and allergies',
        category: 'Medical History',
        formSchema: { fields: [{ type: 'text', label: 'Allergies', required: false }, { type: 'text', label: 'Medications', required: false }] },
        isActive: true,
      },
    }),
    prisma.dentalForm.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        formName: 'Treatment Consent',
        description: 'Consent for orthodontic treatment',
        category: 'Consent',
        formSchema: { fields: [{ type: 'checkbox', label: 'I consent to treatment', required: true }] },
        isActive: true,
      },
    }),
    prisma.dentalForm.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        formName: 'New Patient Intake',
        description: 'New patient information',
        category: 'Intake',
        formSchema: { fields: [{ type: 'text', label: 'Chief complaint', required: true }] },
        isActive: true,
      },
    }),
  ]);
  console.log(`   ✓ Created ${forms.length} forms\n`);

  // ─── 2. Form Responses ─────────────────────────────────────────────────────
  console.log('📝 Creating form responses...');
  let formRespCount = 0;
  for (let i = 0; i < 35; i++) {
    const lead = leads[i % leads.length];
    const form = randomElement(forms);
    await prisma.dentalFormResponse.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        formId: form.id,
        responseData: { allergies: 'None', medications: 'None', consent: true },
        submittedBy: 'Patient',
        signatureData: { signedBy: lead.contactPerson, signedAt: new Date().toISOString() },
      },
    });
    formRespCount++;
  }
  console.log(`   ✓ Created ${formRespCount} form responses\n`);

  // ─── 3. Treatment Plans & Procedures ───────────────────────────────────────
  console.log('📄 Creating treatment plans and procedures...');
  const planNames = ['Comprehensive Braces', 'Invisalign Full', 'Phase 1 Treatment', 'Retainer Phase', 'Adult Orthodontics'];
  const treatmentPlans: { id: string; leadId: string }[] = [];
  for (let i = 0; i < 25; i++) {
    const lead = leads[i % leads.length];
    const planName = randomElement(planNames);
    const totalCost = randomInt(3500, 8500);
    const plan = await prisma.dentalTreatmentPlan.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        planName,
        description: `Orthodontic treatment plan for ${lead.contactPerson}`,
        status: randomElement(['DRAFT', 'APPROVED', 'IN_PROGRESS', 'COMPLETED'] as const),
        procedures: [
          { procedureCode: 'D0120', description: 'Initial exam', cost: 150, sequence: 1 },
          { procedureCode: 'D0330', description: 'Panoramic X-ray', cost: 120, sequence: 2 },
          { procedureCode: 'D8080', description: 'Full treatment', cost: totalCost - 270, sequence: 3 },
        ],
        totalCost,
        insuranceCoverage: totalCost * 0.3,
        patientResponsibility: totalCost * 0.7,
        patientConsent: Math.random() > 0.3,
        createdDate: randomDate(sixMonthsAgo, now),
      },
    });
    treatmentPlans.push(plan);

    const proc = randomElement(PROCEDURE_CODES);
    await prisma.dentalProcedure.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        treatmentPlanId: plan.id,
        procedureCode: proc.code,
        procedureName: proc.name,
        teethInvolved: ['8', '9', '24', '25'],
        status: randomElement(['SCHEDULED', 'COMPLETED', 'IN_PROGRESS'] as const),
        scheduledDate: randomDate(now, threeMonthsAhead),
        performedDate: Math.random() > 0.5 ? randomDate(sixMonthsAgo, now) : null,
        cost: randomInt(100, 500),
        performedBy: user.name || 'Dr. Smith',
      },
    });
  }
  console.log(`   ✓ Created ${treatmentPlans.length} treatment plans with procedures\n`);

  // ─── 4. Odontograms & Periodontal Charts ────────────────────────────────────
  console.log('🦷 Creating odontograms and periodontal charts...');
  const buildToothData = () => {
    const toothData: Record<string, { condition: string; date?: string; treatment?: string; completed?: boolean }> = {};
    for (let t = 1; t <= 32; t++) {
      if (t === 3) toothData[String(t)] = { condition: 'filling', treatment: 'Filling', completed: false, date: '2024-01-15' };
      else if (t === 14) toothData[String(t)] = { condition: 'caries', treatment: 'Crown', completed: false, date: '2024-01-15' };
      else if ([20, 29, 30].includes(t)) toothData[String(t)] = { condition: 'implant', treatment: 'Implant', completed: true, date: '2024-01-15' };
      else if (t === 32) toothData[String(t)] = { condition: 'crown', treatment: 'Crown', completed: false, date: '2024-01-15' };
      else toothData[String(t)] = { condition: 'healthy', date: '2024-01-15' };
    }
    return toothData;
  };
  const buildMeasurements = () => {
    const m: Record<string, { mesial: { pd: number; bop: boolean }; buccal: { pd: number; bop: boolean }; distal: { pd: number; bop: boolean }; lingual: { pd: number; bop: boolean } }> = {};
    for (let t = 1; t <= 32; t++) {
      const pd = t <= 16 ? 2 + (t % 3) : 2 + ((t - 17) % 3);
      m[String(t)] = { mesial: { pd, bop: t % 5 === 0 }, buccal: { pd, bop: false }, distal: { pd, bop: false }, lingual: { pd, bop: false } };
    }
    return m;
  };

  for (let i = 0; i < 20; i++) {
    const lead = leads[i % leads.length];
    await prisma.dentalOdontogram.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        toothData: buildToothData(),
        chartedBy: user.name || 'Staff',
        notes: 'Initial charting',
        chartDate: randomDate(sixMonthsAgo, now),
      },
    });
    await prisma.dentalPeriodontalChart.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        measurements: buildMeasurements(),
        chartedBy: user.name || 'Staff',
        chartDate: randomDate(sixMonthsAgo, now),
      },
    });
  }
  console.log('   ✓ Created 20 odontograms, 20 periodontal charts\n');

  // ─── 5. X-Rays (metadata only) ──────────────────────────────────────────────
  console.log('📷 Creating X-ray records...');
  const xrayTypes = ['PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC'];
  let xrayCount = 0;
  try {
    for (let i = 0; i < 15; i++) {
      const lead = leads[i % leads.length];
      await prisma.dentalXRay.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          clinicId: clinic.id,
          xrayType: randomElement(xrayTypes),
          teethIncluded: ['1', '2', '3', '14', '15', '16'],
          dateTaken: randomDate(sixMonthsAgo, now),
          notes: 'Routine orthodontic records',
          aiAnalysis: { findings: 'No significant pathology. Adequate bone support.', confidence: 0.92 },
          aiAnalyzedAt: new Date(),
        },
      });
      xrayCount++;
    }
    console.log(`   ✓ Created ${xrayCount} X-ray records\n`);
  } catch (e: unknown) {
    const err = e as { meta?: { column?: string } };
    if (err?.meta?.column?.includes('thumbnailUrl') || err?.meta?.column?.includes('DentalXRay')) {
      console.log('   ⚠️  X-ray creation skipped (schema mismatch - run migrate-all-dbs)\n');
    } else {
      throw e;
    }
  }

  // ─── 6. Lab Orders ─────────────────────────────────────────────────────────
  console.log('🔬 Creating lab orders...');
  for (let i = 0; i < 12; i++) {
    const lead = leads[i % leads.length];
    const plan = treatmentPlans[i % treatmentPlans.length];
    await prisma.dentalLabOrder.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        treatmentPlanId: plan.leadId === lead.id ? plan.id : null,
        orderNumber: `LAB-2024-${String(1000 + i).padStart(4, '0')}`,
        labName: randomElement(['Dental Lab Montreal', 'Ortho Lab QC', 'Precision Ortho Lab']),
        orderType: randomElement(['ORTHODONTIC', 'RETAINER', 'NIGHT_GUARD'] as const),
        description: 'Retainer / appliance',
        patientInfo: { name: lead.contactPerson, dob: '1990-01-01' },
        status: randomElement(['PENDING', 'SUBMITTED', 'IN_PROGRESS', 'DELIVERED'] as const),
        cost: randomInt(150, 400),
        submittedAt: Math.random() > 0.3 ? randomDate(sixMonthsAgo, now) : null,
      },
    });
  }
  console.log('   ✓ Created 12 lab orders\n');

  // ─── 7. Insurance Claims ─────────────────────────────────────────────────────
  console.log('💳 Creating insurance claims...');
  for (let i = 0; i < 15; i++) {
    const lead = leads[i % leads.length];
    const plan = treatmentPlans[i % treatmentPlans.length];
    const totalAmount = randomInt(500, 3000);
    await prisma.dentalInsuranceClaim.create({
      data: {
        leadId: lead.id,
        userId: user.id,
        clinicId: clinic.id,
        treatmentPlanId: plan.leadId === lead.id ? plan.id : null,
        claimNumber: `CLM-2024-${String(5000 + i).padStart(5, '0')}`,
        insuranceType: randomElement(['RAMQ', 'PRIVATE', 'BOTH'] as const),
        providerName: randomElement(['Sun Life', 'Blue Cross', 'RAMQ', 'Manulife']),
        policyNumber: `POL-${randomInt(100000, 999999)}`,
        patientInfo: { name: lead.contactPerson },
        procedures: [{ procedureCode: 'D8080', description: 'Ortho treatment', cost: totalAmount, dateOfService: new Date().toISOString() }],
        totalAmount,
        submittedAmount: totalAmount,
        estimatedCoverage: totalAmount * 0.5,
        patientResponsibility: totalAmount * 0.5,
        status: randomElement(['DRAFT', 'SUBMITTED', 'PROCESSING', 'APPROVED', 'PAID'] as const),
        submittedAt: Math.random() > 0.4 ? randomDate(sixMonthsAgo, now) : null,
      },
    });
  }
  console.log('   ✓ Created 15 insurance claims\n');

  // ─── 8. Booking Appointments ─────────────────────────────────────────────────
  console.log('📅 Creating appointments...');
  const apptStatuses = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'NO_SHOW'] as const;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
  for (let i = 0; i < 5; i++) {
    const lead = leads[i % leads.length];
    const aptType = randomElement(appointmentTypes);
    const apptDate = new Date(todayStart.getTime() + i * 60 * 60 * 1000);
    await prisma.bookingAppointment.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        leadId: lead.id,
        appointmentTypeId: aptType.id,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'patient@example.com',
        customerPhone: lead.phone || '+1 514-555-0000',
        appointmentDate: apptDate,
        duration: aptType.duration,
        status: 'SCHEDULED',
        notes: "Today's appointment",
        reminderSent: false,
        confirmationSent: true,
        meetingType: 'IN_PERSON',
      },
    });
  }
  for (let i = 0; i < 40; i++) {
    const lead = leads[i % leads.length];
    const aptType = randomElement(appointmentTypes);
    const isPast = i < 25;
    const apptDate = isPast ? randomDate(sixMonthsAgo, now) : randomDate(now, threeMonthsAhead);
    await prisma.bookingAppointment.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        leadId: lead.id,
        appointmentTypeId: aptType.id,
        customerName: lead.contactPerson || lead.businessName,
        customerEmail: lead.email || 'patient@example.com',
        customerPhone: lead.phone || '+1 514-555-0000',
        appointmentDate: apptDate,
        duration: aptType.duration,
        status: isPast ? randomElement(['COMPLETED', 'COMPLETED', 'NO_SHOW']) : randomElement(['SCHEDULED', 'CONFIRMED']),
        notes: 'Orthodontic appointment',
        reminderSent: isPast,
        confirmationSent: isPast,
        meetingType: 'IN_PERSON',
      },
    });
  }
  const apptCount = await prisma.bookingAppointment.count({ where: { userId: user.id } });
  console.log(`   ✓ Created ${apptCount} appointments\n`);

  // ─── 8b. Ensure RAMQ claims in Lead.insuranceInfo (for dental dashboard stats) ─
  console.log('💳 Ensuring RAMQ claims in lead insuranceInfo...');
  let ramqUpdated = 0;
  for (let i = 0; i < 12; i++) {
    const lead = leads[i];
    const info = (lead.insuranceInfo as Record<string, unknown>) || {};
    if (!info.ramqClaims || !Array.isArray(info.ramqClaims)) {
      info.ramqClaims = [{ id: `claim-demo-${lead.id}`, patientName: lead.contactPerson, patientRAMQNumber: `QC${randomInt(1000000, 9999999)}`, procedureCode: 'D8080', procedureName: 'Ortho treatment', serviceDate: new Date().toISOString(), amount: randomInt(500, 2000), status: randomElement(['DRAFT', 'SUBMITTED'] as const), submissionDate: null, responseDate: null, rejectionReason: null, notes: null, createdAt: new Date().toISOString() }];
      info.ramqNumber = info.ramqNumber || `QC${randomInt(1000000, 9999999)}`;
      await prisma.lead.update({ where: { id: lead.id }, data: { insuranceInfo: info } });
      ramqUpdated++;
    }
  }
  console.log(`   ✓ Updated ${ramqUpdated} leads with RAMQ claims\n`);

  // ─── 9. Patient Documents (metadata) ─────────────────────────────────────────
  console.log('📁 Creating patient document records...');
  const docTypes = ['XRAY', 'CONSENT_FORM', 'INSURANCE_FORM', 'TREATMENT_PLAN', 'MEDICAL_HISTORY'] as const;
  const retentionExpiry = new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000); // 7 years
  for (let i = 0; i < 18; i++) {
    const lead = leads[i % leads.length];
    const docType = randomElement(docTypes);
    await prisma.patientDocument.create({
      data: {
        userId: user.id,
        clinicId: clinic.id,
        leadId: lead.id,
        documentType: docType,
        category: docType.replace('_', ' '),
        fileName: `document-${i + 1}.pdf`,
        fileType: 'application/pdf',
        fileSize: randomInt(50000, 500000),
        encryptedStoragePath: `demo/ca-qc/docs/${lead.id}/${docType}-${i}.enc`,
        encryptionKeyId: 'demo-key-1',
        dataResidency: 'CA-QC',
        retentionPolicy: 'MEDICAL_7_YEARS',
        retentionExpiry,
        createdBy: user.id,
        tags: [docType, 'orthodontist'],
      },
    });
  }
  const docCount = await prisma.patientDocument.count({ where: { clinicId: clinic.id } });
  console.log(`   ✓ Created ${docCount} patient document records\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 5 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Forms: ${forms.length}, Responses: ${formRespCount}`);
  console.log(`   • Treatment plans: ${treatmentPlans.length}, Procedures: 25`);
  console.log(`   • Odontograms: 20, Periodontal charts: 20`);
  console.log(`   • X-rays: 15, Lab orders: 12, Insurance claims: 15`);
  console.log(`   • Appointments: ${apptCount}, Patient documents: ${docCount}`);
  console.log('\n🎉 Run Phase 6 next for referrals, reviews, reports.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
