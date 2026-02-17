/**
 * Set Theodora's agency config in the CRM.
 * Run: npx tsx scripts/set-theodora-agency-config.ts
 */
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

const prisma = new PrismaClient();

const THEODORA_EMAIL = 'theodora.stavropoulos@remax-quebec.com';

const THEODORA_AGENCY_CONFIG = {
  brokerName: 'Theodora Stavropoulos',
  name: 'RE/MAX 3000 Inc.',
  logoUrl: '/remax-3000-logo.svg',
  tagline: 'Your trusted real estate partner in Montréal',
  address: "9280 boul. L'Acadie",
  neighborhood: 'Ahuntsic-Cartierville',
  city: 'Montréal',
  province: 'QC',
  postalCode: 'H4N 3C5',
  fullAddress: "9280 boul. L'Acadie, Montréal, QC H4N 3C5",
  phone: '514 333-3000',
  fax: '514 333-6376',
  email: 'Theodora.stavropoulos@remax-quebec.com',
  languages: ['English', 'French', 'Greek'],
  remaxProfileUrl: 'https://www.remax-quebec.com/en/real-estate-brokers/theodora.stavropoulos',
  tranquilliT: true,
  tranquilliTUrl: 'https://www.remax-quebec.com/en/tranquilli-t',
  fullAgencyMode: true,
};

async function main() {
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora) {
    console.error('❌ User not found:', THEODORA_EMAIL);
    return;
  }

  const website = theodora.websites[0];
  if (!website) {
    console.error('❌ No website found for Theodora');
    return;
  }

  await prisma.website.update({
    where: { id: website.id },
    data: { agencyConfig: THEODORA_AGENCY_CONFIG },
  });

  console.log('✅ Theodora\'s agency config set');
  console.log('   Website:', website.name);
  console.log('   Logo:', THEODORA_AGENCY_CONFIG.logoUrl);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
