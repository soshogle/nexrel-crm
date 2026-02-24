/**
 * Orthodontist Demo - Phase 2: Core CRM - Leads, Notes, Messages
 * Creates 50 leads with Quebec addresses, notes, and messages
 * Uses orthodontist DB when DATABASE_URL_ORTHODONTIST is set.
 */

import { prisma, findOrthodontistUser } from './seed-orthodontist-db-helper';

const USER_EMAIL = 'orthodontist@nexrel.com';

// Quebec cities with sample addresses and postal codes
const QUEBEC_LOCATIONS = [
  { city: 'Montreal', state: 'QC', zipPrefix: 'H', zipRange: [1, 4] },
  { city: 'Quebec City', state: 'QC', zipPrefix: 'G', zipRange: [1, 3] },
  { city: 'Laval', state: 'QC', zipPrefix: 'H', zipRange: [7, 9] },
  { city: 'Gatineau', state: 'QC', zipPrefix: 'J', zipRange: [8, 9] },
  { city: 'Longueuil', state: 'QC', zipPrefix: 'J', zipRange: [4, 4] },
  { city: 'Sherbrooke', state: 'QC', zipPrefix: 'J', zipRange: [1, 1] },
  { city: 'Lévis', state: 'QC', zipPrefix: 'G', zipRange: [6, 7] },
  { city: 'Trois-Rivières', state: 'QC', zipPrefix: 'G', zipRange: [8, 9] },
  { city: 'Terrebonne', state: 'QC', zipPrefix: 'J', zipRange: [6, 7] },
  { city: 'Saint-Jean-sur-Richelieu', state: 'QC', zipPrefix: 'J', zipRange: [2, 3] },
  { city: 'Repentigny', state: 'QC', zipPrefix: 'J', zipRange: [5, 6] },
  { city: 'Brossard', state: 'QC', zipPrefix: 'J', zipRange: [4, 4] },
  { city: 'Drummondville', state: 'QC', zipPrefix: 'J', zipRange: [2, 2] },
  { city: 'Saint-Jérôme', state: 'QC', zipPrefix: 'J', zipRange: [7, 7] },
  { city: 'Granby', state: 'QC', zipPrefix: 'J', zipRange: [2, 2] },
];

const LEAD_NAMES = [
  'Marie Tremblay', 'Jean Bouchard', 'Sophie Gagnon', 'Pierre Roy', 'Isabelle Côté',
  'François Lavoie', 'Nathalie Bergeron', 'Michel Leblanc', 'Sylvie Gagné', 'André Morin',
  'Louise Bélanger', 'Daniel Pelletier', 'Caroline Gauthier', 'Marc Lefebvre', 'Julie Fortin',
  'Patrick Martel', 'Chantal Boucher', 'Robert Simard', 'Hélène Beaulieu', 'Claude Ouellet',
  'Denise Cloutier', 'Bernard Mercier', 'Monique Lévesque', 'Gilles Girard', 'Suzanne Boudreau',
  'Jacques Dubois', 'Nicole Rousseau', 'Michelle Arsenault', 'René Villeneuve', 'Diane Lavoie',
  'Alain Turcotte', 'Jocelyne Paquette', 'Serge Gagnon', 'Lise Bouchard', 'Raymond Thibault',
  'Ginette Landry', 'Guy Poirier', 'Claire Fournier', 'Yves Dufour', 'Micheline Breton',
  'Luc St-Pierre', 'Céline Moreau', 'Jean-Pierre Bélanger', 'Lise Gagné', 'Pierre Lavoie',
  'Hélène Roy', 'André Côté', 'Sylvie Bergeron', 'Michel Morin', 'Nathalie Pelletier',
];

const NOTE_TEMPLATES = [
  'Patient interested in Invisalign. Discussed treatment timeline of 18 months.',
  'Consultation completed. Recommended Phase 1 treatment for crowding. Parent to review.',
  'Insurance verified: RAMQ + Sun Life. Coverage confirmed for orthodontic treatment.',
  'Follow-up call scheduled for next week. Patient had questions about retainer care.',
  'Adjustment completed. Lower arch progressing well. Next visit in 6 weeks.',
  'New patient intake. Medical history reviewed. No allergies. Ready for records.',
  'Payment plan set up: $200/month for 24 months. First payment received.',
  'Referred by Dr. Martin (general dentist). Patient has Class II malocclusion.',
  'Emergency visit - broken bracket. Repaired same day. Patient advised on diet.',
  'Retainer check - fit good. Reminded to wear nightly. Follow-up in 3 months.',
  'Treatment plan presented. Total $5,800. Patient considering options.',
  'Called to confirm appointment. Patient confirmed for Tuesday 2pm.',
  'Left voicemail - no answer. Will try again tomorrow morning.',
  'Patient completed new patient forms online. Ready for consultation.',
  'Discussed ceramic braces option. Patient prefers over metal. Quote sent.',
  'Phase 2 treatment started. Upper braces placed. Care instructions given.',
  'Insurance pre-auth submitted. Waiting for approval. ETA 5-7 days.',
  'Patient requested earlier appointment. Moved to 9am slot.',
  'Debonding completed. Retainers fitted. Retention protocol explained.',
  'Family discount applied - second child in treatment. 10% off.',
];

