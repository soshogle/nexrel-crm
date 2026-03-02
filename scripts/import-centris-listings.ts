/**
 * Import Centris listing spreadsheets into REProperty table.
 *
 * Handles:
 *  - Active & sold single-family homes
 *  - Active & sold condominiums/apartments
 *  - Column-offset detection (some rows shift left by 1)
 *  - Price parsing ("$625,000 (J)" → 625000)
 *  - Bed/bath format ("4+1" → 5 beds, 4+1 → 5 baths)
 *  - Deduplication by Centris No.
 *
 * Usage:
 *   npx tsx scripts/import-centris-listings.ts [--dry-run] [--user-email=EMAIL]
 */

import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '..', 'data', 'market-reports');

interface RawRow {
  centrisNo: number | string;
  status: string;
  municipality: string;
  address: string;
  price: number | string | null;
  rentPrice: string | null;
  propertyType: string | null;
  buildingType: string | null;
  rooms: number | string | null;
  bedrooms: string | null;
  bathrooms: string | null;
  extra1: string | null;
  extra2: string | null;
  extra3: string | null;
  extra4: string | number | null;
  sqft: number | null;
}

// ── Column normalisation ────────────────────────────────────────────

function normaliseRow(raw: any[], expectedStatus: 'AC' | 'SO'): RawRow | null {
  if (!raw || raw.length < 5) return null;

  let cols: any[];
  // Detect offset: if col[0] is a number, the null prefix is missing
  if (typeof raw[0] === 'number' && raw[0] > 100000) {
    cols = [null, ...raw];
  } else {
    cols = raw;
  }

  const centrisNo = cols[1];
  if (!centrisNo || (typeof centrisNo === 'string' && centrisNo === 'Centris No.')) return null;

  const status = cols[2];
  if (status !== expectedStatus) {
    // Might be a header row or municipality in wrong col
    if (typeof status === 'string' && status.length > 3) return null;
  }

  return {
    centrisNo: centrisNo,
    status: status || expectedStatus,
    municipality: cols[3] || '',
    address: cols[4] || '',
    price: cols[5] ?? null,
    rentPrice: cols[6] ?? null,
    propertyType: cols[7] || null,
    buildingType: cols[8] || null,
    rooms: cols[9] ?? null,
    bedrooms: cols[10] || null,
    bathrooms: cols[11] || null,
    extra1: cols[12] ?? null,
    extra2: cols[13] ?? null,
    extra3: cols[14] ?? null,
    extra4: cols[15] ?? null,
    sqft: typeof cols[13] === 'number' ? cols[13] : (typeof cols[14] === 'number' ? cols[14] : null),
  };
}

// ── Parsers ─────────────────────────────────────────────────────────

function parsePrice(val: number | string | null): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val > 0 ? val : null;
  const cleaned = String(val).replace(/[$,\s]/g, '').replace(/\(.*\)/, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) || num <= 0 ? null : num;
}

/** Parse rent price from "$2,125/mth" or "$1,240/m" - returns numeric value and label */
function parseRentPrice(val: string | null): { amount: number | null; label: string } {
  if (!val || typeof val !== 'string') return { amount: null, label: '' };
  const cleaned = val.replace(/[$,\s]/g, '').replace(/\/.*$/, '').trim();
  const num = parseFloat(cleaned);
  return {
    amount: isNaN(num) || num <= 0 ? null : num,
    label: val.trim(),
  };
}

function parseBedBath(val: string | null): number {
  if (!val) return 0;
  const parts = String(val).split('+').map(Number);
  return parts.reduce((a, b) => a + (isNaN(b) ? 0 : b), 0);
}

/** Parse DOM from extra columns — Centris Excel may have "Days" or numeric DOM in extra4 or extra1/2/3 */
function parseDom(row: RawRow): number {
  for (const val of [row.extra4, row.extra1, row.extra2, row.extra3]) {
    if (val == null) continue;
    const n = typeof val === 'number' ? val : parseInt(String(val).replace(/[^\d]/g, ''), 10);
    if (!isNaN(n) && n >= 1 && n <= 999) return n;
  }
  return 0;
}

type PropertyType = 'SINGLE_FAMILY' | 'CONDO' | 'TOWNHOUSE' | 'MULTI_FAMILY' | 'MOBILE_HOME' | 'OTHER';

