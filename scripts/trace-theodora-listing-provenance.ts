#!/usr/bin/env tsx
/**
 * Trace provenance of specific listings in Theodora's website DB.
 * Shows where each listing came from (Centris, Realtor, CRM sync) and whether we have evidence it's her listing.
 *
 * Run: npx tsx scripts/trace-theodora-listing-provenance.ts
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

  if (!databaseUrl?.startsWith("postgresql://")) {
    console.error("❌ Theodora's website has no neonDatabaseUrl.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    // Look up 35 Rue Apple Hill (address-based slug) and MLS 24452849
    const [appleHillRes, mlsRes] = await Promise.all([
      client.query(
        `SELECT id, mls_number, slug, title, address, is_featured, original_url, created_at
         FROM properties
         WHERE slug ILIKE '%35-rue-apple-hill%' OR address ILIKE '%35%apple%hill%' OR address ILIKE '%apple hill%'`
      ),
      client.query(
        `SELECT id, mls_number, slug, title, address, is_featured, original_url, created_at
         FROM properties
         WHERE mls_number = '24452849' OR slug = 'centris-24452849' OR slug = 'realtor-24452849'`
      ),
    ]);

    console.log("🔍 Listing Provenance Trace\n");
    console.log("The website DB is Theodora's — everything in it appears on her site.");
    console.log("But we do NOT store listing agent. Provenance is inferred from slug/origin:\n");

    // 35 Rue Apple Hill
    console.log("--- 35 Rue Apple Hill, Baie d'Urfé ---\n");
    if (appleHillRes.rows.length === 0) {
      console.log("   Not found in website DB.");
    } else {
      for (const row of appleHillRes.rows) {
        const slug = row.slug as string;
        const provenance =
          slug.startsWith("centris-") ? "Centris sync (generic MLS — not necessarily broker's)"
          : slug.startsWith("realtor-") ? "Realtor.ca sync (from her agent page — her listing)"
          : "CRM sync (address-based slug — created/imported in CRM, synced to website)";
        console.log("   id:", row.id);
        console.log("   mls_number:", row.mls_number ?? "(null)");
        console.log("   slug:", slug);
        console.log("   title:", (row.title as string)?.slice(0, 60) + "...");
        console.log("   is_featured:", row.is_featured);
        console.log("   original_url:", row.original_url ?? "(null)");
        console.log("   created_at:", row.created_at);
        console.log("   Inferred provenance:", provenance);
        console.log("");
      }
    }

    // MLS 24452849
    console.log("--- MLS# 24452849 ---\n");
    if (mlsRes.rows.length === 0) {
      console.log("   Not found in website DB.");
    } else {
      for (const row of mlsRes.rows) {
        const slug = row.slug as string;
        const provenance =
          slug.startsWith("centris-") ? "Centris sync (generic MLS — NOT necessarily Theodora's; main sync pulls Montreal listings from many brokers)"
          : slug.startsWith("realtor-") ? "Realtor.ca sync (from her agent page — her listing)"
          : "CRM sync (address-based slug — created/imported in CRM)";
        console.log("   id:", row.id);
        console.log("   mls_number:", row.mls_number);
        console.log("   slug:", slug);
        console.log("   title:", (row.title as string)?.slice(0, 60) + "...");
        console.log("   is_featured:", row.is_featured);
        console.log("   original_url:", row.original_url ?? "(null)");
        console.log("   created_at:", row.created_at);
        console.log("   Inferred provenance:", provenance);
        console.log("");
      }
    }

    // Check CRM for these (isBrokerListing, source)
    const theodoraId = theodora?.id;
    if (theodoraId) {
      const crmProps = await prisma.rEProperty.findMany({
        where: {
          userId: theodoraId,
          OR: [
            { address: { contains: "Apple Hill", mode: "insensitive" } },
            { mlsNumber: "24452849" },
          ],
        },
        select: { id: true, address: true, mlsNumber: true, isBrokerListing: true, sellerLeadId: true, createdAt: true },
      });
      if (crmProps.length > 0) {
        console.log("--- CRM REProperty (source of address-based listings) ---\n");
        for (const p of crmProps) {
          console.log("   address:", p.address);
          console.log("   mlsNumber:", p.mlsNumber);
          console.log("   isBrokerListing:", p.isBrokerListing);
          console.log("   sellerLeadId:", p.sellerLeadId ?? "(null) — has seller lead = FSBO/own listing");
          console.log("   createdAt:", p.createdAt);
          console.log("");
        }
      }
    }

    console.log("Summary: We infer provenance from slug prefix and sync source.");
    console.log("  centris-* = main Centris sync (generic Montreal MLS, many brokers)");
    console.log("  realtor-* = Realtor sync from her agent URL (her listings)");
    console.log("  address slug = CRM sync (created/imported in CRM; isBrokerListing in CRM = manually marked)");
  } finally {
    await client.end();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
