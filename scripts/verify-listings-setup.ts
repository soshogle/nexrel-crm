/**
 * Verify listings setup for owner websites (e.g. Theodora).
 * Checks: neonDatabaseUrl, APIFY_TOKEN, sync targets.
 *
 * Run: npx tsx scripts/verify-listings-setup.ts
 */

import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

async function main() {
  console.log("=== Listings Setup Verification ===\n");

  let ok = true;

  // 1. APIFY_TOKEN (required for sync - must be in nexrel-crm Vercel for production)
  const hasApify = !!process.env.APIFY_TOKEN;
  console.log(hasApify ? "✅ APIFY_TOKEN: set" : "⚠️  APIFY_TOKEN: not set (add to nexrel-crm Vercel for sync)");
  if (!hasApify) {
    console.log("   → Get from https://console.apify.com/account/integrations");
  }

  // 2. CENTRIS_REALTOR_DATABASE_URLS or Website fallback
  const envUrls = process.env.CENTRIS_REALTOR_DATABASE_URLS;
  let dbCount = 0;
  if (envUrls) {
    try {
      const parsed = JSON.parse(envUrls) as string[];
      if (Array.isArray(parsed)) {
        dbCount = parsed.filter((u) => typeof u === "string" && u.startsWith("postgresql://")).length;
      }
    } catch {}
  }
  if (dbCount > 0) {
    console.log(`✅ CENTRIS_REALTOR_DATABASE_URLS: ${dbCount} database(s)`);
  } else {
    const websites = await prisma.website.findMany({
      where: {
        templateType: "SERVICE",
        status: "READY",
        neonDatabaseUrl: { not: null },
      },
      select: { id: true, name: true, neonDatabaseUrl: true },
    });
    dbCount = websites.length;
    if (dbCount > 0) {
      console.log(`✅ Website fallback: ${dbCount} site(s) with neonDatabaseUrl`);
      for (const w of websites) {
        console.log(`   - ${w.name} (${w.id})`);
      }
    } else {
      console.log("❌ No sync targets: CENTRIS_REALTOR_DATABASE_URLS empty and no SERVICE websites with neonDatabaseUrl");
      ok = false;
    }
  }

  // 3. Theodora's website
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  if (!theodora) {
    console.log("\n⚠️  Theodora user not found (skip website check)");
  } else {
    const website =
      theodora.websites.find((w) => w.voiceAIEnabled && w.elevenLabsAgentId) || theodora.websites[0];
    if (!website) {
      console.log("\n❌ No Website for Theodora. Run create-theodora-website.ts first.");
      ok = false;
    } else {
      const hasNeon = !!website.neonDatabaseUrl;
      console.log(hasNeon ? "\n✅ Theodora's Website: neonDatabaseUrl set" : "\n❌ Theodora's Website: neonDatabaseUrl NOT set");
      if (!hasNeon) {
        console.log("   → Run: THEODORA_DATABASE_URL=\"postgresql://...\" npx tsx scripts/set-theodora-neon-database-url.ts");
        console.log("   Use the same URL as DATABASE_URL in Theodora's Vercel project.");
        ok = false;
      }
    }
  }

  // 4. Optional: check if Theodora's DB has listings (requires pg)
  const theodoraWebsite = theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
  if (theodoraWebsite?.neonDatabaseUrl && !process.env.SKIP_DB_CHECK) {
    try {
      const { default: pg } = await import("pg");
      const client = new pg.Client({
        connectionString: theodoraWebsite.neonDatabaseUrl!,
        ssl: { rejectUnauthorized: true },
      });
      await client.connect();
      const res = await client.query("SELECT COUNT(*) as c FROM properties");
      const count = Number(res.rows[0]?.c ?? 0);
      await client.end();
      console.log(count > 0 ? `\n✅ Theodora's DB: ${count} listing(s)` : "\n⚠️  Theodora's DB: 0 listings (run sync)");
      if (count === 0) ok = false;
    } catch (e) {
      console.log("\n⚠️  Could not connect to Theodora's DB (check DATABASE_URL matches neonDatabaseUrl)");
    }
  }

  console.log("\n---");
  if (ok) {
    console.log("✅ Setup looks good. If listings still missing, run sync:");
    console.log("   curl -H \"Authorization: Bearer $CRON_SECRET\" https://nexrel.soshogle.com/api/cron/sync-centris");
  } else {
    console.log("❌ Fix the issues above. Ensure APIFY_TOKEN is set in nexrel-crm Vercel, then run the sync.");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
