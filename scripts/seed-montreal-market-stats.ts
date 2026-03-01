/**
 * Seed script: Import real Centris/iGEN market statistics for Montréal
 * Data sources:
 *   - "Average days on market.pdf" (province-wide Single Family)
 *   - Centris iGEN screenshots (Montréal revenue properties & plexes)
 *
 * Usage:
 *   npx tsx scripts/seed-montreal-market-stats.ts [--user-email=EMAIL]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StatRow {
  periodStart: Date;
  periodEnd: Date;
  periodType: 'MONTHLY' | 'YEARLY';
  region: string;
  city?: string;
  state: string;
  country: string;
  propertyCategory?: string;
  propertyType?: string;
  buildingType?: string;
  priceRange?: string;
  medianSalePrice?: number;
  avgSalePrice?: number;
  medianAskingPrice?: number;
  avgAskingPrice?: number;
  domMedian?: number;
  domAvg?: number;
  sellingTimeMedian?: number;
  closePriceToAskingRatio?: number;
  closePriceToOriginalRatio?: number;
  newListings?: number;
  closedSales?: number;
  expiredListings?: number;
  activeInventory?: number;
  numberOfSales?: number;
  monthsOfSupply?: number;
  listToSaleRatio?: number;
  sampleSize?: number;
  source: string;
  sourceFile?: string;
}

function ym(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const endMonth = month === 12 ? 0 : month;
  const endYear = month === 12 ? year + 1 : year;
  const end = new Date(Date.UTC(endYear, endMonth, 0, 23, 59, 59));
  return { start, end };
}

function yr(year: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

const PLEX_TYPES = 'Duplex, Triplex, Quadruplex, Quintuplex, Other';
const PLEX_BUILDINGS = 'Detached, Semi-detached, Attached, Attached corner unit, Quadrex';

function buildStats(): StatRow[] {
  const rows: StatRow[] = [];
  const base = { state: 'QC', country: 'CA', source: 'centris-igen' };

  // ─────────────────────────────────────────────────────────────────────
  // 1. PROVINCE-WIDE SINGLE FAMILY — Yearly aggregates
  //    Source: "Average days on market.pdf"
  // ─────────────────────────────────────────────────────────────────────

  const sfYearlyDOM: Record<number, number> = {
    2021: 49, 2022: 40, 2023: 53, 2024: 56, 2025: 47, 2026: 55,
  };
  const sfYearlyMedianPrice: Record<number, number> = {
    2016: 233000, 2017: 241000, 2018: 250000, 2019: 260000, 2020: 295000,
    2021: 362000, 2022: 414000, 2023: 415000, 2024: 449000, 2025: 490000,
    2026: 485000,
  };
  const sfYearlySales: Record<number, number> = {
    2021: 69319, 2022: 57130, 2023: 51758, 2024: 60484, 2025: 65080, 2026: 3321,
  };

  for (const [y, dom] of Object.entries(sfYearlyDOM)) {
    const year = Number(y);
    const { start, end } = yr(year);
    rows.push({
      ...base,
      periodStart: start,
      periodEnd: end,
      periodType: 'YEARLY',
      region: 'Québec',
      propertyCategory: 'Single Family',
      domAvg: dom,
      medianSalePrice: sfYearlyMedianPrice[year],
      numberOfSales: sfYearlySales[year],
      sampleSize: 306545,
      sourceFile: 'Average days on market.pdf',
    });
  }

  for (const [y, price] of Object.entries(sfYearlyMedianPrice)) {
    const year = Number(y);
    if (sfYearlyDOM[year]) continue;
    const { start, end } = yr(year);
    rows.push({
      ...base,
      periodStart: start,
      periodEnd: end,
      periodType: 'YEARLY',
      region: 'Québec',
      propertyCategory: 'Single Family',
      medianSalePrice: price,
      sampleSize: 607272,
      sourceFile: 'Average days on market.pdf',
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 2. PROVINCE-WIDE SINGLE FAMILY — Monthly Active Listings (2021-2026)
  //    Source: "Average days on market.pdf"
  // ─────────────────────────────────────────────────────────────────────

  const sfMonthlyActive: Record<number, (number | null)[]> = {
    2021: [15018, 14578, 14835, 14457, 14128, 13694, 12916, 13066, 13782, 13514, 12806, 10333],
    2022: [11268, 11717, 12158, 12131, 13313, 14842, 15717, 16587, 18135, 19117, 18841, 16624],
    2023: [17541, 18183, 18733, 18776, 18752, 18618, 18145, 18630, 20043, 21174, 21314, 19008],
    2024: [20544, 21816, 22375, 22357, 22743, 22308, 21732, 21598, 22296, 22625, 21572, 18157],
    2025: [19709, 20459, 21377, 21717, 22300, 21729, 20752, 21046, 21911, 21801, 20598, 17182],
    2026: [19314, null, null, null, null, null, null, null, null, null, null, null],
  };

  for (const [y, months] of Object.entries(sfMonthlyActive)) {
    const year = Number(y);
    months.forEach((count, idx) => {
      if (count === null) return;
      const { start, end } = ym(year, idx + 1);
      rows.push({
        ...base,
        periodStart: start,
        periodEnd: end,
        periodType: 'MONTHLY',
        region: 'Québec',
        propertyCategory: 'Single Family',
        activeInventory: count,
        sampleSize: 380000,
        sourceFile: 'Average days on market.pdf',
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 3. MONTRÉAL PLEXES (Revenue) — Monthly stats, past 12 months
  //    Source: screenshots (data tables, Mar 2025 — Feb 2026)
  //    Category: Single Family + Condo + Revenue Property
  //    Property Type: Duplex, Triplex, Quadruplex, Quintuplex, Other
  //    ~3,148–3,160 listings
  // ─────────────────────────────────────────────────────────────────────

  const plexMonthlyDOM: [number, number, number][] = [
    [2025, 3, 79], [2025, 4, 63], [2025, 5, 53], [2025, 6, 54],
    [2025, 7, 58], [2025, 8, 61], [2025, 9, 51], [2025, 10, 56],
    [2025, 11, 60], [2025, 12, 52], [2026, 1, 72], [2026, 2, 56],
  ];

  const plexMonthlyCloseToOriginal: [number, number, number][] = [
    [2025, 3, 97], [2025, 4, 97], [2025, 5, 97], [2025, 6, 97],
    [2025, 7, 97], [2025, 8, 97], [2025, 9, 97], [2025, 10, 97],
    [2025, 11, 96], [2025, 12, 97], [2026, 1, 94], [2026, 2, 96],
  ];

  const plexMonthlyCloseToAsking: [number, number, number][] = [
    [2025, 3, 98], [2025, 4, 97], [2025, 5, 98], [2025, 6, 97],
    [2025, 7, 98], [2025, 8, 97], [2025, 9, 97], [2025, 10, 98],
    [2025, 11, 97], [2025, 12, 98], [2026, 1, 96], [2026, 2, 98],
  ];

  const plexMonthlySaleAvg: [number, number, number][] = [
    [2025, 3, 1041969], [2025, 4, 1015716], [2025, 5, 1013593],
    [2025, 6, 1102103], [2025, 7, 974573],  [2025, 8, 1028474],
    [2025, 9, 1057042], [2025, 10, 1104605], [2025, 11, 982674],
    [2025, 12, 1038600], [2026, 1, 1204305], [2026, 2, 1010987],
  ];

  const plexMonthlySaleMedian: [number, number, number][] = [
    [2025, 3, 919250], [2025, 4, 878000], [2025, 5, 895000],
    [2025, 6, 945000], [2025, 7, 861250], [2025, 8, 910000],
    [2025, 9, 905000], [2025, 10, 932000], [2025, 11, 911000],
    [2025, 12, 914250], [2026, 1, 911000], [2026, 2, 950000],
  ];

  const plexMonthlyData = new Map<string, Partial<StatRow>>();

  for (const [y, m, val] of plexMonthlyDOM) {
    const key = `${y}-${m}`;
    plexMonthlyData.set(key, { ...plexMonthlyData.get(key), domAvg: val });
  }
  for (const [y, m, val] of plexMonthlyCloseToOriginal) {
    const key = `${y}-${m}`;
    plexMonthlyData.set(key, { ...plexMonthlyData.get(key), closePriceToOriginalRatio: val });
  }
  for (const [y, m, val] of plexMonthlyCloseToAsking) {
    const key = `${y}-${m}`;
    plexMonthlyData.set(key, { ...plexMonthlyData.get(key), closePriceToAskingRatio: val });
  }
  for (const [y, m, val] of plexMonthlySaleAvg) {
    const key = `${y}-${m}`;
    plexMonthlyData.set(key, { ...plexMonthlyData.get(key), avgSalePrice: val });
  }
  for (const [y, m, val] of plexMonthlySaleMedian) {
    const key = `${y}-${m}`;
    plexMonthlyData.set(key, { ...plexMonthlyData.get(key), medianSalePrice: val });
  }

  for (const [key, data] of plexMonthlyData) {
    const [y, m] = key.split('-').map(Number);
    const { start, end } = ym(y, m);
    rows.push({
      ...base,
      periodStart: start,
      periodEnd: end,
      periodType: 'MONTHLY',
      region: 'Montréal',
      city: 'Montréal',
      propertyCategory: 'Revenue Property',
      propertyType: PLEX_TYPES,
      buildingType: PLEX_BUILDINGS,
      ...data,
      sampleSize: 3160,
      sourceFile: 'centris-igen-screenshots',
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 4. MONTRÉAL REVENUE PROPERTIES — By Price Range (2025, Jan-Dec)
  //    Source: screenshots, excl. Single Family + Condo
  //    ~20-28 listings per metric
  // ─────────────────────────────────────────────────────────────────────

  const priceRanges = [
    '$0-100K', '$100-150K', '$150-200K', '$200-250K', '$250-300K',
    '$300-350K', '$350-400K', '$400-450K', '$450-500K', '$500-600K',
    '$600-700K', '$700-800K', '$800-900K', '$900-1000K', '$1000K+',
  ];

  const revAskingAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    550000, 650000, 730000, 830000, 880000, 1400000,
  ];

  const revAskingMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    580000, 650000, 730000, 850000, 880000, 1300000,
  ];

  const revSaleAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    550000, 680000, 750000, 800000, 830000, 1300000,
  ];

  const revSaleMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    560000, 670000, 730000, 800000, 830000, 1200000,
  ];

  const revDomAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 70,
    35, 60, 25, 42, 135, 20, 50,
  ];

  const revSellingTimeMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    20, 40, 25, 33, 135, 20, 35,
  ];

  const revCloseToAsking2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    115, 90, 103, 105, 103, 92, 100,
  ];

  const revCloseToOriginal2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    115, 90, 103, 105, 105, 92, 100,
  ];

  const revNewListings2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 1,
    3, 4, 1, 4, 5, 2, 12,
  ];

  const revExpired2025: (number | null)[] = [
    null, null, null, null, null, null, null, 1, 1, null, null, null, null, null, 3,
  ];

  const { start: y2025s, end: y2025e } = yr(2025);

  priceRanges.forEach((range, idx) => {
    const hasData = revAskingAvg2025[idx] || revNewListings2025[idx] || revExpired2025[idx];
    if (!hasData) return;

    rows.push({
      ...base,
      periodStart: y2025s,
      periodEnd: y2025e,
      periodType: 'YEARLY',
      region: 'Montréal',
      city: 'Montréal',
      propertyCategory: 'Revenue Property',
      propertyType: PLEX_TYPES,
      buildingType: PLEX_BUILDINGS,
      priceRange: range,
      avgAskingPrice: revAskingAvg2025[idx] ?? undefined,
      medianAskingPrice: revAskingMedian2025[idx] ?? undefined,
      avgSalePrice: revSaleAvg2025[idx] ?? undefined,
      medianSalePrice: revSaleMedian2025[idx] ?? undefined,
      domAvg: revDomAvg2025[idx] ?? undefined,
      sellingTimeMedian: revSellingTimeMedian2025[idx] ?? undefined,
      closePriceToAskingRatio: revCloseToAsking2025[idx] ?? undefined,
      closePriceToOriginalRatio: revCloseToOriginal2025[idx] ?? undefined,
      newListings: revNewListings2025[idx] ?? undefined,
      expiredListings: revExpired2025[idx] ?? undefined,
      sampleSize: 28,
      sourceFile: 'centris-igen-screenshots',
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 5. MONTRÉAL REVENUE PROPERTIES — Monthly Active Listings (2025)
  //    Source: screenshot (Active Listings by Month, Jan-Dec 2025)
  //    ~32 listings
  // ─────────────────────────────────────────────────────────────────────

  const revMonthlyActive2025: [number, number][] = [
    [1, 7], [2, 10], [3, 10], [4, 6], [5, 6], [6, 7],
    [7, 4], [8, 3], [9, 3], [10, 3], [11, 3], [12, 3],
  ];

  for (const [m, count] of revMonthlyActive2025) {
    const { start, end } = ym(2025, m);
    rows.push({
      ...base,
      periodStart: start,
      periodEnd: end,
      periodType: 'MONTHLY',
      region: 'Montréal',
      city: 'Montréal',
      propertyCategory: 'Revenue Property',
      propertyType: PLEX_TYPES,
      buildingType: PLEX_BUILDINGS,
      activeInventory: count,
      sampleSize: 32,
      sourceFile: 'centris-igen-screenshots',
    });
  }

  // ─────────────────────────────────────────────────────────────────────
  // 6. 2024 PRICE RATIO DATA (Montréal Revenue Properties)
  //    Source: screenshots (Close Price to Original/Asking Price Ratio, 2024)
  //    12 listings
  // ─────────────────────────────────────────────────────────────────────

  const revCloseToOriginal2024: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    100, 105, 90, 80, null, null,
  ];

  const revCloseToAsking2024: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    100, 105, 90, 80, null, null,
  ];

  const { start: y2024s, end: y2024e } = yr(2024);

  priceRanges.forEach((range, idx) => {
    const hasData = revCloseToOriginal2024[idx] || revCloseToAsking2024[idx];
    if (!hasData) return;

    rows.push({
      ...base,
      periodStart: y2024s,
      periodEnd: y2024e,
      periodType: 'YEARLY',
      region: 'Montréal',
      city: 'Montréal',
      propertyCategory: 'Revenue Property',
      propertyType: PLEX_TYPES,
      buildingType: PLEX_BUILDINGS,
      priceRange: range,
      closePriceToOriginalRatio: revCloseToOriginal2024[idx] ?? undefined,
      closePriceToAskingRatio: revCloseToAsking2024[idx] ?? undefined,
      sampleSize: 12,
      sourceFile: 'centris-igen-screenshots',
    });
  });

  // ─────────────────────────────────────────────────────────────────────
  // 7. NOT-SINGLE-FAMILY (excl. Condo) — 2025 by price range
  //    Some screenshots show this variant
  // ─────────────────────────────────────────────────────────────────────

  const nonSfSaleMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    560000, 670000, 730000, 810000, 830000, 1200000,
  ];

  const nonSfSaleAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 400000,
    550000, 680000, 750000, 800000, 830000, 1300000,
  ];

  const nonSfSellingTimeMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    20, 40, 25, 33, 135, 20, 35,
  ];

  const nonSfDomAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 60,
    35, 60, 25, 42, 135, 20, 50,
  ];

  const nonSfCloseToOriginal2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 80,
    115, 90, 103, 105, 105, 92, 100,
  ];

  const nonSfCloseToAsking2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 80,
    115, 90, 103, 105, 103, 92, 100,
  ];

  const nonSfNewListings2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 1,
    3, 4, 1, 4, 5, 2, 12,
  ];

  const nonSfExpired2025: (number | null)[] = [
    null, null, null, null, null, null, null, 1, 1, null, null, null, null, null, 3,
  ];

  const nonSfAskingMedian2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, null,
    550000, 630000, 720000, 850000, 900000, 1300000,
  ];

  const nonSfAskingAvg2025: (number | null)[] = [
    null, null, null, null, null, null, null, null, 450000,
    560000, 630000, 710000, 810000, 880000, 1400000,
  ];

  priceRanges.forEach((range, idx) => {
    const hasData =
      nonSfSaleMedian2025[idx] || nonSfNewListings2025[idx] || nonSfExpired2025[idx];
    if (!hasData) return;

    rows.push({
      ...base,
      periodStart: y2025s,
      periodEnd: y2025e,
      periodType: 'YEARLY',
      region: 'Montréal',
      city: 'Montréal',
      propertyCategory: 'Revenue Property (excl. Single Family)',
      propertyType: PLEX_TYPES,
      buildingType: PLEX_BUILDINGS,
      priceRange: range,
      medianSalePrice: nonSfSaleMedian2025[idx] ?? undefined,
      avgSalePrice: nonSfSaleAvg2025[idx] ?? undefined,
      medianAskingPrice: nonSfAskingMedian2025[idx] ?? undefined,
      avgAskingPrice: nonSfAskingAvg2025[idx] ?? undefined,
      domAvg: nonSfDomAvg2025[idx] ?? undefined,
      sellingTimeMedian: nonSfSellingTimeMedian2025[idx] ?? undefined,
      closePriceToAskingRatio: nonSfCloseToAsking2025[idx] ?? undefined,
      closePriceToOriginalRatio: nonSfCloseToOriginal2025[idx] ?? undefined,
      newListings: nonSfNewListings2025[idx] ?? undefined,
      expiredListings: nonSfExpired2025[idx] ?? undefined,
      sampleSize: 20,
      sourceFile: 'centris-igen-screenshots',
    });
  });

  return rows;
}

async function main() {
  const emailArg = process.argv.find((a) => a.startsWith('--user-email='));
  const email = emailArg?.split('=')[1];

  let userId: string;

  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error(`User ${email} not found. Sign up first.`);
    userId = user.id;
    console.log(`Using user: ${user.name} (${user.email})`);
  } else {
    const user = await prisma.user.findFirst({
      where: { industry: 'REAL_ESTATE' },
      orderBy: { createdAt: 'desc' },
    });
    if (!user) {
      const anyUser = await prisma.user.findFirst({ orderBy: { createdAt: 'desc' } });
      if (!anyUser) throw new Error('No users found in DB.');
      userId = anyUser.id;
      console.log(`No real estate user found. Using: ${anyUser.name} (${anyUser.email})`);
    } else {
      userId = user.id;
      console.log(`Using real estate user: ${user.name} (${user.email})`);
    }
  }

  const stats = buildStats();
  console.log(`\nPrepared ${stats.length} market stat records to import.\n`);

  // Clear previously seeded centris-igen data for this user
  const deleted = await prisma.rEMarketStats.deleteMany({
    where: { userId, source: 'centris-igen' },
  });
  console.log(`Cleared ${deleted.count} previous centris-igen records.\n`);

  let created = 0;
  let errors = 0;

  for (const row of stats) {
    try {
      await prisma.rEMarketStats.create({
        data: {
          userId,
          periodStart: row.periodStart,
          periodEnd: row.periodEnd,
          periodType: row.periodType,
          region: row.region,
          city: row.city,
          state: row.state,
          country: row.country,
          propertyCategory: row.propertyCategory,
          propertyType: row.propertyType,
          buildingType: row.buildingType,
          priceRange: row.priceRange,
          medianSalePrice: row.medianSalePrice,
          avgSalePrice: row.avgSalePrice,
          medianAskingPrice: row.medianAskingPrice,
          avgAskingPrice: row.avgAskingPrice,
          domMedian: row.domMedian,
          domAvg: row.domAvg,
          sellingTimeMedian: row.sellingTimeMedian,
          closePriceToAskingRatio: row.closePriceToAskingRatio,
          closePriceToOriginalRatio: row.closePriceToOriginalRatio,
          newListings: row.newListings,
          closedSales: row.closedSales,
          expiredListings: row.expiredListings,
          activeInventory: row.activeInventory,
          numberOfSales: row.numberOfSales,
          monthsOfSupply: row.monthsOfSupply,
          listToSaleRatio: row.listToSaleRatio,
          sampleSize: row.sampleSize,
          source: row.source,
          sourceFile: row.sourceFile,
        },
      });
      created++;
    } catch (e: any) {
      errors++;
      console.error(`Error:`, e.message?.slice(0, 200));
    }
  }

  console.log(`\nDone! Created: ${created}, Errors: ${errors}`);
  console.log(`Total records in REMarketStats: ${await prisma.rEMarketStats.count({ where: { userId } })}`);
}

main()
  .catch((e) => {
    console.error('Fatal:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
