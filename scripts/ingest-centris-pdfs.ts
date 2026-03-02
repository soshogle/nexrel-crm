#!/usr/bin/env tsx
/**
 * Comprehensive Centris data ingestion — PDFs, XLSX listings, and summary reports.
 *
 * Usage:
 *   npx tsx scripts/ingest-centris-pdfs.ts                    # ingest everything
 *   npx tsx scripts/ingest-centris-pdfs.ts --dry-run          # preview without writing
 *   npx tsx scripts/ingest-centris-pdfs.ts --file <filename>  # ingest a single PDF
 */
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { parseAllCentrisPdfs, parseCentrisPdf, type CentrisStatRow } from '../lib/real-estate/centris-pdf-parser';

const prisma = new PrismaClient();
const DATA_DIR = path.resolve(__dirname, '../data/market-reports');

const INT4_MAX = 2_147_483_647;
const safeInt = (v: number | undefined | null): number | null => {
  if (v == null || isNaN(v)) return null;
  return Math.abs(v) <= INT4_MAX ? v : null;
};
const safeDom = (v: number | undefined | null): number | null => {
  if (v == null || isNaN(v) || v > 5000 || v < 0) return null;
  return v;
};

async function findRealEstateUserId(): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { industry: 'REAL_ESTATE' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (user) return user.id;
  const userWithProps = await prisma.rEProperty.findFirst({
    select: { userId: true },
    orderBy: { createdAt: 'asc' },
  });
  return userWithProps?.userId ?? null;
}

// ─── PART 1: Centris STATS_MUNGENRE PDFs → REMarketStats ───

function periodKey(row: CentrisStatRow): string {
  return `${row.periodYear}-${String(row.periodMonth).padStart(2, '0')}|${row.region}|${row.municipality}|${row.propertyType || 'All Types'}`;
}

