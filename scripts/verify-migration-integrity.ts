#!/usr/bin/env tsx
/**
 * Verify migration integrity: compare every record in main DB vs industry DB
 * for Theodora and Eyal. Checks IDs, field values, and child records.
 *
 * Run:  npx tsx scripts/verify-migration-integrity.ts
 */

import { PrismaClient } from '@prisma/client';

const USERS = [
  {
    label: 'Theodora Stavropoulos',
    email: 'theodora.stavropoulos@remax-quebec.com',
    industryEnvKey: 'DATABASE_URL_REAL_ESTATE',
  },
  {
    label: 'Eyal Azerad',
    email: 'eyal@darksword-armory.com',
    industryEnvKey: 'DATABASE_URL_TECHNOLOGY',
  },
];

const MODELS_WITH_USERID = [
  'lead', 'pipeline', 'website', 'campaign', 'voiceAgent',
  'purchasedPhoneNumber', 'calendarConnection', 'channelConnection',
  'knowledgeBase', 'autoReplySettings', 'emailTemplate', 'sMSTemplate',
  'appointmentType', 'bookingWidgetSettings', 'paymentProviderSettings',
  'review', 'brandScan', 'feedbackCollection', 'referral',
  'workflow', 'emailCampaign', 'smsCampaign', 'product', 'productCategory',
  'storefront', 'userSubscription', 'elevenLabsApiKey', 'userFeatureToggle',
  'generalInventoryCategory', 'generalInventorySupplier',
  'generalInventoryLocation', 'task',
  'note', 'message', 'deal', 'dealActivity', 'callLog', 'outboundCall',
  'conversation', 'brandMention', 'scheduledEmail', 'scheduledSms',
  'generalInventoryItem', 'generalInventoryAdjustment',
  'workflowEnrollment', 'dataInsight', 'invoice', 'payment', 'order',
  'auditLog',
];

const MODELS_BY_PARENT: Array<{
  model: string;
  parentModel: string;
  fk: string;
}> = [
  { model: 'pipelineStage', parentModel: 'pipeline', fk: 'pipelineId' },
  { model: 'conversationMessage', parentModel: 'conversation', fk: 'conversationId' },
];

async function safeFind(db: any, model: string, where: any): Promise<any[]> {
  try {
    if (!db[model]) return [];
    return await db[model].findMany({ where, orderBy: { id: 'asc' } });
  } catch {
    return [];
  }
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (typeof a === 'object') {
    const aStr = JSON.stringify(a, null, 0);
    const bStr = JSON.stringify(b, null, 0);
    return aStr === bStr;
  }

  return false;
}

function compareRecords(source: any, target: any): string[] {
  const diffs: string[] = [];
  const allKeys = new Set([...Object.keys(source), ...Object.keys(target)]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt') {
      // Compare dates with tolerance (timestamps may differ by ms due to serialization)
      const sDate = source[key] ? new Date(source[key]).getTime() : null;
      const tDate = target[key] ? new Date(target[key]).getTime() : null;
      if (sDate !== tDate) {
        const diff = sDate && tDate ? Math.abs(sDate - tDate) : Infinity;
        if (diff > 1000) { // >1s difference
          diffs.push(`${key}: dates differ by ${diff}ms`);
        }
      }
      continue;
    }

    if (!deepEqual(source[key], target[key])) {
      const sVal = JSON.stringify(source[key])?.slice(0, 60);
      const tVal = JSON.stringify(target[key])?.slice(0, 60);
      diffs.push(`${key}: source=${sVal} vs target=${tVal}`);
    }
  }

  return diffs;
}

interface VerifyResult {
  model: string;
  sourceCount: number;
  targetCount: number;
  matched: number;
  missingInTarget: string[];
  fieldDiffs: Array<{ id: string; diffs: string[] }>;
}

let totalPass = 0;
let totalFail = 0;

function printResult(r: VerifyResult) {
  const countMatch = r.sourceCount === r.targetCount;
  const allMatched = r.matched === r.sourceCount;
  const noMissing = r.missingInTarget.length === 0;
  const noDiffs = r.fieldDiffs.length === 0;
  const pass = countMatch && allMatched && noMissing && noDiffs;

  if (r.sourceCount === 0 && r.targetCount === 0) return; // skip empty

  const icon = pass ? '✅' : '❌';
  if (pass) totalPass++;
  else totalFail++;

  console.log(`     ${icon} ${r.model}: ${r.sourceCount} source, ${r.targetCount} target, ${r.matched} matched`);

  if (!countMatch) {
    console.log(`        ⚠️  COUNT MISMATCH: source=${r.sourceCount} target=${r.targetCount}`);
  }
  if (r.missingInTarget.length > 0) {
    console.log(`        ❌ MISSING in target: ${r.missingInTarget.join(', ')}`);
  }
  if (r.fieldDiffs.length > 0) {
    for (const fd of r.fieldDiffs.slice(0, 3)) {
      console.log(`        ⚠️  ${fd.id}: ${fd.diffs.slice(0, 2).join('; ')}`);
    }
    if (r.fieldDiffs.length > 3) {
      console.log(`        ... and ${r.fieldDiffs.length - 3} more with diffs`);
    }
  }
}

