#!/usr/bin/env tsx
/**
 * Diagnose missing user data for Theodora and Eyal.
 *
 * Checks:
 *   1. User record exists and has correct industry
 *   2. CRM data (leads, deals, tasks, etc.) in main DB
 *   3. CRM data in industry-specific DB (if configured)
 *   4. Reports where data lives and what fix is needed
 *
 * Run:  npx tsx scripts/diagnose-user-data.ts
 */

import { PrismaClient } from '@prisma/client';

const USERS_TO_CHECK = [
  {
    label: 'Theodora Stavropoulos',
    email: 'theodora.stavropoulos@remax-quebec.com',
    expectedIndustry: 'REAL_ESTATE',
  },
  {
    label: 'Eyal Azerad',
    email: 'eyal@darksword-armory.com',
    expectedIndustry: 'TECHNOLOGY',
  },
];

function createClient(url: string | undefined, label: string): PrismaClient | null {
  if (!url) {
    console.log(`   ⚠️  ${label} not configured`);
    return null;
  }
  return new PrismaClient({
    log: ['error'],
    datasources: { db: { url } },
  });
}

async function safeCount(db: any, model: string, userId: string): Promise<number> {
  try {
    if (!db[model]) return -1;
    return await db[model].count({ where: { userId } });
  } catch {
    return -1;
  }
}

async function countUserData(db: PrismaClient, userId: string) {
  const models = ['lead', 'deal', 'task', 'campaign', 'contact', 'appointment', 'website', 'review'];
  const results = await Promise.all(models.map((m) => safeCount(db, m, userId)));
  return Object.fromEntries(models.map((m, i) => [m + 's', results[i]]));
}

function printCounts(label: string, counts: Record<string, number>) {
  const total = Object.values(counts).filter((v) => v > 0).reduce((a, b) => a + b, 0);
  const entries = Object.entries(counts)
    .map(([k, v]) => `${k}: ${v === -1 ? 'N/A' : v}`)
    .join(', ');
  console.log(`   ${label}: ${entries} (total: ${total})`);
  return total;
}

