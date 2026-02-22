#!/usr/bin/env tsx
/**
 * Verify postal codes are synced in broker properties.
 * Connects to each broker DB and reports postal_code coverage.
 *
 * Run: npx tsx scripts/verify-postal-codes-sync.ts
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  const urls: { url: string; name?: string }[] = [];

  const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
  if (envUrls) {
    try {
      const parsed = JSON.parse(envUrls) as string[];
      urls.push(...parsed.filter((u) => typeof u === "string").map((u) => ({ url: u })));
    } catch {
      console.warn("Could not parse CENTRIS_REALTOR_DATABASE_URLS");
    }
  }

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
        urls.push({ url: w.neonDatabaseUrl, name: w.name ?? undefined });
      }
    }
  }

  const singleUrl = process.env.BROKER_DATABASE_URL;
  if (singleUrl && !urls.some((u) => u.url === singleUrl)) {
    urls.length = 0;
    urls.push({ url: singleUrl });
  }

  if (urls.length === 0) {
    console.error("❌ No broker database URLs found.");
    process.exit(1);
  }

  console.log(`\n📋 Verifying postal codes in ${urls.length} broker database(s)\n`);

  for (let i = 0; i < urls.length; i++) {
    const { url, name } = urls[i];
    const preview = url.replace(/:[^:@]+@/, ":****@").substring(0, 55) + "...";

    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } });
    try {
      await client.connect();

      const res = await client.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN postal_code IS NOT NULL AND TRIM(postal_code) != '' THEN 1 END) as with_postal
        FROM properties
      `);

      const total = parseInt(res.rows[0]?.total ?? "0", 10);
      const withPostal = parseInt(res.rows[0]?.with_postal ?? "0", 10);
      const pct = total > 0 ? ((withPostal / total) * 100).toFixed(1) : "0";

      console.log(`  [${i + 1}/${urls.length}] ${name ?? preview}`);
      console.log(`      Total: ${total} | With postal_code: ${withPostal} (${pct}%)`);

      if (withPostal > 0) {
        const sample = await client.query(`
          SELECT mls_number, title, postal_code, address
          FROM properties
          WHERE postal_code IS NOT NULL AND TRIM(postal_code) != ''
          LIMIT 3
        `);
        console.log(`      Sample: ${sample.rows.map((r) => `${r.mls_number}: ${r.postal_code}`).join(", ")}`);
      } else if (total > 0) {
        const sample = await client.query(`
          SELECT mls_number, title, address FROM properties LIMIT 2
        `);
        console.log(`      No postal codes (sample address): ${sample.rows[0]?.address ?? "N/A"}`);
      }
      console.log();
    } catch (err) {
      console.error(`  [${i + 1}] Error:`, err);
    } finally {
      await client.end();
    }
  }

  await prisma.$disconnect();
}

main();
