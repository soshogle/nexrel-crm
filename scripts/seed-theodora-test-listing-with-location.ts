#!/usr/bin/env tsx
/**
 * Add a test listing with latitude/longitude to Theodora's database.
 * Use to verify the map displays correctly on the Properties page.
 *
 * Run: npx tsx scripts/seed-theodora-test-listing-with-location.ts
 */

import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();
const THEODORA_EMAIL = "theodora.stavropoulos@remax-quebec.com";

const TEST_LISTING = {
  mls_number: "TEST-MAP-001",
  title: "9280 Boul. L'Acadie, Montréal",
  slug: "test-map-001",
  property_type: "condo",
  listing_type: "sale",
  status: "active",
  price: "450000",
  price_label: "",
  address: "9280 Boul. L'Acadie",
  neighborhood: "Ahuntsic-Cartierville",
  city: "Montréal",
  province: "QC",
  bedrooms: 3,
  bathrooms: 2,
  description: "Test listing with location data for map display verification.",
  main_image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
  gallery_images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"],
  is_featured: true,
  latitude: 45.5589,
  longitude: -73.6497,
};

async function main() {
  console.log("📍 Adding test listing with location to Theodora's database\n");

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

  const client = new pg.Client({
    connectionString: website.neonDatabaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    await client.query(
      `INSERT INTO properties (
        mls_number, title, slug, property_type, listing_type, status, price, price_label,
        address, neighborhood, city, province, bedrooms, bathrooms, description,
        main_image_url, gallery_images, is_featured, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      ON CONFLICT (mls_number) DO UPDATE SET
        title = EXCLUDED.title,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        main_image_url = EXCLUDED.main_image_url`,
      [
        TEST_LISTING.mls_number,
        TEST_LISTING.title,
        TEST_LISTING.slug,
        TEST_LISTING.property_type,
        TEST_LISTING.listing_type,
        TEST_LISTING.status,
        TEST_LISTING.price,
        TEST_LISTING.price_label,
        TEST_LISTING.address,
        TEST_LISTING.neighborhood,
        TEST_LISTING.city,
        TEST_LISTING.province,
        TEST_LISTING.bedrooms,
        TEST_LISTING.bathrooms,
        TEST_LISTING.description,
        TEST_LISTING.main_image_url,
        JSON.stringify(TEST_LISTING.gallery_images),
        TEST_LISTING.is_featured,
        TEST_LISTING.latitude,
        TEST_LISTING.longitude,
      ]
    );

    console.log("✅ Test listing added/updated:");
    console.log("   MLS:", TEST_LISTING.mls_number);
    console.log("   Address:", TEST_LISTING.address);
    console.log("   Lat/Lng:", TEST_LISTING.latitude, TEST_LISTING.longitude);
    console.log("\n   Visit the Properties page and switch to Map view to see it.");
  } catch (err) {
    console.error("❌ Failed:", err);
    process.exit(1);
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

main();
