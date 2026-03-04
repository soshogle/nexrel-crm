#!/usr/bin/env tsx
/**
 * Unfeature listings in Theodora's website DB that are NOT her own.
 * Sets is_featured = false for 35 Rue Apple Hill (MLS 22654541) and 42 Rue Balsam (MLS 24452849).
 * Her two rentals (centris-16974529, centris-16006282) stay featured.
 *
 * Run: npx tsx scripts/unfeature-theodora-non-broker-listings.ts
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

const MLS_TO_UNFEATURE = ["22654541", "24452849"]; // 35 Apple Hill, 42 Balsam

async function main() {
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website =
    theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
  const databaseUrl = website?.neonDatabaseUrl;

  if (!databaseUrl?.startsWith("postgresql://")) {
    console.error("❌ Theodora's website has no neonDatabaseUrl.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    const result = await client.query(
      `UPDATE properties
       SET is_featured = false, updated_at = NOW()
       WHERE mls_number = ANY($1::text[]) AND is_featured = true
       RETURNING id, mls_number, slug, address`,
      [MLS_TO_UNFEATURE]
    );

    console.log("✅ Unfeatured non-broker listings:");
    for (const row of result.rows) {
      console.log(`   id=${row.id} mls=${row.mls_number} ${row.address}`);
    }
    if (result.rowCount === 0) {
      console.log("   (none were featured)");
    }
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
