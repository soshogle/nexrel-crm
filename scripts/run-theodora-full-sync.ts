#!/usr/bin/env tsx
/**
 * Run full sync for Theodora: Centris (main + broker featured) + Realtor.ca.
 * Run: npx tsx scripts/run-theodora-full-sync.ts
 *
 * Prerequisite: npx tsx scripts/set-theodora-realtor-url.ts (sets realtorBrokerUrl + centrisBrokerUrl)
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { runCentralCentrisSync, type BrokerOverride } from "../lib/centris-sync";
import { runRealtorSync } from "../lib/realtor-sync";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  if (!process.env.APIFY_TOKEN) {
    console.error("❌ APIFY_TOKEN not set in .env");
    process.exit(1);
  }

  console.log("🔄 Running full sync for Theodora (Centris + Realtor.ca)\n");

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website =
    theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];

  if (!website?.neonDatabaseUrl?.startsWith("postgresql://")) {
    console.error("❌ Theodora's website has no neonDatabaseUrl.");
    process.exit(1);
  }

  const ac = website.agencyConfig as Record<string, unknown> | null;
  const realtorUrl = (ac?.realtorBrokerUrl as string)?.trim();
  const centrisUrl = (ac?.centrisBrokerUrl as string)?.trim();

  if (!realtorUrl) {
    console.error("❌ realtorBrokerUrl not set. Run: npx tsx scripts/set-theodora-realtor-url.ts");
    process.exit(1);
  }

  const databaseUrl = website.neonDatabaseUrl;
  const databaseUrls = [databaseUrl];

  const brokerOverrides: BrokerOverride[] = centrisUrl
    ? [{ databaseUrl, centrisBrokerUrl: centrisUrl, centrisBrokerSoldUrl: undefined }]
    : [];

  console.log("   Centris broker URL:", centrisUrl || "(not set)");
  console.log("   Realtor URL:", realtorUrl);
  console.log("   DB: neonDatabaseUrl\n");

  // 1. Centris sync (main listings + broker's own as featured)
  console.log("📦 Step 1: Centris sync...");
  try {
    const centrisResult = await runCentralCentrisSync(
      databaseUrls,
      25,
      brokerOverrides.length > 0 ? brokerOverrides : undefined
    );
    console.log("   Fetched:", centrisResult.fetched);
    console.log("   Databases:", centrisResult.databases?.length ?? 0);
    const dbDetail = centrisResult.databases?.[0];
    if (dbDetail) {
      console.log("   Imported:", dbDetail.imported ?? 0);
      if (dbDetail.brokerFeatured != null) console.log("   Broker featured:", dbDetail.brokerFeatured);
    }
  } catch (err) {
    console.error("❌ Centris sync failed:", err);
    process.exit(1);
  }

  // 2. Realtor.ca sync
  console.log("\n📦 Step 2: Realtor.ca sync...");
  try {
    const realtorResult = await runRealtorSync(realtorUrl, databaseUrl);
    console.log("   Fetched:", realtorResult.fetched);
    console.log("   Imported:", realtorResult.imported);
    if (realtorResult.error) console.log("   Error:", realtorResult.error);
  } catch (err) {
    console.error("❌ Realtor sync failed:", err);
    process.exit(1);
  }

  console.log("\n✅ Full sync complete. Run verify: npx tsx scripts/verify-theodora-home-listings.ts");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