const MESSAGE_TEMPLATES = [
  'Thank you for contacting Montreal Orthodontics! We\'d love to schedule your consultation. When works best for you?',
  'Reminder: Your adjustment appointment is tomorrow at 2pm. Please arrive 10 minutes early.',
  'Your treatment plan is ready for review. Please log in to the patient portal or call us to schedule.',
  'Congratulations on completing your treatment! Don\'t forget to wear your retainer every night.',
  'We have an opening this Thursday at 3pm. Would you like us to book it for you?',
  'Hi! This is Montreal Orthodontics. We\'re calling to confirm your appointment. Reply YES to confirm.',
  'Your insurance pre-authorization has been approved. We can proceed with treatment when you\'re ready.',
  'Quick reminder: brush after every meal and avoid sticky foods. Call us if any brackets feel loose.',
  'Welcome to our practice! Your first appointment is confirmed. We\'ve sent the new patient forms to your email.',
  'Your payment of $200 has been received. Thank you! Next payment due March 15.',
];

const INSURANCE_OPTIONS = [
  { provider: 'RAMQ', policyNumber: 'QC', coverage: 'Basic orthodontic for under 18' },
  { provider: 'Sun Life', policyNumber: 'SL-', coverage: '$2,500 lifetime ortho' },
  { provider: 'Blue Cross', policyNumber: 'BC-', coverage: '50% up to $3,000' },
  { provider: 'Desjardins', policyNumber: 'DJ-', coverage: '$2,000 lifetime' },
  { provider: 'Manulife', policyNumber: 'MF-', coverage: '80% up to $2,500' },
  { provider: 'None', policyNumber: null, coverage: 'Self-pay' },
];

