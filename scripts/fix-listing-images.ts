#!/usr/bin/env tsx
/**
 * Fix broken Centris image URLs by re-fetching from RE/MAX.
 *
 * Centris masks image IDs in their HTML, so the enrichment scraper
 * stored 0-byte placeholder URLs. This script:
 *   1. Finds listings with broken Centris CDN image URLs
 *   2. Constructs the RE/MAX listing page URL
 *   3. Scrapes real images from RE/MAX
 *   4. Updates the DB with working image URLs
 *
 * Usage:
 *   npx tsx scripts/fix-listing-images.ts              # Fix all broken images
 *   npx tsx scripts/fix-listing-images.ts --limit 50   # Fix first 50
 *   npx tsx scripts/fix-listing-images.ts --dry-run    # Preview without updating
 */

import pg from "pg";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import path from "path";
import { scrapeRemaxDetail } from "../lib/listing-enrichment/remax-detail";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractStreetFromTitle(title: string): string | null {
  // Centris titles: "Condo for sale in Montréal (Le Sud-Ouest), Montréal (Island), 1500, Rue des Bassins, apt. 406, 12345678 - Centris.ca"
  // We need to extract "1500 Rue des Bassins"
  const parts = title.split(",").map((s) => s.trim());
  let streetNumber = "";
  let streetName = "";

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (/^\d+(-\d+)?$/.test(part)) {
      streetNumber = part;
      // Next part is likely the street name
      if (i + 1 < parts.length) {
        const next = parts[i + 1].trim();
        if (/^(rue|av|boul|ch|place|cr|rang|mont|1re|2e|3e)/i.test(next) || /^[A-Z]/.test(next)) {
          streetName = next;
        }
      }
      break;
    }
  }

  if (streetNumber && streetName) {
    // Clean: remove apt/suite from street name
    const clean = streetName.replace(/,?\s*(apt|suite|unit|app|#)\.?\s*\d+.*$/i, "").trim();
    return `${streetNumber} ${clean}`;
  }
  return null;
}

function extractNeighborhood(title: string): string | null {
  const m = title.match(/(?:in|à)\s+(?:Montréal\s*\(([^)]+)\)|([^,]+))/i);
  if (m) return m[1] || m[2] || null;
  return null;
}

function buildRemaxPropertyUrl(listing: {
  address: string | null;
  city: string | null;
  propertyType: string | null;
  listingType: string | null;
  mlsNumber: string;
  title?: string;
}): string | null {
  if (!listing.mlsNumber) return null;

  const title = listing.title || listing.address || "";
  const street = extractStreetFromTitle(title);
  if (!street) return null;

  const typeMap: Record<string, string> = {
    condo: "condo-for-sale",
    apartment: "condo-apartment-for-sale",
    house: "house-for-sale",
    townhouse: "townhouse-for-sale",
  };
  const rentTypeMap: Record<string, string> = {
    condo: "condo-apartment-for-rent",
    apartment: "condo-apartment-for-rent",
    house: "house-for-rent",
    townhouse: "townhouse-for-rent",
  };

  const isRent = listing.listingType === "rent";
  const map = isRent ? rentTypeMap : typeMap;
  const propSlug = map[listing.propertyType || "house"] || (isRent ? "property-for-rent" : "property-for-sale");

  const neighborhood = extractNeighborhood(title);
  const cityPart = listing.city || "montreal";
  const locationSlug = neighborhood
    ? slugify(`${cityPart} ${neighborhood}`)
    : slugify(cityPart);
  const streetSlug = slugify(street);

  return `https://www.remax-quebec.com/en/properties/${propSlug}/${streetSlug}-${locationSlug}/${listing.mlsNumber}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let limit = 99999;
  let dryRun = false;
  let delay = 1200;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") limit = parseInt(args[++i], 10);
    if (args[i] === "--dry-run") dryRun = true;
    if (args[i] === "--delay") delay = parseInt(args[++i], 10);
  }

  const prisma = new PrismaClient();
  let databaseUrl: string;
  try {
    const user = await prisma.user.findUnique({
      where: { email: THEODORA_EMAIL },
      include: { websites: true },
    });
    const website = user?.websites?.find((w) => w.neonDatabaseUrl);
    if (!website?.neonDatabaseUrl) {
      console.error("Could not find Theodora's database URL");
      process.exit(1);
    }
    databaseUrl = website.neonDatabaseUrl;
    console.log("Using Theodora's database\n");
  } finally {
    await prisma.$disconnect();
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });

  // Find listings with broken Centris image URLs (masked IDs containing DDDDDDD)
  const { rows: broken } = await pool.query(`
    SELECT id, mls_number AS "mlsNumber", title, address, city,
           property_type AS "propertyType", listing_type AS "listingType",
           main_image_url AS "mainImageUrl",
           jsonb_array_length(COALESCE(gallery_images, '[]'::jsonb)) AS "imgCount"
    FROM properties
    WHERE status = 'active'
      AND (
        main_image_url LIKE '%mspublic.centris.ca%'
        OR main_image_url IS NULL
        OR jsonb_array_length(COALESCE(gallery_images, '[]'::jsonb)) <= 1
      )
    ORDER BY id ASC
    LIMIT $1
  `, [limit]);

  console.log(`Found ${broken.length} listings with broken/missing images\n`);
  if (dryRun) console.log("** DRY RUN — no DB updates **\n");

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < broken.length; i++) {
    const listing = broken[i];
    const remaxUrl = buildRemaxPropertyUrl({ ...listing, title: listing.title });

    if (!remaxUrl) {
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${broken.length}] ${listing.mlsNumber}: ${listing.title?.slice(0, 50)}...`);
    console.log(`  RE/MAX URL: ${remaxUrl}`);

    try {
      const data = await scrapeRemaxDetail(remaxUrl);

      if (data?.galleryImages && data.galleryImages.length > 1) {
        const mainImg = data.mainImageUrl || data.galleryImages[0];
        console.log(`  ✅ Found ${data.galleryImages.length} images from RE/MAX`);

        if (!dryRun) {
          await pool.query(
            `UPDATE properties SET main_image_url = $1, gallery_images = $2::jsonb, updated_at = NOW() WHERE id = $3`,
            [mainImg, JSON.stringify(data.galleryImages), listing.id]
          );
        }
        fixed++;
      } else {
        console.log(`  ⚠️  No images found on RE/MAX page`);
        failed++;
      }
    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message?.slice(0, 80)}`);
      failed++;
    }

    if (delay > 0 && i < broken.length - 1) await sleep(delay);
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Fixed:   ${fixed}`);
  console.log(`Failed:  ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total:   ${broken.length}`);

  await pool.end();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
