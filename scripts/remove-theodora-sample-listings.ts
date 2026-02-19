#!/usr/bin/env tsx
/**
 * Remove sample listings (SAMPLE-001, SAMPLE-002, etc.) from Theodora's Neon DB.
 * Leaves only real Centris.ca and Realtor.ca listings.
 *
 * Run: npx tsx scripts/remove-theodora-sample-listings.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/remove-theodora-sample-listings.ts
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  if (dryRun) console.log("🔍 DRY RUN – no changes will be made\n");

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website =
    theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
  const databaseUrl = website?.neonDatabaseUrl;

  if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
    console.error("❌ Theodora's website has no neonDatabaseUrl set.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    // Count sample listings before delete
    const countRes = await client.query(
      `SELECT COUNT(*) as count FROM properties WHERE mls_number LIKE 'SAMPLE-%'`
    );
    const sampleCount = parseInt(String(countRes.rows[0]?.count ?? 0), 10);

    if (sampleCount === 0) {
      console.log("✅ No sample listings found. DB is already clean.");
      return;
    }

    console.log(`Found ${sampleCount} sample listing(s) to remove.`);

    if (!dryRun) {
      // Delete saved_properties references first (FK constraint) - try property_id or propertyId
      try {
        const savedRes = await client.query(
          `DELETE FROM saved_properties WHERE property_id IN (SELECT id FROM properties WHERE mls_number LIKE 'SAMPLE-%')`
        );
        const savedDeleted = savedRes.rowCount ?? 0;
        if (savedDeleted > 0) console.log(`   Removed ${savedDeleted} saved_properties reference(s).`);
      } catch {
        // Table or column may not exist; continue with properties delete
      }

      const deleteRes = await client.query(
        `DELETE FROM properties WHERE mls_number LIKE 'SAMPLE-%'`
      );
      const deleted = deleteRes.rowCount ?? sampleCount;
      console.log(`✅ Deleted ${deleted} sample listing(s).`);
    } else {
      console.log(`[dry] Would delete ${sampleCount} sample listing(s).`);
    }

    // Show remaining count
    const remainingRes = await client.query(
      `SELECT COUNT(*) as count FROM properties WHERE status = 'active'`
    );
    const remaining = parseInt(String(remainingRes.rows[0]?.count ?? 0), 10);
    console.log(`\nActive listings remaining: ${remaining}`);
    if (remaining === 0) {
      console.log("\n💡 Run the Centris/Realtor sync to populate real listings:");
      console.log("   Dashboard → Websites → Theodora's site → Sync, or");
      console.log("   Trigger the cron: GET /api/cron/sync-centris");
    }
  } finally {
    await client.end();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