const DENTAL_HISTORY_OPTIONS = [
  { history: 'No prior orthodontic treatment. Good oral hygiene.' },
  { history: 'Previous braces as teen. Relapse - seeking retreatment.' },
  { history: 'Referred for crowding. No extractions needed.' },
  { history: 'Phase 1 complete. Ready for Phase 2.' },
  { history: 'Mild crowding. Patient prefers Invisalign.' },
  { history: 'Class II malocclusion. May need elastics.' },
  { history: 'Impacted canine. Referred from general dentist.' },
  { history: 'Adult patient. Aesthetic concerns. Considering ceramic braces.' },
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

function quebecPhone(): string {
  const areaCodes = ['514', '418', '450', '579', '581', '819', '873'];
  return `+1 (${randomElement(areaCodes)}) ${randomInt(200, 999)}-${randomInt(1000, 9999)}`;
}

function quebecPostal(loc: (typeof QUEBEC_LOCATIONS)[0]): string {
  const num = loc.zipRange[0] * 100 + randomInt(0, 99);
  const letter = String.fromCharCode(65 + randomInt(0, 25));
  return `${loc.zipPrefix}${num.toString().padStart(2, '0')} ${letter}${randomInt(1, 9)}`;
}

async function main() {
  console.log('🌱 Orthodontist Demo - Phase 2: Leads, Notes, Messages\n');
  console.log(`📧 Target user: ${USER_EMAIL}\n`);

  const user = await findOrthodontistUser().catch(() => null);
  if (!user) {
    console.error(`❌ User not found: ${USER_EMAIL}. Run Phase 1 first.`);
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.name}\n`);

  // Clean Phase 2 data - null out leadId on related records first, then delete
  console.log('🧹 Cleaning existing leads, notes, messages...');
  await prisma.note.deleteMany({ where: { lead: { userId: user.id } } });
  await prisma.message.deleteMany({ where: { lead: { userId: user.id } } });
  await prisma.deal.updateMany({ where: { userId: user.id }, data: { leadId: null } });
  await prisma.lead.deleteMany({ where: { userId: user.id } });
  console.log('   ✓ Cleaned\n');

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  // ─── 1. Create 50 Leads (Quebec) ────────────────────────────────────────────
  console.log('👥 Creating 50 leads (Quebec addresses)...');
  const leads: { id: string; contactPerson: string | null; email: string | null }[] = [];
  const contactTypes = ['customer', 'customer', 'customer', 'prospect', 'prospect', 'partner'] as const;
  const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'CONVERTED', 'LOST'] as const;
  const sources = ['Website', 'Referral', 'Walk-in', 'Phone', 'Email Campaign', 'Google Ads', 'Social Media'] as const;
  const tagSets = [
    ['VIP', 'Invisalign'],
    ['Braces', 'Teen'],
    ['Adult', 'Retreatment'],
    ['Phase1'],
    ['Phase2'],
    ['New Patient'],
    ['Referral'],
    ['Insurance Pending'],
    [],
  ];

  for (let i = 0; i < 50; i++) {
    const loc = randomElement(QUEBEC_LOCATIONS);
    const streetNum = randomInt(100, 9999);
    const streetNames = ['Rue Saint-Denis', 'Boulevard Saint-Laurent', 'Avenue du Mont-Royal', 'Rue Sherbrooke', 'Chemin de la Côte-Sainte-Catherine', 'Rue Jean-Talon', 'Avenue Papineau', 'Rue Rachel', 'Boulevard Rosemont', 'Rue Saint-Hubert'];
    const address = `${streetNum} ${randomElement(streetNames)}, ${loc.city}`;
    const contactType = contactTypes[i % contactTypes.length];
    const status = statuses[i % statuses.length];
    const lastContacted = status !== 'NEW' ? randomDate(oneYearAgo, now) : null;
    const insurance = randomElement(INSURANCE_OPTIONS);
    const dentalHist = randomElement(DENTAL_HISTORY_OPTIONS);
    const tags = randomElement(tagSets);
    const leadScore = randomInt(40, 95);
    const nextActions = ['call', 'email', 'sms', 'schedule_followup', 'send_treatment_plan'];

    const lead = await prisma.lead.create({
      data: {
        userId: user.id,
        businessName: `Family ${LEAD_NAMES[i].split(' ')[1]}`,
        contactPerson: LEAD_NAMES[i],
        email: `${LEAD_NAMES[i].toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: quebecPhone(),
        address,
        city: loc.city,
        state: loc.state,
        zipCode: quebecPostal(loc),
        country: 'Canada',
        status,
        source: randomElement(sources),
        contactType,
        tags: tags.length ? tags : [],
        lastContactedAt: lastContacted,
        dateOfBirth: Math.random() > 0.5 ? randomDate(new Date(1980, 0, 1), new Date(2015, 0, 1)) : null,
        leadScore,
        nextAction: status !== 'CONVERTED' && status !== 'LOST' ? randomElement(nextActions) : null,
        nextActionDate: status !== 'CONVERTED' ? randomDate(now, new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) : null,
        dentalHistory: dentalHist,
        insuranceInfo: (() => {
          const base: Record<string, unknown> = insurance.policyNumber ? { provider: insurance.provider, policyNumber: insurance.policyNumber + randomInt(100000, 999999), coverage: insurance.coverage } : {};
          if (insurance.provider === 'RAMQ') {
            base.ramqClaims = [
              { id: `claim-${i}-1`, patientName: LEAD_NAMES[i], patientRAMQNumber: `QC${randomInt(1000000, 9999999)}`, procedureCode: 'D8080', procedureName: 'Ortho treatment', serviceDate: new Date().toISOString(), amount: randomInt(500, 2000), status: randomElement(['DRAFT', 'SUBMITTED', 'DRAFT'] as const), submissionDate: null, responseDate: null, rejectionReason: null, notes: null, createdAt: new Date().toISOString() },
            ];
            base.ramqNumber = `QC${randomInt(1000000, 9999999)}`;
          }
          return Object.keys(base).length ? base : null;
        })(),
        familyGroupId: i < 5 ? 'family-1' : i < 10 ? 'family-2' : null,
        createdAt: randomDate(oneYearAgo, now),
        updatedAt: now,
      },
    });
    leads.push(lead);
  }
  console.log(`   ✓ Created ${leads.length} leads\n`);

  // ─── 2. Create Notes (3-6 per lead) ──────────────────────────────────────────
  console.log('📝 Creating notes...');
  let noteCount = 0;
  for (const lead of leads) {
    const n = randomInt(3, 6);
    for (let i = 0; i < n; i++) {
      const createdAt = randomDate(oneYearAgo, now);
      await prisma.note.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          content: randomElement(NOTE_TEMPLATES),
          createdAt,
          updatedAt: createdAt,
        },
      });
      noteCount++;
    }
  }
  console.log(`   ✓ Created ${noteCount} notes\n`);

  // ─── 3. Create Messages (2-5 per lead) ──────────────────────────────────────
  console.log('💬 Creating messages...');
  let msgCount = 0;
  for (const lead of leads) {
    const n = randomInt(2, 5);
    for (let i = 0; i < n; i++) {
      const createdAt = randomDate(sixMonthsAgo, now);
      await prisma.message.create({
        data: {
          leadId: lead.id,
          userId: user.id,
          content: randomElement(MESSAGE_TEMPLATES),
          messageType: randomElement(['ai_generated', 'manual', 'email', 'sms']),
          isUsed: Math.random() > 0.5,
          createdAt,
          updatedAt: createdAt,
        },
      });
      msgCount++;
    }
  }
  console.log(`   ✓ Created ${msgCount} messages\n`);

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Phase 2 complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   • Leads: ${leads.length} (Quebec addresses, contactType, dentalHistory, insuranceInfo)`);
  console.log(`   • Notes: ${noteCount}`);
  console.log(`   • Messages: ${msgCount}`);
  console.log('\n🎉 Run Phase 3 next for pipeline, deals, payments.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
