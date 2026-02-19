#!/usr/bin/env tsx
/**
 * Run Realtor.ca sync for Theodora and print result.
 * Use to debug why her listings aren't appearing on the home screen.
 *
 * Run: npx tsx scripts/run-theodora-realtor-sync.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { runRealtorSync } from "../lib/realtor-sync";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  console.log("🔄 Running Realtor.ca sync for Theodora\n");

  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website =
    theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];

  if (!website?.neonDatabaseUrl) {
    console.error("❌ No website with neonDatabaseUrl found.");
    process.exit(1);
  }

  const ac = website.agencyConfig as Record<string, unknown> | null;
  const realtorUrl = ac?.realtorBrokerUrl as string | undefined;

  if (!realtorUrl?.trim()) {
    console.error("❌ realtorBrokerUrl not set in agencyConfig.");
    console.log("   Run: npx tsx scripts/set-theodora-realtor-url.ts");
    process.exit(1);
  }

  console.log("   Realtor URL:", realtorUrl);
  console.log("   DB: neonDatabaseUrl (same as Vercel DATABASE_URL)\n");

  if (!process.env.APIFY_TOKEN) {
    console.error("❌ APIFY_TOKEN not set in .env");
    process.exit(1);
  }

  try {
    const result = await runRealtorSync(realtorUrl.trim(), website.neonDatabaseUrl);
    console.log("✅ Sync complete:");
    console.log("   Fetched:", result.fetched);
    console.log("   Imported:", result.imported);
    if (result.error) console.log("   Error:", result.error);
    if (result.imported === 0 && result.fetched === 0) {
      console.log("\n⚠️  No listings returned. Check the Realtor.ca agent page has listings.");
    }
  } catch (err) {
    console.error("❌ Sync failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
