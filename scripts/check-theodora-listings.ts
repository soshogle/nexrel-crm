#!/usr/bin/env tsx
/**
 * Check Theodora's live site: listings DB + CRM config.
 * Fetches /api/debug/listings and prints actionable diagnostics.
 *
 * Run: npx tsx scripts/check-theodora-listings.ts
 * Or:  THEODORA_LIVE_URL=https://your-url.vercel.app npx tsx scripts/check-theodora-listings.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";
const DEFAULT_URL = "https://theodora-stavropoulos-remax.vercel.app";

async function main() {
  const baseUrl =
    process.env.THEODORA_LIVE_URL ||
    (await getTheodoraVercelUrl()) ||
    DEFAULT_URL;
  const url = baseUrl.replace(/\/$/, "") + "/api/debug/listings";

  console.log("🔍 Checking Theodora's live site\n");
  console.log("   URL:", url);
  console.log("");

  let data: Record<string, unknown>;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("❌ Request failed:", res.status, res.statusText);
      console.log("   The site may be down, or the URL is wrong.");
      console.log("   Set THEODORA_LIVE_URL if her site uses a different domain.");
      process.exit(1);
    }
    data = (await res.json()) as Record<string, unknown>;
  } catch (e) {
    console.error("❌ Fetch failed:", (e as Error).message);
    console.log("   Check the URL and network.");
    process.exit(1);
  }

  const dbOk = data.databaseConfigured === true;
  const total = Number(data.totalListings ?? 0);
  const firstMls = data.firstMlsNumber as string | null;
  const isSample = data.isSampleData === true;
  const error = data.error as string | null;
  const env = (data.env as Record<string, unknown>) ?? {};

  console.log("📊 Results\n");
  console.log("   databaseConfigured:", dbOk ? "✅ true" : "❌ false");
  console.log("   totalListings:", total);
  console.log("   firstMlsNumber:", firstMls ?? "(none)");
  console.log("   isSampleData:", isSample ? "⚠️ true (wrong DB)" : "false");
  if (error) console.log("   error:", error);
  console.log("");
  console.log("   CRM env:");
  console.log("     hasNexrelCrmUrl:", env.hasNexrelCrmUrl ? "✅" : "❌");
  console.log("     hasNexrelWebsiteId:", env.hasNexrelWebsiteId ? "✅" : "❌");
  console.log("     hasWebsiteVoiceConfigSecret:", env.hasWebsiteVoiceConfigSecret ? "✅" : "❌");
  console.log("     agencyConfigFetched:", env.agencyConfigFetched ? "✅" : "❌");
  console.log("");

  if (!dbOk) {
    console.log("⚠️  FIX: Add DATABASE_URL in Theodora's Vercel project.");
    console.log("   Use her Neon connection string (from CRM Website → neonDatabaseUrl).");
    console.log("   Run: npx tsx scripts/set-theodora-vercel-database.ts");
    console.log("");
  }
  if (dbOk && total === 0) {
    console.log("⚠️  FIX: DATABASE_URL is set but DB has no listings.");
    console.log("   Import listings: cd Theodora-Stavropoulos-Remax && DATABASE_URL=... node scripts/import-listings.mjs data.json");
    console.log("   Or run Centris sync if configured.");
    console.log("");
  }
  if (isSample) {
    console.log("⚠️  FIX: DATABASE_URL points to sample DB. Use Theodora's Neon URL.");
    console.log("   Run: npx tsx scripts/set-theodora-vercel-database.ts");
    console.log("");
  }
  if (!env.agencyConfigFetched && (env.hasNexrelCrmUrl || env.hasNexrelWebsiteId)) {
    console.log("⚠️  FIX: CRM env vars set but agency config fetch failed.");
    console.log("   Check WEBSITE_VOICE_CONFIG_SECRET matches nexrel-crm.");
    console.log("   Run: npx tsx scripts/fix-theodora-voice-ai-vercel.ts");
    console.log("");
  }
  if (dbOk && total > 0 && !isSample && env.agencyConfigFetched) {
    console.log("✅ Listings and CRM config look good.");
  }
}

async function getTheodoraVercelUrl(): Promise<string | null> {
  try {
    const theodora = await prisma.user.findUnique({
      where: { email: THEODORA_EMAIL },
      include: { websites: true },
    });
    const url = theodora?.websites?.[0]?.vercelDeploymentUrl;
    return url ?? null;
  } catch {
    return null;
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
