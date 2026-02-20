#!/usr/bin/env tsx
/**
 * Enrich sparse property listings with detailed data from Centris, AI Vision,
 * and Google Search. Updates the listing database with description, features,
 * room details, high-res images, year built, area, etc.
 *
 * Usage:
 *   npx tsx scripts/enrich-listings.ts                    # Enrich 20 listings (default)
 *   npx tsx scripts/enrich-listings.ts --limit 50         # Enrich 50 listings
 *   npx tsx scripts/enrich-listings.ts --limit 5 --tier1  # Tier 1 only (fast, no AI)
 *   npx tsx scripts/enrich-listings.ts --id 1234          # Enrich a single listing by ID
 *   npx tsx scripts/enrich-listings.ts --all              # Enrich all sparse listings
 *
 * Environment:
 *   Required: DATABASE_URL or Theodora's neonDatabaseUrl (auto-detected)
 *   Optional: OPENAI_API_KEY (for Tier 2 vision)
 *   Optional: SERPAPI_KEY (for Tier 3 Google search)
 *
 * Tier 1: Direct Centris page scraping (free, ~2s per listing)
 * Tier 2: Screenshot + GPT-4o Vision (~$0.01-0.03 per listing)
 * Tier 3: Google Search → scrape (~$0.01 per search via SerpAPI)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { enrichListings, enrichSingleListingById } from "../lib/listing-enrichment";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    limit: number;
    id?: number;
    tier1Only: boolean;
    tier2Only: boolean;
    all: boolean;
    delay: number;
    databaseUrl?: string;
  } = {
    limit: 20,
    tier1Only: false,
    tier2Only: false,
    all: false,
    delay: 2000,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--id":
        opts.id = parseInt(args[++i], 10);
        break;
      case "--tier1":
        opts.tier1Only = true;
        break;
      case "--tier2":
        opts.tier2Only = true;
        break;
      case "--all":
        opts.all = true;
        break;
      case "--delay":
        opts.delay = parseInt(args[++i], 10);
        break;
      case "--db":
        opts.databaseUrl = args[++i];
        break;
    }
  }
  return opts;
}

async function getDatabaseUrl(manualUrl?: string): Promise<string> {
  if (manualUrl) return manualUrl;
  if (process.env.ENRICHMENT_DATABASE_URL) return process.env.ENRICHMENT_DATABASE_URL;

  // Auto-detect: try Theodora's neonDatabaseUrl from CRM
  const prisma = new PrismaClient();
  try {
    const theodora = await prisma.user.findUnique({
      where: { email: THEODORA_EMAIL },
      include: { websites: true },
    });
    const website = theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
    if (website?.neonDatabaseUrl) {
      console.log(`📍 Auto-detected Theodora's database\n`);
      return website.neonDatabaseUrl;
    }
  } finally {
    await prisma.$disconnect();
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  console.error("❌ No database URL found.");
  console.log("   Set ENRICHMENT_DATABASE_URL or pass --db <url>");
  process.exit(1);
}

async function main() {
  const opts = parseArgs();
  const databaseUrl = await getDatabaseUrl(opts.databaseUrl);

  console.log("🔍 Listing Enrichment System\n");
  console.log(`   Tier 1: Centris page scraping ${opts.tier2Only ? "(disabled)" : "✅"}`);
  console.log(
    `   Tier 2: Screenshot + AI Vision ${opts.tier1Only ? "(disabled)" : process.env.OPENAI_API_KEY ? "✅" : "⚠️  No OPENAI_API_KEY"}`
  );
  console.log(
    `   Tier 3: Google Search ${opts.tier1Only || opts.tier2Only ? "(disabled)" : process.env.SERPAPI_KEY ? "✅ (SerpAPI)" : "✅ (Playwright)"}`
  );
  console.log();

  // Single listing mode
  if (opts.id) {
    console.log(`📌 Enriching listing #${opts.id}\n`);
    const result = await enrichSingleListingById(databaseUrl, opts.id, {
      enableTier2: !opts.tier1Only,
      enableTier3: !opts.tier1Only && !opts.tier2Only,
      verbose: true,
    });

    if (result.success) {
      console.log(`\n✅ Enriched via Tier ${result.tier} (${result.durationMs}ms)`);
      if (result.data) {
        const fields = Object.entries(result.data)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => {
            if (typeof v === "string") return `${k}: "${v.slice(0, 60)}${v.length > 60 ? "..." : ""}"`;
            if (Array.isArray(v)) return `${k}: [${v.length} items]`;
            return `${k}: ${JSON.stringify(v)}`;
          });
        console.log("   Fields updated:");
        fields.forEach((f) => console.log(`     ${f}`));
      }
    } else {
      console.log(`\n❌ Failed: ${result.error}`);
    }
    return;
  }

  // Batch mode
  const limit = opts.all ? 9999 : opts.limit;
  console.log(`📦 Enriching up to ${opts.all ? "ALL" : limit} sparse listings\n`);
  console.log(`   Delay: ${opts.delay}ms between requests`);
  console.log();

  const { results, summary } = await enrichListings(databaseUrl, {
    limit,
    delayMs: opts.delay,
    enableTier2: !opts.tier1Only,
    enableTier3: !opts.tier1Only && !opts.tier2Only,
    verbose: true,
  });

  console.log("\n" + "=".repeat(60));
  console.log("📊 Summary");
  console.log("=".repeat(60));
  console.log(`   Total processed: ${summary.total}`);
  console.log(`   Enriched:        ${summary.enriched}`);
  console.log(`   Failed:          ${summary.failed}`);
  console.log(`   Tier 1 (Centris): ${summary.tier1}`);
  console.log(`   Tier 2 (Vision):  ${summary.tier2}`);
  console.log(`   Tier 3 (Google):  ${summary.tier3}`);
  console.log(`   Total time:       ${(summary.totalDurationMs / 1000).toFixed(1)}s`);
  console.log(
    `   Avg per listing:  ${summary.total > 0 ? (summary.totalDurationMs / summary.total / 1000).toFixed(1) : 0}s`
  );

  if (summary.failed > 0) {
    console.log("\n❌ Failed listings:");
    results
      .filter((r) => !r.success)
      .forEach((r) => console.log(`   ${r.mlsNumber}: ${r.error}`));
  }

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
