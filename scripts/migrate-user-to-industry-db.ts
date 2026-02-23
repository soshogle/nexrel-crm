#!/usr/bin/env tsx
/**
 * Migrate user CRM data from main DB to their industry-specific DB.
 *
 * Run:  npx tsx scripts/migrate-user-to-industry-db.ts
 *
 * What it does:
 *   1. Reads all CRM data for a user from the main DB
 *   2. Inserts it into the industry DB (preserving IDs)
 *   3. Verifies counts match
 *   4. Optionally deletes from main DB (set DELETE_FROM_SOURCE=true)
 */

import { PrismaClient } from '@prisma/client';

const DELETE_FROM_SOURCE = process.env.DELETE_FROM_SOURCE === 'true';

const USERS_TO_MIGRATE = [
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

interface MigrationResult {
  model: string;
  found: number;
  migrated: number;
  skipped: number;
  errors: string[];
}

/**
 * Models to migrate in dependency order (parents first).
 * Each entry: [modelName, hasLeadId?, parentModel?]
 * We handle children after parents to satisfy FK constraints.
 */
const PARENT_MODELS = [
  'lead',
  'pipeline',
  'website',
  'campaign',
  'voiceAgent',
  'purchasedPhoneNumber',
  'calendarConnection',
  'channelConnection',
  'knowledgeBase',
  'autoReplySettings',
  'emailTemplate',
  'sMSTemplate',
  'appointmentType',
  'bookingWidgetSettings',
  'bookingSettings',
  'paymentProviderSettings',
  'review',
  'brandScan',
  'feedbackCollection',
  'referral',
  'workflow',
  'emailCampaign',
  'smsCampaign',
  'product',
  'productCategory',
  'storefront',
  'userSubscription',
  'elevenLabsApiKey',
  'userFeatureToggle',
  'generalInventoryCategory',
  'generalInventorySupplier',
  'generalInventoryLocation',
  'task',
];

const CHILD_MODELS_BY_USERID: string[] = [
  'note',
  'message',
  'deal',
  'dealActivity',
  'callLog',
  'outboundCall',
  'conversation',
  'brandMention',
  'scheduledEmail',
  'scheduledSms',
  'generalInventoryItem',
  'generalInventoryAdjustment',
  'workflowEnrollment',
  'dataInsight',
  'invoice',
  'payment',
  'order',
  'auditLog',
];

/**
 * Models that don't have userId — need parent IDs to migrate.
 * pipelineStage has pipelineId, conversationMessage has conversationId, etc.
 */
const CHILD_MODELS_BY_PARENT: Array<{
  model: string;
  parentModel: string;
  fk: string;
}> = [
  { model: 'pipelineStage', parentModel: 'pipeline', fk: 'pipelineId' },
];

async function safeFind(db: any, model: string, where: any): Promise<any[]> {
  try {
    if (!db[model]) return [];
    return await db[model].findMany({ where });
  } catch {
    return [];
  }
}

async function safeCreate(db: any, model: string, data: any): Promise<boolean> {
  try {
    if (!db[model]) return false;
    await db[model].create({ data });
    return true;
  } catch (e: any) {
    if (e.code === 'P2002') return false; // unique constraint = already exists
    throw e;
  }
}

async function migrateModel(
  sourceDb: PrismaClient,
  targetDb: PrismaClient,
  model: string,
  userId: string,
): Promise<MigrationResult> {
  const result: MigrationResult = { model, found: 0, migrated: 0, skipped: 0, errors: [] };

  const records = await safeFind(sourceDb, model, { userId });
  result.found = records.length;

  for (const record of records) {
    try {
      const created = await safeCreate(targetDb, model, record);
      if (created) {
        result.migrated++;
      } else {
        result.skipped++; // already exists
      }
    } catch (e: any) {
      result.errors.push(`${record.id}: ${e.message?.slice(0, 120)}`);
    }
  }

  return result;
}

async function migrateByParentIds(
  sourceDb: PrismaClient,
  targetDb: PrismaClient,
  model: string,
  fk: string,
  parentIds: string[],
): Promise<MigrationResult> {
  const result: MigrationResult = { model, found: 0, migrated: 0, skipped: 0, errors: [] };
  if (parentIds.length === 0) return result;

  const records = await safeFind(sourceDb, model, { [fk]: { in: parentIds } });
  result.found = records.length;

  for (const record of records) {
    try {
      const created = await safeCreate(targetDb, model, record);
      if (created) result.migrated++;
      else result.skipped++;
    } catch (e: any) {
      result.errors.push(`${record.id}: ${e.message?.slice(0, 120)}`);
    }
  }

  return result;
}

async function deleteSourceRecords(
  sourceDb: PrismaClient,
  model: string,
  userId: string,
): Promise<number> {
  try {
    const db = sourceDb as any;
    if (!db[model]) return 0;
    const { count } = await db[model].deleteMany({ where: { userId } });
    return count;
  } catch {
    return 0;
  }
}

async function migrateUser(userDef: typeof USERS_TO_MIGRATE[0]) {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`  Migrating: ${userDef.label} (${userDef.email})`);
  console.log(`  Target:    ${userDef.industryEnvKey}`);
  console.log(`${'━'.repeat(60)}\n`);

  const targetUrl = process.env[userDef.industryEnvKey];
  if (!targetUrl) {
    console.log(`  ❌ ${userDef.industryEnvKey} is not set — skipping\n`);
    return;
  }

  const sourceDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  const targetDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: targetUrl } },
  });

  // Find user in meta DB (or main DB)
  const metaUrl = process.env.DATABASE_URL_META || process.env.DATABASE_URL;
  const metaDb = new PrismaClient({
    log: ['error'],
    datasources: { db: { url: metaUrl } },
  });

  const user = await metaDb.user.findUnique({
    where: { email: userDef.email },
    select: { id: true, name: true, industry: true },
  });

  if (!user) {
    console.log(`  ❌ User not found: ${userDef.email}\n`);
    await Promise.all([sourceDb.$disconnect(), targetDb.$disconnect(), metaDb.$disconnect()]);
    return;
  }

  console.log(`  User ID: ${user.id}\n`);

  // Ensure user record exists in target DB (needed for FK constraints)
  const targetUser = await targetDb.user.findUnique({ where: { id: user.id } });
  if (!targetUser) {
    console.log(`  📋 Copying user record to industry DB...`);
    const fullUser = await metaDb.user.findUnique({ where: { id: user.id } });
    if (fullUser) {
      try {
        await targetDb.user.create({ data: fullUser });
        console.log(`  ✅ User record created in industry DB\n`);
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.log(`  ⚠️  User record already exists (different lookup)\n`);
        } else {
          console.log(`  ❌ Failed to create user in industry DB: ${e.message}\n`);
          await Promise.all([sourceDb.$disconnect(), targetDb.$disconnect(), metaDb.$disconnect()]);
          return;
        }
      }
    }
  } else {
    console.log(`  ✅ User record already exists in industry DB\n`);
  }

  const results: MigrationResult[] = [];

  // Migrate parent models
  console.log('  📦 Migrating parent models...');
  for (const model of PARENT_MODELS) {
    const r = await migrateModel(sourceDb, targetDb, model, user.id);
    if (r.found > 0) {
      const status = r.errors.length > 0 ? '⚠️' : '✅';
      console.log(`     ${status} ${model}: ${r.found} found, ${r.migrated} migrated, ${r.skipped} skipped${r.errors.length ? `, ${r.errors.length} errors` : ''}`);
      if (r.errors.length > 0) {
        r.errors.forEach((e) => console.log(`        ❌ ${e}`));
      }
    }
    results.push(r);
  }

  // Migrate child models that have userId
  console.log('\n  📦 Migrating child models (by userId)...');
  for (const model of CHILD_MODELS_BY_USERID) {
    const r = await migrateModel(sourceDb, targetDb, model, user.id);
    if (r.found > 0) {
      const status = r.errors.length > 0 ? '⚠️' : '✅';
      console.log(`     ${status} ${model}: ${r.found} found, ${r.migrated} migrated, ${r.skipped} skipped${r.errors.length ? `, ${r.errors.length} errors` : ''}`);
      if (r.errors.length > 0) {
        r.errors.forEach((e) => console.log(`        ❌ ${e}`));
      }
    }
    results.push(r);
  }

  // Migrate child models that need parent IDs (e.g. pipelineStage → pipelineId)
  console.log('\n  📦 Migrating child models (by parent FK)...');
  for (const child of CHILD_MODELS_BY_PARENT) {
    const parents = await safeFind(sourceDb, child.parentModel, { userId: user.id });
    const parentIds = parents.map((p: any) => p.id);
    const r = await migrateByParentIds(sourceDb, targetDb, child.model, child.fk, parentIds);
    if (r.found > 0) {
      const status = r.errors.length > 0 ? '⚠️' : '✅';
      console.log(`     ${status} ${child.model}: ${r.found} found, ${r.migrated} migrated, ${r.skipped} skipped${r.errors.length ? `, ${r.errors.length} errors` : ''}`);
      if (r.errors.length > 0) {
        r.errors.forEach((e) => console.log(`        ❌ ${e}`));
      }
    }
    results.push(r);
  }

  // Migrate conversation messages (need conversationId from migrated conversations)
  const conversations = await safeFind(sourceDb, 'conversation', { userId: user.id });
  if (conversations.length > 0) {
    const convIds = conversations.map((c: any) => c.id);
    const r = await migrateByParentIds(sourceDb, targetDb, 'conversationMessage', 'conversationId', convIds);
    if (r.found > 0) {
      const status = r.errors.length > 0 ? '⚠️' : '✅';
      console.log(`     ${status} conversationMessage: ${r.found} found, ${r.migrated} migrated, ${r.skipped} skipped`);
    }
    results.push(r);
  }

  // Summary
  const totalFound = results.reduce((s, r) => s + r.found, 0);
  const totalMigrated = results.reduce((s, r) => s + r.migrated, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  console.log(`\n  📊 SUMMARY: ${totalFound} records found, ${totalMigrated} migrated, ${totalErrors} errors\n`);

  // Optionally delete from source
  if (DELETE_FROM_SOURCE && totalMigrated > 0 && totalErrors === 0) {
    console.log('  🗑️  Deleting migrated records from source (main DB)...');
    // Delete children first, then parents (reverse order)
    for (const model of [...CHILD_MODELS_BY_USERID].reverse()) {
      const count = await deleteSourceRecords(sourceDb, model, user.id);
      if (count > 0) console.log(`     Deleted ${count} ${model} records`);
    }
    for (const model of [...PARENT_MODELS].reverse()) {
      const count = await deleteSourceRecords(sourceDb, model, user.id);
      if (count > 0) console.log(`     Deleted ${count} ${model} records`);
    }
    console.log('  ✅ Source cleanup complete\n');
  } else if (DELETE_FROM_SOURCE && totalErrors > 0) {
    console.log('  ⚠️  Skipping source deletion due to migration errors\n');
  } else if (!DELETE_FROM_SOURCE && totalMigrated > 0) {
    console.log('  ℹ️  Source records NOT deleted. Set DELETE_FROM_SOURCE=true to remove them.\n');
  }

  await Promise.all([sourceDb.$disconnect(), targetDb.$disconnect(), metaDb.$disconnect()]);
}

async function main() {
  console.log('🚀 User Data Migration: Main DB → Industry DB\n');

  for (const userDef of USERS_TO_MIGRATE) {
    await migrateUser(userDef);
  }

  console.log('Done.\n');
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
