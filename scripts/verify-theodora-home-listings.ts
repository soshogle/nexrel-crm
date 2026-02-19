#!/usr/bin/env tsx
/**
 * Verify Theodora's home page listings setup.
 * Connects to her DB via website.neonDatabaseUrl from CRM, runs property counts,
 * shows what getFeaturedProperties would return, and checks agencyConfig.
 *
 * Run: npx tsx scripts/verify-theodora-home-listings.ts
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
  const theodora = await prisma.user.findUnique({
    where: { email: THEODORA_EMAIL },
    include: { websites: true },
  });

  const website =
    theodora?.websites?.find((w) => w.neonDatabaseUrl) ?? theodora?.websites?.[0];
  const databaseUrl = website?.neonDatabaseUrl;

  if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
    console.error("❌ Theodora's website has no neonDatabaseUrl set in CRM.");
    process.exit(1);
  }

  console.log("🔍 Verify Theodora's Home Listings\n");
  console.log("   Website:", website?.name ?? "(unknown)");
  console.log("   DB: neonDatabaseUrl from CRM\n");

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    // 1. Property counts
    const [totalRes, featuredRes, realtorRes, centrisRes] = await Promise.all([
      client.query("SELECT COUNT(*) as c FROM properties"),
      client.query("SELECT COUNT(*) as c FROM properties WHERE is_featured = true"),
      client.query("SELECT COUNT(*) as c FROM properties WHERE slug LIKE 'realtor-%'"),
      client.query("SELECT COUNT(*) as c FROM properties WHERE slug LIKE 'centris-%'"),
    ]);

    const total = parseInt(String(totalRes.rows[0]?.c ?? 0), 10);
    const featured = parseInt(String(featuredRes.rows[0]?.c ?? 0), 10);
    const realtor = parseInt(String(realtorRes.rows[0]?.c ?? 0), 10);
    const centris = parseInt(String(centrisRes.rows[0]?.c ?? 0), 10);

    console.log("📊 Property counts\n");
    console.log("   Total:", total);
    console.log("   is_featured=true:", featured);
    console.log("   slug LIKE 'realtor-%':", realtor);
    console.log("   slug LIKE 'centris-%':", centris);
    console.log("");

    // 2. getFeaturedProperties equivalent: status=active, hasRealImage, order by is_featured desc, md5(id||date), limit 4
    const hasRealImage = `
      main_image_url IS NOT NULL
      AND main_image_url != ''
      AND main_image_url NOT LIKE '/placeholder%'
      AND (main_image_url LIKE 'http://%' OR main_image_url LIKE 'https://%')
    `;
    const featuredPropsRes = await client.query(
      `SELECT id, slug, title, is_featured, main_image_url
       FROM properties
       WHERE status = 'active' AND (${hasRealImage})
       ORDER BY is_featured DESC, md5(concat(id::text, current_date::text))
       LIMIT 4`
    );

    console.log("🏠 getFeaturedProperties (first 4)\n");
    if (featuredPropsRes.rows.length === 0) {
      console.log("   (none — no active listings with real images)");
    } else {
      for (const row of featuredPropsRes.rows) {
        const feat = row.is_featured ? "⭐" : "  ";
        console.log(`   ${feat} id=${row.id} slug=${row.slug}`);
        console.log(`      title: ${(row.title as string)?.slice(0, 60)}...`);
      }
    }
    console.log("");

    // 3. agencyConfig.realtorBrokerUrl
    const realtorUrl = (website?.agencyConfig as Record<string, unknown> | null)?.realtorBrokerUrl;
    console.log("🔗 agencyConfig.realtorBrokerUrl\n");
    if (realtorUrl && typeof realtorUrl === "string") {
      console.log("   ✅ Set:", realtorUrl);
    } else {
      console.log("   ❌ Not set");
      console.log("   → Run: npx tsx scripts/set-theodora-realtor-url.ts");
      console.log("   → Or set in CRM Dashboard → Website → Centris Listings → Your Realtor.ca agent URL");
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
