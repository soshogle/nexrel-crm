/**
 * One-time utility: detect and optionally purge legacy synthetic CMA reports.
 *
 * Usage:
 *   npx tsx scripts/cleanup-synthetic-cma-reports.ts
 *   npx tsx scripts/cleanup-synthetic-cma-reports.ts --userId <USER_ID>
 *   npx tsx scripts/cleanup-synthetic-cma-reports.ts --purge
 *   npx tsx scripts/cleanup-synthetic-cma-reports.ts --purge --userId <USER_ID>
 *
 * Default mode is dry-run (no deletion).
 */

import { prisma } from '@/lib/db';

const DEMO_STREETS = ['oak', 'maple', 'cedar', 'pine', 'elm'];
const DEMO_TYPES = ['street', 'avenue', 'drive', 'court', 'way'];

function getArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function isDemoAddress(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const m = value.trim().match(/^(\d+)\s+([a-zA-Z]+)\s+([a-zA-Z]+)$/);
  if (!m) return false;
  const street = m[2].toLowerCase();
  const type = m[3].toLowerCase();
  return DEMO_STREETS.includes(street) && DEMO_TYPES.includes(type);
}

function looksLikeLegacySyntheticComparables(comparables: unknown): boolean {
  if (!Array.isArray(comparables)) return false;
  if (comparables.length !== 5) return false;

  // Legacy synthetic generator used deterministic street/type sets with random house number.
  const allDemoAddresses = comparables.every((c: any) => isDemoAddress(c?.address));
  if (!allDemoAddresses) return false;

  // Additional confidence check: all have expected core fields and numeric price/sqft.
  const allHaveCoreFields = comparables.every((c: any) =>
    typeof c?.price === 'number' &&
    typeof c?.sqft === 'number' &&
    typeof c?.beds === 'number' &&
    typeof c?.baths === 'number'
  );
  return allHaveCoreFields;
}

async function main() {
  const userId = getArg('--userId');
  const purge = process.argv.includes('--purge');

  const reports = await prisma.rECMAReport.findMany({
    where: {
      ...(userId ? { userId } : {}),
    },
    select: {
      id: true,
      userId: true,
      address: true,
      createdAt: true,
      comparables: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const syntheticCandidates = reports.filter((r) =>
    looksLikeLegacySyntheticComparables(r.comparables)
  );

  console.log(`Scanned CMA reports: ${reports.length}`);
  console.log(`Synthetic candidates found: ${syntheticCandidates.length}`);

  if (syntheticCandidates.length > 0) {
    console.log('\nCandidates:');
    for (const report of syntheticCandidates) {
      console.log(
        `- ${report.id} | user=${report.userId} | ${report.createdAt.toISOString()} | ${report.address}`
      );
    }
  }

  if (!purge) {
    console.log('\nDry-run only. No records deleted.');
    console.log('Run with --purge to delete the synthetic candidates listed above.');
    return;
  }

  if (syntheticCandidates.length === 0) {
    console.log('\nNo synthetic CMA reports to purge.');
    return;
  }

  const ids = syntheticCandidates.map((r) => r.id);
  const deleted = await prisma.rECMAReport.deleteMany({
    where: { id: { in: ids } },
  });

  console.log(`\nPurged synthetic CMA reports: ${deleted.count}`);
}

main()
  .catch((err) => {
    console.error('cleanup-synthetic-cma-reports failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