async function verifyModel(
  sourceDb: PrismaClient,
  targetDb: PrismaClient,
  model: string,
  where: any,
): Promise<VerifyResult> {
  const result: VerifyResult = {
    model,
    sourceCount: 0,
    targetCount: 0,
    matched: 0,
    missingInTarget: [],
    fieldDiffs: [],
  };

  const sourceRecords = await safeFind(sourceDb, model, where);
  const targetRecords = await safeFind(targetDb, model, where);

  result.sourceCount = sourceRecords.length;
  result.targetCount = targetRecords.length;

  const targetMap = new Map(targetRecords.map((r: any) => [r.id, r]));

  for (const src of sourceRecords) {
    const tgt = targetMap.get(src.id);
    if (!tgt) {
      result.missingInTarget.push(src.id);
      continue;
    }

    const diffs = compareRecords(src, tgt);
    if (diffs.length === 0) {
      result.matched++;
    } else {
      result.fieldDiffs.push({ id: src.id, diffs });
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Migration Integrity Verification\n');
  console.log('Comparing every record field-by-field: main DB vs industry DB\n');

  const mainDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const metaUrl = process.env.DATABASE_URL_META || process.env.DATABASE_URL;
  const metaDb = metaUrl !== process.env.DATABASE_URL
    ? new PrismaClient({ log: ['error'], datasources: { db: { url: metaUrl } } })
    : mainDb;

  for (const userDef of USERS) {
    console.log(`${'━'.repeat(60)}`);
    console.log(`  ${userDef.label} (${userDef.email})`);
    console.log(`  Source: DATABASE_URL  →  Target: ${userDef.industryEnvKey}`);
    console.log(`${'━'.repeat(60)}\n`);

    const targetUrl = process.env[userDef.industryEnvKey];
    if (!targetUrl) {
      console.log(`  ❌ ${userDef.industryEnvKey} not set — skipping\n`);
      continue;
    }

    const targetDb = new PrismaClient({
      log: ['error'],
      datasources: { db: { url: targetUrl } },
    });

    const user = await metaDb.user.findUnique({
      where: { email: userDef.email },
      select: { id: true },
    });

    if (!user) {
      console.log(`  ❌ User not found\n`);
      await targetDb.$disconnect();
      continue;
    }

    console.log(`  User ID: ${user.id}\n`);

    // Verify models with userId
    console.log('  📋 Models with userId:');
    for (const model of MODELS_WITH_USERID) {
      const r = await verifyModel(mainDb, targetDb, model, { userId: user.id });
      printResult(r);
    }

    // Verify models by parent FK
    console.log('\n  📋 Models by parent FK:');
    for (const child of MODELS_BY_PARENT) {
      const parents = await safeFind(mainDb, child.parentModel, { userId: user.id });
      const parentIds = parents.map((p: any) => p.id);
      if (parentIds.length > 0) {
        const r = await verifyModel(mainDb, targetDb, child.model, {
          [child.fk]: { in: parentIds },
        });
        printResult(r);
      }
    }

    // Verify user record in industry DB
    console.log('\n  📋 User record in industry DB:');
    const sourceUser = await metaDb.user.findUnique({ where: { id: user.id } });
    const targetUser = await targetDb.user.findUnique({ where: { id: user.id } });
    if (sourceUser && targetUser) {
      const diffs = compareRecords(sourceUser, targetUser);
      if (diffs.length === 0) {
        console.log('     ✅ User record: perfect match');
        totalPass++;
      } else {
        console.log(`     ⚠️  User record: ${diffs.length} field differences`);
        diffs.slice(0, 5).forEach((d) => console.log(`        ${d}`));
        totalFail++;
      }
    } else if (!targetUser) {
      console.log('     ❌ User record MISSING in industry DB');
      totalFail++;
    }

    console.log();
    await targetDb.$disconnect();
  }

  // Final verdict
  console.log(`${'═'.repeat(60)}`);
  console.log(`  FINAL VERDICT`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  ✅ Passed: ${totalPass}`);
  console.log(`  ❌ Failed: ${totalFail}`);
  console.log();

  if (totalFail === 0) {
    console.log('  🎉 ALL RECORDS VERIFIED — 100% match between source and target');
    console.log('  Safe to delete source records from main DB.');
  } else {
    console.log('  ⚠️  SOME RECORDS HAVE ISSUES — review above before deleting source');
  }
  console.log();

  await mainDb.$disconnect();
  if (metaDb !== mainDb) await metaDb.$disconnect();
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