async function ingestCentrisPdfs(userId: string, dryRun: boolean, singleFile?: string) {
  console.log('\n══════════════════════════════════════');
  console.log('PART 1: Centris STATS_MUNGENRE PDFs');
  console.log('══════════════════════════════════════');

  let rows: CentrisStatRow[];
  if (singleFile) {
    const filePath = path.resolve(DATA_DIR, singleFile);
    console.log(`Parsing single file: ${singleFile}`);
    rows = await parseCentrisPdf(filePath);
  } else {
    rows = await parseAllCentrisPdfs(DATA_DIR);
  }

  console.log(`Total rows extracted: ${rows.length}`);

  const deduped = new Map<string, CentrisStatRow>();
  for (const row of rows) {
    const key = periodKey(row);
    const existing = deduped.get(key);
    if (!existing) {
      deduped.set(key, row);
    } else if (row.periodType === 'MONTHLY' && existing.periodType === 'CUMULATIVE') {
      deduped.set(key, row);
    } else if (row.periodType === existing.periodType && (row.numberOfSales ?? 0) > (existing.numberOfSales ?? 0)) {
      deduped.set(key, row);
    }
  }

  const records = Array.from(deduped.values());
  console.log(`${records.length} unique stat records (deduped from ${rows.length})`);

  if (dryRun) {
    const regionCounts = new Map<string, number>();
    for (const r of records) regionCounts.set(r.region, (regionCounts.get(r.region) || 0) + 1);
    console.log('\nRecords per region:');
    for (const [region, count] of [...regionCounts].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${region}: ${count}`);
    }
    return records.length;
  }

  console.log('Clearing existing centris_pdf records...');
  await prisma.rEMarketStats.deleteMany({ where: { userId, source: 'centris_pdf' } });

  const batchData = records.map(row => {
    const periodStart = new Date(row.periodYear, row.periodMonth - 1, 1);
    const periodEnd = new Date(row.periodYear, row.periodMonth, 0);
    const rawData: Record<string, unknown> = {};
    if (row.neighborhood) rawData.neighborhood = row.neighborhood;
    if (row.volumeOfSales) rawData.volumeOfSales = row.volumeOfSales;
    if (row.saleVsAssessPct) rawData.saleVsAssessPct = row.saleVsAssessPct;

    return {
      userId,
      periodStart,
      periodEnd,
      periodType: 'MONTHLY' as const,
      region: row.region,
      city: row.municipality,
      state: 'QC',
      country: 'CA',
      propertyCategory: row.propertyType || null,
      medianSalePrice: row.medianSalePrice ?? null,
      avgSalePrice: row.avgSalePrice ?? null,
      domAvg: safeDom(row.dom),
      domMedian: safeDom(row.dom),
      newListings: safeInt(row.newListings),
      closedSales: safeInt(row.numberOfSales),
      numberOfSales: safeInt(row.numberOfSales),
      activeInventory: safeInt(row.activeListings),
      closePriceToAskingRatio: row.saleVsListPct ?? null,
      closePriceToOriginalRatio: row.saleVsAssessPct ?? null,
      monthsOfSupply: (row.numberOfSales && row.activeListings && row.numberOfSales > 0)
        ? Math.round((row.activeListings / row.numberOfSales) * 10) / 10
        : null,
      sampleSize: safeInt(row.numberOfSales),
      source: 'centris_pdf',
      sourceFile: row.sourceFile,
      rawData: Object.keys(rawData).length > 0 ? rawData : undefined,
    };
  });

  const BATCH_SIZE = 500;
  let created = 0;
  for (let i = 0; i < batchData.length; i += BATCH_SIZE) {
    const batch = batchData.slice(i, i + BATCH_SIZE);
    const result = await prisma.rEMarketStats.createMany({ data: batch });
    created += result.count;
    if ((i / BATCH_SIZE) % 20 === 0) {
      console.log(`  Progress: ${created}/${batchData.length}...`);
    }
  }
  console.log(`  ✓ ${created} market stat records created`);
  return created;
}

// ─── PART 2: Average days on market PDF → REMarketStats ───

async function ingestSummaryPdf(userId: string, dryRun: boolean) {
  console.log('\n══════════════════════════════════════');
  console.log('PART 2: Average Days on Market PDF');
  console.log('══════════════════════════════════════');

  const filePath = path.join(DATA_DIR, 'Average days on market.pdf');
  if (!fs.existsSync(filePath)) {
    console.log('File not found, skipping.');
    return 0;
  }

  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(filePath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  const allLines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let currentLine = '';
    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = (item as { transform: number[] }).transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        allLines.push(currentLine);
        currentLine = '';
      }
      currentLine += (currentLine ? '\t' : '') + item.str;
      lastY = y;
    }
    if (currentLine) allLines.push(currentLine);
  }

  interface SummaryRecord {
    year: number;
    month?: number;
    domAvg?: number;
    medianSalePrice?: number;
    numberOfSales?: number;
    activeInventory?: number;
    category: string;
    region: string;
  }

  const records: SummaryRecord[] = [];
  let currentSection = '';
  let currentCategory = 'Single Family';
  let currentRegion = 'Province de Québec';

  for (const line of allLines) {
    const trimmed = line.replace(/\t/g, ' ').trim();

    if (/Days on Market.*Average/i.test(trimmed)) { currentSection = 'dom'; continue; }
    if (/Sale Price.*Median/i.test(trimmed)) { currentSection = 'median_price'; continue; }
    if (/Active Listings.*Number/i.test(trimmed)) { currentSection = 'active_listings'; continue; }
    if (/Sales.*Number of/i.test(trimmed)) { currentSection = 'sales'; continue; }

    if (/Region is '([^']+)'/i.test(trimmed)) {
      const m = trimmed.match(/Region is '([^']+)'/i);
      if (m) currentRegion = m[1];
    }
    if (/Category is '([^']+)'/i.test(trimmed)) {
      const m = trimmed.match(/Category is '([^']+)'/i);
      if (m) currentCategory = m[1];
    }
    if (/Category is one of/i.test(trimmed)) {
      currentCategory = 'All Types';
    }

    if (currentSection === 'dom' || currentSection === 'median_price' || currentSection === 'sales') {
      const yearMatch = trimmed.match(/^(20\d{2})\s+([\d,$]+)/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const val = Number(yearMatch[2].replace(/[$,]/g, ''));
        if (!isNaN(val)) {
          const rec: SummaryRecord = { year, category: currentCategory, region: currentRegion };
          if (currentSection === 'dom') rec.domAvg = val;
          else if (currentSection === 'median_price') rec.medianSalePrice = val;
          else if (currentSection === 'sales') rec.numberOfSales = val;
          records.push(rec);
        }
      }
    }

    if (currentSection === 'dom' && /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(trimmed)) {
      const parts = trimmed.split(/\s+/);
      const monthNames: Record<string, number> = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
      const month = monthNames[parts[0]];
      if (month && parts.length >= 3) {
        const year = parseInt(parts[1]);
        const val = parseInt(parts[2]);
        if (!isNaN(year) && !isNaN(val)) {
          records.push({ year, month, domAvg: val, category: currentCategory, region: currentRegion });
        }
      }
    }

    if (currentSection === 'active_listings') {
      const monthNames: Record<string, number> = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };
      const parts = trimmed.split(/\s+/);
      const month = monthNames[parts[0]];
      if (month) {
        const nums = parts.slice(1).map(s => Number(s.replace(/,/g, ''))).filter(n => !isNaN(n));
        const years = [2021, 2022, 2023, 2024, 2025, 2026];
        for (let j = 0; j < nums.length && j < years.length; j++) {
          records.push({ year: years[j], month, activeInventory: nums[j], category: currentCategory, region: currentRegion });
        }
      }
    }
  }

  console.log(`Extracted ${records.length} summary data points`);

  if (dryRun) {
    for (const r of records.slice(0, 10)) console.log(' ', JSON.stringify(r));
    if (records.length > 10) console.log(`  ... and ${records.length - 10} more`);
    return records.length;
  }

  await prisma.rEMarketStats.deleteMany({ where: { userId, source: 'centris_summary_pdf' } });

  const batchData = records.map(r => ({
    userId,
    periodStart: new Date(r.year, (r.month ?? 1) - 1, 1),
    periodEnd: new Date(r.year, r.month ?? 12, 0),
    periodType: 'MONTHLY' as const,
    region: r.region,
    state: 'QC',
    country: 'CA',
    propertyCategory: r.category,
    domAvg: r.domAvg ?? null,
    medianSalePrice: r.medianSalePrice ?? null,
    numberOfSales: safeInt(r.numberOfSales),
    closedSales: safeInt(r.numberOfSales),
    activeInventory: safeInt(r.activeInventory),
    source: 'centris_summary_pdf',
    sourceFile: 'Average days on market.pdf',
  }));

  const result = await prisma.rEMarketStats.createMany({ data: batchData });
  console.log(`  ✓ ${result.count} summary stat records created`);
  return result.count;
}

// ─── PART 3: XLSX listing files → REProperty ───

function parsePrice(val: unknown): number | null {
  if (val == null) return null;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/[$,\s(J)]/g, '');
  const n = Number(s);
  return isNaN(n) || n <= 0 ? null : n;
}

function mapPropertyType(pt: string, bt: string): 'SINGLE_FAMILY' | 'CONDO' | 'TOWNHOUSE' | 'MULTI_FAMILY' | 'MOBILE_HOME' | 'OTHER' {
  const p = (pt || '').toUpperCase();
  const b = (bt || '').toUpperCase();
  if (p === 'APT' || p === 'LOF') return 'CONDO';
  if (p === 'CT' || p === 'BUN' || p === 'SL' || p === '1HS' || p === '2S') {
    if (b === 'ATT' || b === 'ATC') return 'TOWNHOUSE';
    return 'SINGLE_FAMILY';
  }
  if (p === 'DUP' || p === 'TRI' || p === 'QUA' || p === 'QUI') return 'MULTI_FAMILY';
  if (p === 'MOB') return 'MOBILE_HOME';
  return 'OTHER';
}

function mapListingStatus(st: string): 'ACTIVE' | 'SOLD' | 'PENDING' | 'EXPIRED' {
  const s = (st || '').toUpperCase();
  if (s === 'SO') return 'SOLD';
  if (s === 'AC') return 'ACTIVE';
  if (s === 'EA' || s === 'EC') return 'PENDING';
  if (s === 'EX') return 'EXPIRED';
  return 'ACTIVE';
}

function parseBedrooms(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val);
  const m = s.match(/^(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseBathrooms(val: unknown): number | null {
  if (val == null) return null;
  const s = String(val);
  const m = s.match(/^(\d+)\+(\d+)/);
  if (m) return parseInt(m[1]) + parseInt(m[2]) * 0.5;
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

function parseRooms(val: unknown): number | null {
  if (val == null) return null;
  const n = parseInt(String(val));
  return isNaN(n) ? null : n;
}

async function ingestXlsxListings(userId: string, dryRun: boolean) {
  console.log('\n══════════════════════════════════════');
  console.log('PART 3: XLSX Listing Files → REProperty');
  console.log('══════════════════════════════════════');

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');

  const xlsxFiles = [
    'active single family homes.xlsx',
    'sold single family homes.xlsx',
    'active condominium apartments.xlsx',
    'sold condominiums & apartments.xlsx',
  ];

  let totalCreated = 0;

  for (const filename of xlsxFiles) {
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`  ${filename}: not found, skipping`);
      continue;
    }

    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

    const firstRow = rows[0] as string[];
    const hasHeader = firstRow?.some(c => typeof c === 'string' && /Centris|Address|Price/i.test(c));
    const dataRows = hasHeader ? rows.slice(1) : rows;

    console.log(`  ${filename}: ${dataRows.length} rows`);

    if (dryRun) {
      totalCreated += dataRows.length;
      continue;
    }

    interface ListingData {
      userId: string;
      mlsNumber: string;
      address: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      listPrice: number | null;
      soldPrice: number | null;
      propertyType: 'SINGLE_FAMILY' | 'CONDO' | 'TOWNHOUSE' | 'MULTI_FAMILY' | 'MOBILE_HOME' | 'OTHER';
      listingStatus: 'ACTIVE' | 'SOLD' | 'PENDING' | 'EXPIRED';
      beds: number | null;
      baths: number | null;
      isBrokerListing: boolean;
      description: string;
    }

    const listings: ListingData[] = [];

    for (const row of dataRows) {
      const r = row as unknown[];
      const centrisNo = r[1] ? String(r[1]) : '';
      const status = String(r[2] || 'AC');
      const city = String(r[3] || '');
      const address = String(r[4] || '');
      const price = parsePrice(r[5]);
      const rentPrice = r[6] ? String(r[6]) : null;
      const pt = String(r[7] || '');
      const bt = String(r[8] || '');
      const beds = parseBedrooms(r[hasHeader ? 11 : 10]);
      const baths = parseBathrooms(r[hasHeader ? 12 : 11]);

      if (!centrisNo || !address || !city) continue;

      const isSold = mapListingStatus(status) === 'SOLD';
      const isRental = !!rentPrice && !price;

      listings.push({
        userId,
        mlsNumber: centrisNo,
        address,
        city,
        state: 'QC',
        zip: '',
        country: 'CA',
        listPrice: isRental ? null : price,
        soldPrice: isSold ? price : null,
        propertyType: mapPropertyType(pt, bt),
        listingStatus: mapListingStatus(status),
        beds,
        baths,
        isBrokerListing: false,
        description: `Source: ${filename}${isRental && rentPrice ? ` | Rent: ${rentPrice}` : ''}`,
      });
    }

    if (listings.length === 0) continue;

    await prisma.rEProperty.deleteMany({
      where: {
        userId,
        description: { contains: `Source: ${filename}` },
      },
    });

    const BATCH_SIZE = 200;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      await prisma.rEProperty.createMany({ data: batch, skipDuplicates: true });
    }
    console.log(`    ✓ ${listings.length} listings ingested`);
    totalCreated += listings.length;
  }

  console.log(`  Total: ${totalCreated} listings`);
  return totalCreated;
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

  console.log('Centris Complete Data Ingestion');
  console.log('==============================');
  if (dryRun) console.log('(DRY RUN — no database writes)\n');

  const userId = await findRealEstateUserId();
  if (!userId && !dryRun) {
    console.error('No real estate user found. Cannot ingest without a userId.');
    process.exit(1);
  }
  console.log(`User ID: ${userId || '(dry run)'}`);

  let total = 0;

  // Part 1: Centris STATS_MUNGENRE PDFs
  total += await ingestCentrisPdfs(userId!, dryRun, singleFile || undefined);

  // Part 2: Summary PDF (Average days on market)
  total += await ingestSummaryPdf(userId!, dryRun);

  // Part 3: XLSX listing files
  total += await ingestXlsxListings(userId!, dryRun);

  console.log('\n==============================');
  console.log(`TOTAL: ${total} records ingested`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
