#!/usr/bin/env tsx
/**
 * Monitor active listings for price changes and status updates.
 * Scrapes Centris listing pages to detect sold/rented/off-market properties
 * and price changes, then updates the database.
 *
 * Usage:
 *   npx tsx scripts/monitor-listings.ts                     # Check 100 stale listings
 *   npx tsx scripts/monitor-listings.ts --limit 500         # Check 500 listings
 *   npx tsx scripts/monitor-listings.ts --all               # Check all active listings
 *   npx tsx scripts/monitor-listings.ts --stale 6           # Only listings not checked in 6 hours
 *   npx tsx scripts/monitor-listings.ts --changes-only      # Only show changes (quiet mode)
 *
 * Recommended: Run daily via cron or scheduled task.
 *   0 6 * * * cd /path/to/nexrel-crm && npx tsx scripts/monitor-listings.ts --all >> logs/monitor.log 2>&1
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { monitorListings } from "../lib/listing-enrichment/monitor";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

function parseArgs() {
  const args = process.argv.slice(2);
  const opts: {
    limit: number;
    all: boolean;
    staleHours: number;
    delay: number;
    changesOnly: boolean;
    databaseUrl?: string;
  } = {
    limit: 100,
    all: false,
    staleHours: 12,
    delay: 1500,
    changesOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--limit":
        opts.limit = parseInt(args[++i], 10);
        break;
      case "--all":
        opts.all = true;
        break;
      case "--stale":
        opts.staleHours = parseInt(args[++i], 10);
        break;
      case "--delay":
        opts.delay = parseInt(args[++i], 10);
        break;
      case "--changes-only":
        opts.changesOnly = true;
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

  const prisma = new PrismaClient();
  try {
    const theodora = await prisma.user.findUnique({
      where: { email: THEODORA_EMAIL },
      include: { websites: true },
    });
    const website = theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
    if (website?.neonDatabaseUrl) {
      console.log("Auto-detected Theodora's database\n");
      return website.neonDatabaseUrl;
    }
  } finally {
    await prisma.$disconnect();
  }

  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  console.error("No database URL found. Set ENRICHMENT_DATABASE_URL or pass --db <url>");
  process.exit(1);
}

async function main() {
  const opts = parseArgs();
  const databaseUrl = await getDatabaseUrl(opts.databaseUrl);

  const limit = opts.all ? 99999 : opts.limit;
  const verbose = !opts.changesOnly;

  if (verbose) {
    console.log("Listing Price & Status Monitor\n");
    console.log(`  Check up to: ${opts.all ? "ALL" : limit} listings`);
    console.log(`  Stale after: ${opts.staleHours} hours`);
    console.log(`  Delay:       ${opts.delay}ms between requests`);
    console.log();
  }

  const { results, summary } = await monitorListings(databaseUrl, {
    limit,
    delayMs: opts.delay,
    verbose,
    staleBeyondHours: opts.staleHours,
  });

  console.log("\n" + "=".repeat(60));
  console.log("Monitor Summary");
  console.log("=".repeat(60));
  console.log(`  Total checked:   ${summary.total}`);
  console.log(`  No change:       ${summary.noChange}`);
  console.log(`  Price changes:   ${summary.priceChanges}`);
  console.log(`  Status changes:  ${summary.statusChanges}`);
  console.log(`  Removed/sold:    ${summary.removed}`);
  console.log(`  Errors:          ${summary.errors}`);
  console.log(`  Total time:      ${(summary.durationMs / 1000).toFixed(1)}s`);

  if (summary.priceChanges > 0) {
    console.log("\nPrice Changes:");
    results
      .filter((r) => r.action === "price_change")
      .forEach((r) => {
        console.log(`  ${r.mlsNumber}: $${parseFloat(r.oldPrice!).toLocaleString()} → $${parseFloat(r.newPrice!).toLocaleString()} (${r.details})`);
      });
  }

  if (summary.statusChanges > 0 || summary.removed > 0) {
    console.log("\nStatus Changes:");
    results
      .filter((r) => r.action === "status_change" || r.action === "removed")
      .forEach((r) => {
        console.log(`  ${r.mlsNumber}: ${r.oldStatus} → ${r.newStatus}${r.details ? ` (${r.details})` : ""}`);
      });
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