async function main() {
  console.log('🔍 Diagnosing user data\n');
  console.log('Environment:');
  console.log(`   DATABASE_URL:             ${process.env.DATABASE_URL ? '✅ set' : '❌ missing'}`);
  console.log(`   DATABASE_URL_META:        ${process.env.DATABASE_URL_META ? '✅ set' : '⚪ not set (using DATABASE_URL)'}`);
  console.log(`   DATABASE_URL_REAL_ESTATE: ${process.env.DATABASE_URL_REAL_ESTATE ? '✅ set' : '⚪ not set'}`);
  console.log(`   DATABASE_URL_TECHNOLOGY:  ${process.env.DATABASE_URL_TECHNOLOGY ? '✅ set' : '⚪ not set'}`);
  console.log();

  const mainDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const metaUrl = process.env.DATABASE_URL_META || process.env.DATABASE_URL;
  const metaDb = metaUrl !== process.env.DATABASE_URL
    ? new PrismaClient({ log: ['error'], datasources: { db: { url: metaUrl } } })
    : mainDb;

  const industryDbs: Record<string, PrismaClient | null> = {
    REAL_ESTATE: createClient(process.env.DATABASE_URL_REAL_ESTATE, 'DATABASE_URL_REAL_ESTATE'),
    TECHNOLOGY: createClient(process.env.DATABASE_URL_TECHNOLOGY, 'DATABASE_URL_TECHNOLOGY'),
  };

  console.log();

  for (const userDef of USERS_TO_CHECK) {
    console.log(`━━━ ${userDef.label} (${userDef.email}) ━━━\n`);

    // 1. Find user in Meta DB
    let user: any = null;
    try {
      user = await metaDb.user.findUnique({
        where: { email: userDef.email },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          industry: true,
          accountStatus: true,
          onboardingCompleted: true,
          createdAt: true,
        },
      });
    } catch (e: any) {
      console.log(`   ❌ Failed to query Meta DB: ${e.message}`);
    }

    if (!user) {
      // Try main DB if different
      if (metaDb !== mainDb) {
        try {
          user = await mainDb.user.findUnique({
            where: { email: userDef.email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              industry: true,
              accountStatus: true,
              onboardingCompleted: true,
              createdAt: true,
            },
          });
          if (user) console.log(`   ⚠️  User found in main DB but NOT in Meta DB`);
        } catch {}
      }
    }

    if (!user) {
      console.log(`   ❌ User NOT FOUND in any database`);
      console.log(`   → Run the user creation script for ${userDef.label}\n`);
      continue;
    }

    console.log(`   ✅ User found: id=${user.id}`);
    console.log(`      name:       ${user.name}`);
    console.log(`      role:       ${user.role}`);
    console.log(`      industry:   ${user.industry ?? 'NULL ⚠️'}`);
    console.log(`      status:     ${user.accountStatus}`);
    console.log(`      onboarding: ${user.onboardingCompleted}`);
    console.log(`      created:    ${user.createdAt}`);
    console.log();

    // 2. Check industry field
    if (!user.industry) {
      console.log(`   ⚠️  PROBLEM: industry is NULL`);
      console.log(`      Session will have no industry → DAL routes to main DB`);
      console.log(`      FIX: UPDATE "User" SET industry = '${userDef.expectedIndustry}' WHERE id = '${user.id}';`);
      console.log();
    } else if (user.industry !== userDef.expectedIndustry) {
      console.log(`   ⚠️  PROBLEM: industry = '${user.industry}' (expected '${userDef.expectedIndustry}')`);
      console.log(`      DAL routes to DATABASE_URL_${user.industry} instead of DATABASE_URL_${userDef.expectedIndustry}`);
      console.log();
    }

    // 3. Count data in main DB
    console.log(`   📊 Data in MAIN DB (DATABASE_URL):`);
    const mainCounts = await countUserData(mainDb, user.id);
    const mainTotal = printCounts('Main DB', mainCounts);

    // 4. Count data in industry DB (if configured)
    const industryDb = industryDbs[userDef.expectedIndustry];
    let industryTotal = 0;
    if (industryDb) {
      const isSameAsMain =
        process.env[`DATABASE_URL_${userDef.expectedIndustry}`] === process.env.DATABASE_URL;
      if (isSameAsMain) {
        console.log(`   📊 Industry DB (DATABASE_URL_${userDef.expectedIndustry}): same as main DB`);
      } else {
        console.log(`   📊 Data in INDUSTRY DB (DATABASE_URL_${userDef.expectedIndustry}):`);
        try {
          const industryCounts = await countUserData(industryDb, user.id);
          industryTotal = printCounts('Industry DB', industryCounts);
        } catch (e: any) {
          console.log(`   ❌ Failed to query industry DB: ${e.message}`);
        }
      }
    }

    // 5. Determine the current routing path
    console.log();
    const hasIndustryEnv = !!process.env[`DATABASE_URL_${user.industry}`];
    if (user.industry && hasIndustryEnv) {
      console.log(`   🔀 Current routing: session.industry='${user.industry}' → DATABASE_URL_${user.industry}`);
    } else if (user.industry && !hasIndustryEnv) {
      console.log(`   🔀 Current routing: session.industry='${user.industry}' but DATABASE_URL_${user.industry} not set → falls back to main DB`);
    } else {
      console.log(`   🔀 Current routing: session.industry=NULL → main DB`);
    }

    // 6. Diagnosis
    console.log();
    if (mainTotal > 0 && industryTotal === 0 && industryDb) {
      console.log(`   🔎 DIAGNOSIS: Data is in MAIN DB but queries may route to INDUSTRY DB (empty)`);
      console.log(`      Option A: Remove DATABASE_URL_${userDef.expectedIndustry} env var so queries use main DB`);
      console.log(`      Option B: Migrate data from main DB to industry DB`);
    } else if (mainTotal === 0 && industryTotal > 0) {
      console.log(`   🔎 DIAGNOSIS: Data is in INDUSTRY DB — make sure industry field is set correctly`);
      if (!user.industry || user.industry !== userDef.expectedIndustry) {
        console.log(`      FIX: UPDATE "User" SET industry = '${userDef.expectedIndustry}' WHERE id = '${user.id}';`);
      }
    } else if (mainTotal === 0 && industryTotal === 0) {
      console.log(`   🔎 DIAGNOSIS: No CRM data found in any database`);
      console.log(`      Either data was never created, or it was lost during migration`);
      console.log(`      Check backups/ folder for any data snapshots`);
    } else if (mainTotal > 0 && !industryDb) {
      console.log(`   ✅ Data is in main DB and no industry DB is configured — routing is correct`);
    } else if (mainTotal > 0 && industryTotal > 0) {
      console.log(`   ⚠️  Data exists in BOTH main DB and industry DB — possible duplication`);
      console.log(`      Verify which is authoritative and remove the other`);
    }

    console.log('\n');
  }

  // Cleanup
  await mainDb.$disconnect();
  if (metaDb !== mainDb) await metaDb.$disconnect();
  for (const db of Object.values(industryDbs)) {
    if (db) await db.$disconnect();
  }

  console.log('Done.\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
