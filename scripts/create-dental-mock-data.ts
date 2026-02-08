/**
 * Create Mock Dental Data Script
 * 
 * Creates comprehensive mock data for testing all dental management features:
 * - Mock patients (leads) with dental-specific fields
 * - Odontogram data
 * - Periodontal charts
 * - Treatment plans
 * - Procedures
 * - Forms and form responses
 * - X-ray records (with mock image URLs)
 * - Documents
 * - RAMQ claims
 * - Signatures
 * 
 * All mock data is tagged with "MOCK_DATA" tag for easy deletion.
 * 
 * Usage: npx tsx scripts/create-dental-mock-data.ts
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const prisma = new PrismaClient();

// Mock data tag - used to identify and delete mock data
const MOCK_DATA_TAG = 'MOCK_DATA';

// Mock patient data
const mockPatients = [
  {
    contactPerson: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '514-555-0101',
    businessName: 'Jean Dupont',
    address: '123 Rue Saint-Denis',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H2X 3K4',
    country: 'Canada',
    dateOfBirth: new Date('1985-05-15'),
    dentalHistory: {
      allergies: ['Penicillin', 'Latex'],
      medications: ['Aspirin 81mg daily'],
      medicalConditions: ['Hypertension'],
      previousSurgeries: ['Wisdom teeth extraction (2010)'],
      lastDentalVisit: '2023-12-01',
      notes: 'Regular patient, good oral hygiene',
      tags: [MOCK_DATA_TAG],
    },
    insuranceInfo: {
      provider: 'RAMQ',
      ramqNumber: 'DUPO85051501',
      policyNumber: 'RAMQ-123456',
      coverage: 80,
      annualMaximum: 2000,
      remainingBalance: 1500,
      tags: [MOCK_DATA_TAG],
    },
    familyGroupId: 'family-dupont',
  },
  {
    contactPerson: 'Marie Tremblay',
    email: 'marie.tremblay@example.com',
    phone: '514-555-0102',
    businessName: 'Marie Tremblay',
    address: '456 Boulevard René-Lévesque',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H3B 2M7',
    country: 'Canada',
    dateOfBirth: new Date('1992-08-22'),
    dentalHistory: {
      allergies: [],
      medications: ['Birth control'],
      medicalConditions: [],
      previousSurgeries: [],
      lastDentalVisit: '2024-01-15',
      notes: 'New patient, needs orthodontic consultation',
      tags: [MOCK_DATA_TAG],
    },
    insuranceInfo: {
      provider: 'Sun Life',
      policyNumber: 'SL-789012',
      coverage: 70,
      annualMaximum: 1500,
      remainingBalance: 1200,
      tags: [MOCK_DATA_TAG],
    },
    familyGroupId: null,
  },
  {
    contactPerson: 'Pierre Gagnon',
    email: 'pierre.gagnon@example.com',
    phone: '514-555-0103',
    businessName: 'Pierre Gagnon',
    address: '789 Avenue du Parc',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H2V 4J8',
    country: 'Canada',
    dateOfBirth: new Date('1978-11-30'),
    dentalHistory: {
      allergies: ['Sulfa drugs'],
      medications: ['Metformin', 'Lisinopril'],
      medicalConditions: ['Type 2 Diabetes', 'Hypertension'],
      previousSurgeries: ['Root canal #14 (2015)', 'Crown #15 (2015)'],
      lastDentalVisit: '2023-11-20',
      notes: 'Diabetic patient, requires special care',
      tags: [MOCK_DATA_TAG],
    },
    insuranceInfo: {
      provider: 'RAMQ',
      ramqNumber: 'GAGN78113002',
      policyNumber: 'RAMQ-234567',
      coverage: 80,
      annualMaximum: 2000,
      remainingBalance: 800,
      tags: [MOCK_DATA_TAG],
    },
    familyGroupId: null,
  },
  {
    contactPerson: 'Sophie Martin',
    email: 'sophie.martin@example.com',
    phone: '514-555-0104',
    businessName: 'Sophie Martin',
    address: '321 Rue Sherbrooke',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H3A 1G4',
    country: 'Canada',
    dateOfBirth: new Date('2000-03-10'),
    dentalHistory: {
      allergies: [],
      medications: [],
      medicalConditions: [],
      previousSurgeries: [],
      lastDentalVisit: '2024-02-01',
      notes: 'Teenage patient, braces candidate',
      tags: [MOCK_DATA_TAG],
    },
    insuranceInfo: {
      provider: 'Blue Cross',
      policyNumber: 'BC-345678',
      coverage: 75,
      annualMaximum: 1800,
      remainingBalance: 1800,
      tags: [MOCK_DATA_TAG],
    },
    familyGroupId: null,
  },
  {
    contactPerson: 'Luc Lavoie',
    email: 'luc.lavoie@example.com',
    phone: '514-555-0105',
    businessName: 'Luc Lavoie',
    address: '654 Rue de la Commune',
    city: 'Montreal',
    state: 'QC',
    zipCode: 'H2Y 1A1',
    country: 'Canada',
    dateOfBirth: new Date('1995-07-18'),
    dentalHistory: {
      allergies: ['Ibuprofen'],
      medications: [],
      medicalConditions: [],
      previousSurgeries: ['Wisdom teeth extraction (2018)'],
      lastDentalVisit: '2023-10-10',
      notes: 'Regular cleanings, good oral health',
      tags: [MOCK_DATA_TAG],
    },
    insuranceInfo: {
      provider: 'RAMQ',
      ramqNumber: 'LAVO95071803',
      policyNumber: 'RAMQ-456789',
      coverage: 80,
      annualMaximum: 2000,
      remainingBalance: 1900,
      tags: [MOCK_DATA_TAG],
    },
    familyGroupId: null,
  },
];

// CDT Procedure codes for mock data
const CDT_CODES = [
  { code: 'D0120', name: 'Periodic oral evaluation', cost: 75 },
  { code: 'D0150', name: 'Comprehensive oral evaluation', cost: 150 },
  { code: 'D1110', name: 'Adult prophylaxis (cleaning)', cost: 120 },
  { code: 'D1120', name: 'Child prophylaxis', cost: 90 },
  { code: 'D0210', name: 'Intraoral - complete series', cost: 150 },
  { code: 'D0220', name: 'Intraoral - periapical first film', cost: 25 },
  { code: 'D0270', name: 'Bitewing - single film', cost: 30 },
  { code: 'D0272', name: 'Bitewing - two films', cost: 50 },
  { code: 'D0330', name: 'Panoramic film', cost: 100 },
  { code: 'D1110', name: 'Adult prophylaxis', cost: 120 },
  { code: 'D2140', name: 'Amalgam - one surface, primary', cost: 150 },
  { code: 'D2150', name: 'Amalgam - two surface, primary', cost: 200 },
  { code: 'D2391', name: 'Resin - one surface, anterior', cost: 180 },
  { code: 'D2392', name: 'Resin - two surface, anterior', cost: 250 },
  { code: 'D3310', name: 'Endodontic therapy - anterior', cost: 800 },
  { code: 'D3320', name: 'Endodontic therapy - bicuspid', cost: 900 },
  { code: 'D3330', name: 'Endodontic therapy - molar', cost: 1200 },
  { code: 'D2740', name: 'Crown - porcelain/ceramic', cost: 1200 },
  { code: 'D2750', name: 'Crown - porcelain fused to metal', cost: 1100 },
  { code: 'D6010', name: 'Surgical placement of implant', cost: 2000 },
];

// Mock X-ray types
const XRAY_TYPES = ['PANORAMIC', 'BITEWING', 'PERIAPICAL', 'CEPHALOMETRIC', 'CBCT'];

// Mock image URLs (placeholder - in production these would be real S3 URLs)
const MOCK_XRAY_IMAGE_URLS = [
  'https://via.placeholder.com/800x600/0066CC/FFFFFF?text=Panoramic+X-Ray',
  'https://via.placeholder.com/600x400/009900/FFFFFF?text=Bitewing+X-Ray',
  'https://via.placeholder.com/500x500/CC6600/FFFFFF?text=Periapical+X-Ray',
  'https://via.placeholder.com/700x900/9900CC/FFFFFF?text=Cephalometric+X-Ray',
];

async function main() {
  console.log('🎭 Creating Mock Dental Data...\n');

  // Find or get orthodontist user
  let orthodontistUser = await prisma.user.findUnique({
    where: { email: 'orthodontist@nexrel.com' },
  });

  if (!orthodontistUser) {
    console.log('⚠️  Orthodontist user not found. Please run create-orthodontist-admin.ts first.');
    console.log('   Creating a temporary user for mock data...');
    
    orthodontistUser = await prisma.user.findFirst({
      where: { industry: 'DENTIST' },
    });

    if (!orthodontistUser) {
      console.error('❌ No DENTIST industry user found. Cannot create mock data.');
      return;
    }
  }

  console.log(`✅ Using user: ${orthodontistUser.email} (${orthodontistUser.id})\n`);

  const userId = orthodontistUser.id;
  
  // Get or create a clinic for this user
  let clinic = await prisma.userClinic.findFirst({
    where: { userId },
    include: { clinic: true },
  });
  
  if (!clinic) {
    console.log('📋 Creating default clinic for mock data...');
    const newClinic = await prisma.clinic.create({
      data: {
        name: 'Mock Dental Clinic',
        address: '123 Mock Street',
        city: 'Montreal',
        province: 'QC',
        postalCode: 'H1A 1A1',
        country: 'Canada',
        phone: '514-555-0100',
        email: 'mock@clinic.com',
        timezone: 'America/Montreal',
        currency: 'CAD',
        language: 'en',
      },
    });
    
    await prisma.userClinic.create({
      data: {
        userId,
        clinicId: newClinic.id,
        role: 'OWNER',
        isPrimary: true,
      },
    });
    
    clinic = await prisma.userClinic.findFirst({
      where: { userId, clinicId: newClinic.id },
      include: { clinic: true },
    });
    console.log(`   ✅ Created clinic: ${newClinic.name} (${newClinic.id})`);
  }
  
  const clinicId = clinic!.clinicId;
  console.log(`✅ Using clinic: ${clinic!.clinic.name} (${clinicId})\n`);
  
  const createdLeads: string[] = [];

  // Create mock patients
  console.log('📋 Creating mock patients...');
  for (const patientData of mockPatients) {
    const lead = await prisma.lead.create({
      data: {
        userId,
        contactPerson: patientData.contactPerson,
        email: patientData.email,
        phone: patientData.phone,
        businessName: patientData.businessName,
        address: patientData.address,
        city: patientData.city,
        state: patientData.state,
        zipCode: patientData.zipCode,
        country: patientData.country,
        dateOfBirth: patientData.dateOfBirth,
        dentalHistory: patientData.dentalHistory as any,
        insuranceInfo: patientData.insuranceInfo as any,
        familyGroupId: patientData.familyGroupId,
        tags: [MOCK_DATA_TAG] as any,
        status: 'NEW',
        source: 'mock_data',
      },
    });
    createdLeads.push(lead.id);
    console.log(`   ✅ Created patient: ${patientData.contactPerson} (${lead.id})`);
  }

  console.log(`\n✅ Created ${createdLeads.length} mock patients\n`);

  // Create odontogram data for each patient
  console.log('🦷 Creating odontogram data...');
  for (const leadId of createdLeads) {
    const toothData: any = {};
    
    // Randomly mark some teeth with conditions
    const conditions = ['healthy', 'crown', 'filling', 'caries', 'missing', 'root_canal'];
    const teethToMark = [1, 2, 3, 14, 15, 16, 17, 18, 19, 30, 31, 32];
    
    for (const toothNum of teethToMark) {
      if (Math.random() > 0.5) {
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        toothData[toothNum.toString()] = {
          condition,
          date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          notes: condition === 'crown' ? 'Porcelain crown placed' : condition === 'filling' ? 'Composite filling' : '',
          procedureCode: condition === 'crown' ? 'D2740' : condition === 'filling' ? 'D2391' : null,
        };
      }
    }

    await prisma.dentalOdontogram.create({
      data: {
        leadId,
        userId,
        clinicId,
        toothData,
        chartDate: new Date(),
        chartedBy: orthodontistUser.name || 'Mock Data',
        notes: `Mock odontogram data - ${MOCK_DATA_TAG}`,
      },
    });
    console.log(`   ✅ Created odontogram for lead ${leadId}`);
  }

  // Create periodontal charts
  console.log('\n📊 Creating periodontal charts...');
  for (const leadId of createdLeads) {
    const measurements: any[] = [];
    
    // Create measurements for teeth 1-16 (upper arch)
    for (let tooth = 1; tooth <= 16; tooth++) {
      if (Math.random() > 0.3) {
        measurements.push({
          tooth: tooth.toString(),
          mesial: { pd: Math.floor(Math.random() * 5) + 1, bop: Math.random() > 0.7, recession: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0 },
          buccal: { pd: Math.floor(Math.random() * 5) + 1, bop: Math.random() > 0.7, recession: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0 },
          distal: { pd: Math.floor(Math.random() * 5) + 1, bop: Math.random() > 0.7, recession: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0 },
          lingual: { pd: Math.floor(Math.random() * 5) + 1, bop: Math.random() > 0.7, recession: Math.random() > 0.8 ? Math.floor(Math.random() * 3) : 0 },
          mobility: Math.random() > 0.9 ? Math.floor(Math.random() * 3) + 1 : 0,
        });
      }
    }

    await prisma.dentalPeriodontalChart.create({
      data: {
        leadId,
        userId,
        clinicId,
        measurements,
        chartDate: new Date(),
        chartedBy: orthodontistUser.name || 'Mock Data',
        notes: `Mock periodontal chart - ${MOCK_DATA_TAG}`,
      },
    });
    console.log(`   ✅ Created periodontal chart for lead ${leadId}`);
  }

  // Create treatment plans
  console.log('\n📝 Creating treatment plans...');
  for (let i = 0; i < createdLeads.length; i++) {
    const leadId = createdLeads[i];
    const numPlans = Math.floor(Math.random() * 2) + 1; // 1-2 plans per patient
    
    for (let j = 0; j < numPlans; j++) {
      const procedures = [];
      const numProcedures = Math.floor(Math.random() * 5) + 2; // 2-6 procedures
      let totalCost = 0;
      
      for (let k = 0; k < numProcedures; k++) {
        const cdt = CDT_CODES[Math.floor(Math.random() * CDT_CODES.length)];
        const cost = cdt.cost;
        totalCost += cost;
        
        // Generate 1-3 teeth for this procedure
        const numTeeth = Math.floor(Math.random() * 3) + 1;
        const teethInvolved: string[] = [];
        for (let t = 0; t < numTeeth; t++) {
          teethInvolved.push((Math.floor(Math.random() * 32) + 1).toString());
        }
        
        procedures.push({
          procedureCode: cdt.code,
          description: cdt.name,
          cost,
          sequence: k + 1,
          teethInvolved,
          scheduledDate: new Date(Date.now() + (k + 1) * 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: j === 0 && k === 0 ? 'APPROVED' : 'DRAFT',
        });
      }

      const insuranceCoverage = totalCost * 0.8; // 80% coverage
      const patientResponsibility = totalCost - insuranceCoverage;

      const plan = await prisma.dentalTreatmentPlan.create({
        data: {
          leadId,
          userId,
          clinicId,
          planName: `Treatment Plan ${j + 1} - ${new Date().toLocaleDateString()}`,
          description: `Mock treatment plan - ${MOCK_DATA_TAG}`,
          status: j === 0 ? 'APPROVED' : 'DRAFT',
          procedures,
          totalCost,
          insuranceCoverage,
          patientResponsibility,
          createdDate: new Date(),
          startDate: j === 0 ? new Date() : null,
          patientConsent: j === 0,
          patientConsentDate: j === 0 ? new Date() : null,
        },
      });
      console.log(`   ✅ Created treatment plan for lead ${leadId} (${procedures.length} procedures)`);
    }
  }

  // Create procedures
  console.log('\n⚕️  Creating procedures...');
  for (const leadId of createdLeads) {
    const numProcedures = Math.floor(Math.random() * 5) + 3; // 3-7 procedures
    
    for (let i = 0; i < numProcedures; i++) {
      const cdt = CDT_CODES[Math.floor(Math.random() * CDT_CODES.length)];
      const statuses = ['COMPLETED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)] as any;
      
      // Generate 1-3 teeth for this procedure
      const numTeeth = Math.floor(Math.random() * 3) + 1;
      const teethInvolved: string[] = [];
      for (let t = 0; t < numTeeth; t++) {
        teethInvolved.push((Math.floor(Math.random() * 32) + 1).toString());
      }
      
      await prisma.dentalProcedure.create({
        data: {
          leadId,
          userId,
          clinicId,
          procedureCode: cdt.code,
          procedureName: cdt.name,
          description: `Mock procedure - ${MOCK_DATA_TAG}`,
          teethInvolved,
          status,
          scheduledDate: status === 'SCHEDULED' ? new Date(Date.now() + i * 7 * 24 * 60 * 60 * 1000) : null,
          performedDate: status === 'COMPLETED' ? new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000) : null,
          cost: cdt.cost,
          insuranceCoverage: cdt.cost * 0.8,
          performedBy: orthodontistUser.name || 'Dr. Mock',
          notes: `Mock procedure data - ${MOCK_DATA_TAG}`,
        },
      });
    }
    console.log(`   ✅ Created ${numProcedures} procedures for lead ${leadId}`);
  }

  // Create forms
  console.log('\n📋 Creating forms...');
  const formCategories = ['Medical History', 'Consent', 'Treatment', 'Insurance'];
  const createdForms: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    const formSchema = {
      fields: [
        { type: 'text', label: 'Full Name', required: true, id: 'name' },
        { type: 'date', label: 'Date of Birth', required: true, id: 'dob' },
        { type: 'textarea', label: 'Medical History', required: false, id: 'history' },
        { type: 'checkbox', label: 'I consent to treatment', required: true, id: 'consent' },
      ],
    };

    const form = await prisma.dentalForm.create({
      data: {
        userId,
        clinicId,
        formName: `Mock Form ${i + 1} - ${formCategories[i]}`,
        description: `Mock form template - ${MOCK_DATA_TAG}`,
        category: formCategories[i],
        formSchema,
        isActive: true,
        isDefault: i === 0,
      },
    });
    createdForms.push(form.id);
    console.log(`   ✅ Created form: ${form.formName}`);
  }

  // Create form responses (multiple responses per patient for better testing)
  console.log('\n✍️  Creating form responses...');
  for (let i = 0; i < createdLeads.length; i++) {
    const leadId = createdLeads[i];
    // Create 2-3 form responses per patient
    const numResponses = Math.floor(Math.random() * 2) + 2;
    
    for (let r = 0; r < numResponses; r++) {
      const formId = createdForms[Math.floor(Math.random() * createdForms.length)];
      
      const responseData = {
        name: mockPatients[i].contactPerson,
        dob: mockPatients[i].dateOfBirth.toISOString().split('T')[0],
        history: r === 0 ? 'No significant medical history' : 'Previous orthodontic treatment in childhood',
        consent: true,
      };

      await prisma.dentalFormResponse.create({
        data: {
          leadId,
          userId,
          clinicId,
          formId,
          responseData,
          submittedAt: new Date(Date.now() - r * 7 * 24 * 60 * 60 * 1000),
          submittedBy: mockPatients[i].contactPerson,
          signatureData: {
            signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            signedBy: mockPatients[i].contactPerson,
            signedAt: new Date(Date.now() - r * 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: `Mock signature - ${MOCK_DATA_TAG}`,
          },
        },
      });
    }
    console.log(`   ✅ Created ${numResponses} form responses for lead ${leadId}`);
  }

  // Create X-rays (ensure every patient has at least 2 X-rays)
  console.log('\n📷 Creating X-ray records...');
  for (const leadId of createdLeads) {
    const numXrays = Math.floor(Math.random() * 3) + 2; // 2-4 X-rays per patient
    
    for (let i = 0; i < numXrays; i++) {
      const xrayType = XRAY_TYPES[Math.floor(Math.random() * XRAY_TYPES.length)];
      const teethIncluded = [];
      const numTeeth = Math.floor(Math.random() * 8) + 2; // 2-9 teeth
      for (let j = 0; j < numTeeth; j++) {
        teethIncluded.push((Math.floor(Math.random() * 32) + 1).toString());
      }

      const hasAI = Math.random() > 0.2; // 80% have AI analysis for better testing
      
      // Create more varied AI analysis
      const analysisTemplates = [
        {
          findings: 'No significant abnormalities detected. Normal bone structure and tooth alignment.',
          confidence: 0.92,
          recommendations: 'Continue regular monitoring. No immediate treatment required.',
        },
        {
          findings: 'Mild crowding observed in anterior region. Consider orthodontic evaluation.',
          confidence: 0.88,
          recommendations: 'Schedule consultation for orthodontic treatment options.',
        },
        {
          findings: 'Early signs of periodontal bone loss detected in posterior region.',
          confidence: 0.85,
          recommendations: 'Recommend periodontal treatment and regular monitoring.',
        },
        {
          findings: 'Impacted third molar detected. No immediate intervention required.',
          confidence: 0.90,
          recommendations: 'Monitor for symptoms. Consider extraction if symptomatic.',
        },
        {
          findings: 'Excellent bone density and root structure. No concerns identified.',
          confidence: 0.95,
          recommendations: 'Continue excellent oral hygiene practices.',
        },
      ];
      
      const selectedAnalysis = analysisTemplates[Math.floor(Math.random() * analysisTemplates.length)];
      
      await prisma.dentalXRay.create({
        data: {
          leadId,
          userId,
          dicomFile: `mock/dicom/${leadId}-${i}.dcm`,
          imageFile: `mock/images/${leadId}-${i}.jpg`,
          imageUrl: MOCK_XRAY_IMAGE_URLS[Math.floor(Math.random() * MOCK_XRAY_IMAGE_URLS.length)],
          xrayType,
          teethIncluded,
          dateTaken: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000),
          aiAnalysis: hasAI ? {
            ...selectedAnalysis,
            model: 'gpt-4-vision',
            tags: [MOCK_DATA_TAG],
          } : null,
          aiAnalyzedAt: hasAI ? new Date() : null,
          aiModel: hasAI ? 'gpt-4-vision' : null,
          notes: `Mock X-ray data - ${MOCK_DATA_TAG}`,
        },
      });
    }
    console.log(`   ✅ Created ${numXrays} X-rays for lead ${leadId}`);
  }

  // Create documents
  console.log('\n📄 Creating documents...');
  for (const leadId of createdLeads) {
    // Use valid DocumentType enum values from schema
    const documentTypes = ['CONSENT_FORM', 'INSURANCE_FORM', 'TREATMENT_PLAN', 'XRAY', 'MEDICAL_HISTORY', 'INVOICE'] as const;
    const numDocs = Math.floor(Math.random() * 3) + 2; // 2-4 documents
    
    for (let i = 0; i < numDocs; i++) {
      const docType = documentTypes[Math.floor(Math.random() * documentTypes.length)];
      const retentionExpiry = new Date();
      retentionExpiry.setFullYear(retentionExpiry.getFullYear() + 7); // 7 years retention
      
      const categoryMap: Record<string, string> = {
        'CONSENT_FORM': 'Consent Form',
        'INSURANCE_FORM': 'Insurance',
        'TREATMENT_PLAN': 'Treatment Plan',
        'XRAY': 'X-Ray Report',
        'MEDICAL_HISTORY': 'Medical History',
        'INVOICE': 'Invoice',
      };
      
      await prisma.patientDocument.create({
        data: {
          userId,
          leadId,
          documentType: docType,
          category: categoryMap[docType] || 'Other',
          fileName: `mock-${docType.toLowerCase().replace('_', '-')}-${i + 1}.pdf`,
          fileType: 'application/pdf',
          fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
          encryptedStoragePath: `mock/storage/${leadId}/${docType}-${i + 1}.enc`,
          encryptionKeyId: `mock-key-${leadId}`,
          dataResidency: 'CA-QC',
          retentionPolicy: 'MEDICAL_7_YEARS',
          retentionExpiry,
          accessLevel: 'RESTRICTED',
          createdBy: orthodontistUser.id,
          tags: [MOCK_DATA_TAG],
          description: `Mock ${categoryMap[docType]} document - ${MOCK_DATA_TAG}`,
          metadata: {
            tags: [MOCK_DATA_TAG],
            mockData: true,
          },
        },
      });
    }
    console.log(`   ✅ Created ${numDocs} documents for lead ${leadId}`);
  }

  // Create RAMQ claims (stored in Lead.insuranceInfo)
  console.log('\n🏥 Creating RAMQ claims...');
  for (let i = 0; i < createdLeads.length; i++) {
    const leadId = createdLeads[i];
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    
    if (lead && (lead.insuranceInfo as any)?.provider === 'RAMQ') {
      const insuranceInfo = (lead.insuranceInfo as any) || {};
      if (!insuranceInfo.ramqClaims) {
        insuranceInfo.ramqClaims = [];
      }

      const numClaims = Math.floor(Math.random() * 3) + 1; // 1-3 claims
      const statuses = ['DRAFT', 'SUBMITTED', 'APPROVED', 'PAID', 'REJECTED'];
      
      for (let j = 0; j < numClaims; j++) {
        const cdt = CDT_CODES[Math.floor(Math.random() * CDT_CODES.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        const claim = {
          id: `claim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          claimNumber: status !== 'DRAFT' ? `RAMQ-${Math.floor(Math.random() * 1000000)}` : null,
          patientName: lead.contactPerson || lead.businessName,
          patientRAMQNumber: insuranceInfo.ramqNumber || 'MOCK-RAMQ-001',
          procedureCode: cdt.code,
          procedureName: cdt.name,
          serviceDate: new Date(Date.now() - j * 30 * 24 * 60 * 60 * 1000).toISOString(),
          amount: cdt.cost,
          status,
          submissionDate: status !== 'DRAFT' ? new Date(Date.now() - j * 25 * 24 * 60 * 60 * 1000).toISOString() : null,
          responseDate: ['APPROVED', 'REJECTED', 'PAID'].includes(status) ? new Date(Date.now() - j * 20 * 24 * 60 * 60 * 1000).toISOString() : null,
          rejectionReason: status === 'REJECTED' ? 'Missing documentation' : null,
          notes: `Mock RAMQ claim - ${MOCK_DATA_TAG}`,
          createdAt: new Date(Date.now() - j * 30 * 24 * 60 * 60 * 1000).toISOString(),
        };

        insuranceInfo.ramqClaims.push(claim);
      }

      await prisma.lead.update({
        where: { id: leadId },
        data: { insuranceInfo },
      });
      console.log(`   ✅ Created ${numClaims} RAMQ claims for lead ${leadId}`);
    }
  }

  console.log('\n✅ Mock dental data creation complete!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Patients: ${createdLeads.length}`);
  console.log(`   - Odontograms: ${createdLeads.length}`);
  console.log(`   - Periodontal Charts: ${createdLeads.length}`);
  console.log(`   - Treatment Plans: ${createdLeads.length * 2} (approx)`);
  console.log(`   - Procedures: ${createdLeads.length * 5} (approx)`);
  console.log(`   - Forms: ${createdForms.length}`);
  console.log(`   - Form Responses: ${createdLeads.length}`);
  console.log(`   - X-rays: ${createdLeads.length * 3} (approx)`);
  console.log(`   - Documents: ${createdLeads.length * 3} (approx)`);
  console.log(`\n🗑️  To delete all mock data, run: npx tsx scripts/delete-dental-mock-data.ts`);
}

main()
  .catch((e) => {
    console.error('❌ Error creating mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
