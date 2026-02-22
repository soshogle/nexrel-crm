#!/usr/bin/env tsx
/**
 * Add postal_code column to broker properties tables.
 * Run against each broker Neon DB. Used by sync-centris and sync flow.
 *
 * Run: npx tsx scripts/add-postal-code-to-broker-properties.ts
 * Or with specific URL: BROKER_DATABASE_URL=postgresql://... npx tsx scripts/add-postal-code-to-broker-properties.ts
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

const ADD_POSTAL_CODE_SQL = `
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
  CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON properties (postal_code) WHERE postal_code IS NOT NULL;
`;

async function main() {
  const urls: string[] = [];

  // Try CENTRIS_REALTOR_DATABASE_URLS
  const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
  if (envUrls) {
    try {
      const parsed = JSON.parse(envUrls) as string[];
      urls.push(...parsed);
    } catch {
      console.warn("Could not parse CENTRIS_REALTOR_DATABASE_URLS");
    }
  }

  // Fallback: All real estate broker websites (SERVICE template) with neonDatabaseUrl
  if (urls.length === 0) {
    const websites = await prisma.website.findMany({
      where: {
        templateType: "SERVICE",
        neonDatabaseUrl: { not: null },
      },
      select: { neonDatabaseUrl: true, name: true },
    });
    const seen = new Set<string>();
    for (const w of websites) {
      if (w.neonDatabaseUrl && !seen.has(w.neonDatabaseUrl)) {
        seen.add(w.neonDatabaseUrl);
        urls.push(w.neonDatabaseUrl);
      }
    }
    console.log(`   Found ${websites.length} real estate website(s) with database`);
  }

  // Single broker DB override (use BROKER_DATABASE_URL; do NOT use DATABASE_URL - that's the CRM)
  const singleUrl = process.env.BROKER_DATABASE_URL;
  if (singleUrl && !urls.includes(singleUrl)) {
    urls.length = 0;
    urls.push(singleUrl);
  }

  if (urls.length === 0) {
    console.error("❌ No broker database URLs found. Set CENTRIS_REALTOR_DATABASE_URLS or ensure SERVICE websites have neonDatabaseUrl.");
    process.exit(1);
  }

  console.log(`\n📋 Adding postal_code to ${urls.length} broker database(s)\n`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const preview = url.replace(/:[^:@]+@/, ":****@").substring(0, 60) + "...";
    console.log(`  [${i + 1}/${urls.length}] ${preview}`);

    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
    try {
      await client.connect();
      await client.query(ADD_POSTAL_CODE_SQL);
      console.log(`     ✅ postal_code column added`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('relation "properties" does not exist')) {
        console.log(`     ⚠️  properties table does not exist`);
        console.log(`        This URL may point to the CRM DB (ep-noisy-meadow), not a broker DB.`);
        console.log(`        Broker DBs (e.g. Theodora's ep-delicate-bar) have the properties table.`);
        console.log(`        Fix: Set Website.neonDatabaseUrl to the broker's Neon DB URL.`);
        console.log(`        Or set CENTRIS_REALTOR_DATABASE_URLS to the broker DB URL(s).`);
      } else {
        console.error(`     ❌ ${errMsg}`);
      }
    } finally {
      await client.end();
    }
  }

  console.log("\n✅ Done. Re-run Centris/Realtor sync to populate postal_code.\n");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