function mapPropertyType(pt: string | null, category: 'sf' | 'condo'): PropertyType {
  if (!pt) return category === 'condo' ? 'CONDO' : 'SINGLE_FAMILY';
  const v = pt.toUpperCase();
  if (['APT', 'LS'].includes(v)) return 'CONDO';
  if (['CT', 'BUN', 'SL', '1HS', 'HOU'].includes(v)) return 'SINGLE_FAMILY';
  if (['SD'].includes(v)) return category === 'condo' ? 'CONDO' : 'TOWNHOUSE';
  if (['ATT', 'ACU'].includes(v)) return category === 'condo' ? 'CONDO' : 'TOWNHOUSE';
  if (['QDX'].includes(v)) return 'MULTI_FAMILY';
  if (['MH'].includes(v)) return 'MOBILE_HOME';
  if (['DET'].includes(v)) return category === 'condo' ? 'CONDO' : 'SINGLE_FAMILY';
  return 'OTHER';
}

type ListingStatus = 'ACTIVE' | 'SOLD';

function mapStatus(st: string): ListingStatus {
  return st === 'SO' ? 'SOLD' : 'ACTIVE';
}

// ── File reader ─────────────────────────────────────────────────────

function readExcel(filename: string, hasHeader: boolean, expectedStatus: 'AC' | 'SO'): RawRow[] {
  const filepath = path.join(DATA_DIR, filename);
  const wb = XLSX.readFile(filepath);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const start = hasHeader ? 1 : 0;
  const rows: RawRow[] = [];

  for (let i = start; i < raw.length; i++) {
    const parsed = normaliseRow(raw[i], expectedStatus);
    if (parsed) rows.push(parsed);
  }

  return rows;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const emailArg = process.argv.find((a) => a.startsWith('--user-email='));
  const email = emailArg?.split('=')[1];

  let userId: string;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`User ${email} not found.`);
    userId = user.id;
    console.log(`User: ${user.name} (${user.email})`);
  } else {
    const user = await prisma.user.findFirst({
      where: { industry: 'REAL_ESTATE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!user) throw new Error('No REAL_ESTATE user found.');
    userId = user.id;
    console.log(`User: ${user.name} (${user.email})`);
  }

  console.log(dryRun ? '\n--- DRY RUN (no DB writes) ---\n' : '\n--- LIVE IMPORT ---\n');

  // Read all files
  const files: { filename: string; hasHeader: boolean; expectedStatus: 'AC' | 'SO'; category: 'sf' | 'condo' }[] = [
    { filename: 'active single family homes.xlsx', hasHeader: true, expectedStatus: 'AC', category: 'sf' },
    { filename: 'active condominium apartments.xlsx', hasHeader: false, expectedStatus: 'AC', category: 'condo' },
    { filename: 'sold single family homes.xlsx', hasHeader: false, expectedStatus: 'SO', category: 'sf' },
    { filename: 'sold condominiums & apartments.xlsx', hasHeader: true, expectedStatus: 'SO', category: 'condo' },
  ];

  let totalParsed = 0;
  let totalSkipped = 0;
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  // Pre-fetch existing Centris numbers for this user to avoid duplicates
  const [existingProps, existingRentals] = await Promise.all([
    prisma.rEProperty.findMany({
      where: { userId, mlsNumber: { not: null } },
      select: { id: true, mlsNumber: true },
    }),
    prisma.rERentalListing.findMany({
      where: { userId, mlsNumber: { not: null } },
      select: { id: true, mlsNumber: true },
    }),
  ]);
  const existingMap = new Map(existingProps.map((p) => [p.mlsNumber!, p.id]));
  const existingRentalMap = new Map(existingRentals.map((r) => [r.mlsNumber!, r.id]));
  console.log(`Existing properties: ${existingMap.size}, rentals: ${existingRentalMap.size}\n`);

  let totalRentalsCreated = 0;
  let totalRentalsUpdated = 0;

  for (const file of files) {
    console.log(`Reading: ${file.filename}`);
    const rows = readExcel(file.filename, file.hasHeader, file.expectedStatus);
    console.log(`  Parsed ${rows.length} rows`);

    let created = 0;
    let updated = 0;
    let rentalsCreated = 0;
    let rentalsUpdated = 0;
    let errors = 0;

    for (const row of rows) {
      const centrisNo = String(row.centrisNo);
      const price = parsePrice(row.price);
      const rentParsed = parseRentPrice(row.rentPrice);
      const beds = parseBedBath(row.bedrooms);
      const baths = parseBedBath(row.bathrooms);
      const status = mapStatus(row.status);
      const propType = mapPropertyType(row.propertyType, file.category);

      // Rental-only listings → RERentalListing (separate section)
      if (!price && rentParsed.amount) {
        const rentalStatus = status === 'SOLD' ? 'RENTED' : 'ACTIVE';
        const rentalData = {
          userId,
          address: row.address,
          city: row.municipality,
          state: 'QC',
          zip: '',
          country: 'CA',
          beds,
          baths,
          sqft: row.sqft || null,
          propertyType: propType,
          listingStatus: rentalStatus,
          rentPrice: rentParsed.amount,
          rentPriceLabel: rentParsed.label || null,
          mlsNumber: centrisNo,
          daysOnMarket: parseDom(row),
          description: [
            row.propertyType && `Type: ${row.propertyType}`,
            row.buildingType && `Building: ${row.buildingType}`,
            row.rooms && `Rooms: ${row.rooms}`,
          ].filter(Boolean).join(' | ') || null,
          features: [
            row.buildingType && `Building: ${row.buildingType}`,
          ].filter(Boolean) as string[],
          source: 'centris-import',
        };

        if (dryRun) {
          rentalsCreated++;
          continue;
        }

        try {
          const existingId = existingRentalMap.get(centrisNo);
          if (existingId) {
            await prisma.rERentalListing.update({
              where: { id: existingId },
              data: {
                rentPrice: rentalData.rentPrice,
                rentPriceLabel: rentalData.rentPriceLabel,
                listingStatus: rentalData.listingStatus as any,
                beds: rentalData.beds,
                baths: rentalData.baths,
                sqft: rentalData.sqft,
                propertyType: rentalData.propertyType as any,
                description: rentalData.description,
              },
            });
            rentalsUpdated++;
          } else {
            const rec = await prisma.rERentalListing.create({ data: rentalData as any });
            existingRentalMap.set(centrisNo, rec.id);
            rentalsCreated++;
          }
        } catch (e: any) {
          errors++;
          if (errors <= 3) console.error(`  Rental error (Centris#${centrisNo}):`, (e as Error).message?.slice(0, 120));
        }
        continue;
      }

      // Skip rows with neither sale nor rent price
      if (!price && !rentParsed.amount) continue;

      // Sale listings → REProperty
      const data = {
        userId,
        address: row.address,
        city: row.municipality,
        state: 'QC',
        zip: '',
        country: 'CA',
        beds,
        baths,
        sqft: row.sqft || null,
        propertyType: propType,
        listingStatus: status,
        listPrice: status === 'ACTIVE' ? price : (price || null),
        soldPrice: status === 'SOLD' ? price : null,
        mlsNumber: centrisNo,
        daysOnMarket: parseDom(row),
        description: [
          row.propertyType && `Type: ${row.propertyType}`,
          row.buildingType && `Building: ${row.buildingType}`,
          row.rooms && `Rooms: ${row.rooms}`,
        ].filter(Boolean).join(' | ') || null,
        features: [
          row.buildingType && `Building: ${row.buildingType}`,
          row.extra1 === 'Y' && 'Pool',
          row.extra2 === 'Y' && 'Garage',
        ].filter(Boolean) as string[],
      };

      if (dryRun) {
        created++;
        continue;
      }

      try {
        const existingId = existingMap.get(centrisNo);
        if (existingId) {
          await prisma.rEProperty.update({
            where: { id: existingId },
            data: {
              listPrice: data.listPrice,
              soldPrice: data.soldPrice,
              listingStatus: data.listingStatus as any,
              beds: data.beds,
              baths: data.baths,
              sqft: data.sqft,
              propertyType: data.propertyType as any,
              description: data.description,
              features: data.features,
            },
          });
          updated++;
        } else {
          const rec = await prisma.rEProperty.create({ data: data as any });
          existingMap.set(centrisNo, rec.id);
          created++;
        }
      } catch (e: any) {
        errors++;
        if (errors <= 3) console.error(`  Error (Centris#${centrisNo}):`, (e as Error).message?.slice(0, 150));
      }
    }

    console.log(`  Sale: created ${created}, updated ${updated} | Rental: created ${rentalsCreated}, updated ${rentalsUpdated} | Errors: ${errors}`);
    totalParsed += rows.length;
    totalCreated += created;
    totalUpdated += updated;
    totalRentalsCreated += rentalsCreated;
    totalRentalsUpdated += rentalsUpdated;
    totalErrors += errors;
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`Total parsed:  ${totalParsed}`);
  console.log(`Sale listings: created ${totalCreated}, updated ${totalUpdated}`);
  console.log(`Rental listings: created ${totalRentalsCreated}, updated ${totalRentalsUpdated}`);
  console.log(`Total errors:  ${totalErrors}`);

  if (!dryRun) {
    const [propCount, rentalCount] = await Promise.all([
      prisma.rEProperty.count({ where: { userId } }),
      prisma.rERentalListing.count({ where: { userId } }),
    ]);
    console.log(`\nTotal REProperty: ${propCount} | RERentalListing: ${rentalCount}`);
  }
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
