/**
 * Listing Enrichment System — Main Orchestrator
 *
 * Enriches sparse property listings with detailed data (description, features,
 * room details, high-res images, year built, area, etc.) using a multi-tier approach:
 *
 *   Tier 1: Direct page scraping — alternates between Centris and RE/MAX to avoid rate limits
 *   Tier 2: Screenshot + AI Vision via OpenAI GPT-4o (handles JS-rendered / blocked pages)
 *   Tier 3: Google Search → scrape alternative listing pages (last resort)
 *
 * Usage:
 *   import { enrichListings } from "@/lib/listing-enrichment";
 *   const results = await enrichListings(databaseUrl, { limit: 50 });
 */

import pg from "pg";
import { scrapeCentrisDetail } from "./centris-detail";
import { scrapeRemaxDetail } from "./remax-detail";
import { enrichViaVision, extractGalleryImagesViaPlaywright } from "./vision-enrichment";
import { enrichViaGoogleSearch } from "./google-search";
import type {
  EnrichedData,
  EnrichmentOptions,
  EnrichmentResult,
  ListingRow,
} from "./types";

export type { EnrichedData, EnrichmentOptions, EnrichmentResult, ListingRow };

const GENERIC_DESCRIPTIONS = [
  "house for sale",
  "condo for sale",
  "condominium for sale",
  "condominium house for sale",
  "apartment for sale",
  "townhouse for sale",
  "duplex for sale",
  "triplex for sale",
  "house for rent",
  "apartment for rent",
  "condo for rent",
];

function isGenericDescription(desc: string | null): boolean {
  if (!desc) return true;
  const lower = desc.toLowerCase().trim();
  return lower.length < 30 || GENERIC_DESCRIPTIONS.some((g) => lower === g);
}

/**
 * Fetch listings that need enrichment from the database.
 */
async function fetchSparseListings(
  pool: pg.Pool,
  limit: number
): Promise<ListingRow[]> {
  const query = `
    SELECT id, mls_number AS "mlsNumber", title, slug, description,
           original_url AS "originalUrl", features, room_details AS "roomDetails",
           year_built AS "yearBuilt", area, lot_area AS "lotArea",
           main_image_url AS "mainImageUrl", gallery_images AS "galleryImages",
           latitude, longitude, addendum,
           address, city, property_type AS "propertyType", listing_type AS "listingType"
    FROM properties
    WHERE status = 'active'
      AND (
        -- No meaningful description
        description IS NULL OR length(trim(description)) < 30
        OR lower(trim(description)) IN (${GENERIC_DESCRIPTIONS.map((_, i) => `$${i + 1}`).join(", ")})
        -- Or missing key fields
        OR (year_built IS NULL AND area IS NULL AND features IS NULL)
      )
    ORDER BY
      -- Prioritize listings with originalUrl (Tier 1 will work)
      CASE WHEN original_url IS NOT NULL THEN 0 ELSE 1 END,
      created_at DESC
    LIMIT $${GENERIC_DESCRIPTIONS.length + 1}
  `;

  const result = await pool.query(query, [...GENERIC_DESCRIPTIONS, limit]);
  return result.rows;
}

/**
 * Update a listing with enriched data.
 */
async function updateListingWithEnrichedData(
  pool: pg.Pool,
  listingId: number,
  data: EnrichedData
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  const addField = (column: string, value: unknown) => {
    if (value !== undefined && value !== null) {
      sets.push(`${column} = $${paramIdx}`);
      values.push(value);
      paramIdx++;
    }
  };

  addField("description", data.description);
  addField("year_built", data.yearBuilt);
  addField("area", data.area);
  addField("area_unit", data.areaUnit);
  addField("lot_area", data.lotArea);
  addField("addendum", data.addendum);
  addField("latitude", data.latitude);
  addField("longitude", data.longitude);

  if (data.bedrooms != null) addField("bedrooms", data.bedrooms);
  if (data.bathrooms != null) addField("bathrooms", data.bathrooms);
  if (data.rooms != null) addField("rooms", data.rooms);

  if (data.features) {
    addField("features", JSON.stringify(data.features));
  }
  if (data.roomDetails && data.roomDetails.length > 0) {
    addField("room_details", JSON.stringify(data.roomDetails));
  }
  if (data.galleryImages && data.galleryImages.length > 1) {
    addField("gallery_images", JSON.stringify(data.galleryImages));
  }
  if (data.mainImageUrl) {
    addField("main_image_url", data.mainImageUrl);
  }

  // Always update the timestamp
  sets.push(`updated_at = NOW()`);

  if (sets.length <= 1) return; // Only timestamp, no real data

  values.push(listingId);
  const sql = `UPDATE properties SET ${sets.join(", ")} WHERE id = $${paramIdx}`;
  await pool.query(sql, values);
}

/**
 * Build a RE/MAX Quebec property URL from listing data.
 * RE/MAX URL format: /en/properties/{type}-for-{sale|rent}/{streetAddress-slug}-{city-slug}-{mlsNumber}
 *
 * Our DB stores Centris-format addresses like:
 *   "Condo for sale in Pointe-Claire, Montréal (Island), 244, boulevard Hymus, apt. 601, 16721647 - Centris.ca"
 * We need to extract just the street address part.
 */
function buildRemaxPropertyUrl(listing: ListingRow): string | null {
  if (!listing.address || !listing.mlsNumber) return null;

  // Extract the street address from the Centris-format string
  // Pattern: "... {city}, {number}, {street}[, apt. X], {MLS} - Centris.ca"
  const addrMatch = listing.address.match(
    /(?:Island\)|Province\))[,\s]+(.+?)(?:,\s*\d{5,}\s*-\s*Centris|$)/i
  );
  if (!addrMatch?.[1]) return null;

  const streetAddr = addrMatch[1].replace(/,\s*$/, "").trim();
  if (streetAddr.length < 3) return null;

  // Extract the neighborhood from the Centris URL or address
  // Centris URL: /en/{type}~for-{sale|rent}~{city-slug}/{mlsNumber}
  let neighborhoodSlug = "";
  if (listing.originalUrl) {
    const urlMatch = listing.originalUrl.match(/~for-(?:sale|rent)~([^/]+)/);
    if (urlMatch) neighborhoodSlug = urlMatch[1];
  }
  if (!neighborhoodSlug) {
    // Extract from address: "...in Montréal (Ville-Marie)..."
    const areaMatch = listing.address.match(/in\s+([^,]+)/i);
    if (areaMatch) {
      neighborhoodSlug = areaMatch[1]
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
  }

  // Determine property type for URL
  const titleLower = listing.title.toLowerCase();
  let propType = "property";
  if (titleLower.includes("house")) propType = "house";
  else if (titleLower.includes("condo") && titleLower.includes("apartment")) propType = "condo-apartment";
  else if (titleLower.includes("condo")) propType = "condo";
  else if (titleLower.includes("triplex")) propType = "triplex";
  else if (titleLower.includes("duplex")) propType = "duplex";
  else if (titleLower.includes("townhouse")) propType = "townhouse";
  else if (titleLower.includes("land")) propType = "land";

  const listingAction = listing.listingType === "rent" ? "for-rent" : "for-sale";

  const slugify = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const slug = `${slugify(streetAddr)}-${neighborhoodSlug}-${listing.mlsNumber}`;

  return `https://www.remax-quebec.com/en/properties/${propType}-${listingAction}/${slug}`;
}

function mergeEnrichedData(existing: EnrichedData, incoming: EnrichedData): EnrichedData {
  const merged = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value !== undefined && value !== null) {
      const existingVal = (merged as any)[key];
      if (existingVal === undefined || existingVal === null ||
          (typeof existingVal === "string" && existingVal.length < 10) ||
          (Array.isArray(existingVal) && existingVal.length === 0)) {
        (merged as any)[key] = value;
      }
    }
  }
  return merged;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Enrich a single listing through the multi-tier pipeline.
 * @param listingIndex - Used to alternate between Centris and RE/MAX
 */
async function enrichSingleListing(
  listing: ListingRow,
  opts: EnrichmentOptions,
  listingIndex = 0
): Promise<EnrichmentResult> {
  const start = Date.now();
  let enrichedData: EnrichedData = {};
  let tier: 1 | 2 | 3 = 1;
  let lastError: string | undefined;

  // --- Tier 1: Alternate between Centris and RE/MAX ---
  const useCentrisFirst = listingIndex % 2 === 0;
  const hasCentrisUrl = listing.originalUrl?.includes("centris.ca");
  const remaxUrl = buildRemaxPropertyUrl(listing);

  // Determine scrape order: alternate primary source to spread load
  const scrapeOrder: Array<{ source: "centris" | "remax"; url: string }> = [];
  if (useCentrisFirst && hasCentrisUrl) {
    scrapeOrder.push({ source: "centris", url: listing.originalUrl! });
    if (remaxUrl) scrapeOrder.push({ source: "remax", url: remaxUrl });
  } else if (remaxUrl) {
    scrapeOrder.push({ source: "remax", url: remaxUrl });
    if (hasCentrisUrl) scrapeOrder.push({ source: "centris", url: listing.originalUrl! });
  } else if (hasCentrisUrl) {
    scrapeOrder.push({ source: "centris", url: listing.originalUrl! });
  }

  for (const { source, url } of scrapeOrder) {
    try {
      if (opts.verbose) console.log(`  [T1-${source}] Scraping ${url.slice(0, 80)}...`);

      const t1Data = source === "centris"
        ? await scrapeCentrisDetail(url)
        : await scrapeRemaxDetail(url);

      if (t1Data) {
        enrichedData = mergeEnrichedData(enrichedData, t1Data);
        tier = 1;

        // If first source got data but few images, try Playwright for the gallery
        if ((!t1Data.galleryImages || t1Data.galleryImages.length < 3) && opts.enableTier2) {
          try {
            if (opts.verbose) console.log("  [T1+] Extracting gallery via Playwright");
            const imgs = await extractGalleryImagesViaPlaywright(listing.originalUrl || url);
            if (imgs.length > (enrichedData.galleryImages?.length || 0)) {
              enrichedData.galleryImages = imgs;
              enrichedData.mainImageUrl = imgs[0];
            }
          } catch {}
        }

        if (enrichedData.description && enrichedData.description.length > 30) {
          return {
            listingId: listing.id,
            mlsNumber: listing.mlsNumber,
            tier,
            success: true,
            data: enrichedData,
            durationMs: Date.now() - start,
          };
        }
        // Got partial data from first source — try second source for missing fields
        if (opts.verbose) console.log(`  [T1-${source}] Partial data — trying next source`);
        continue;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (opts.verbose) console.log(`  [T1-${source}] Failed: ${lastError}`);
    }
  }

  // If we got partial Tier 1 data (e.g. images but no description), still try returning it
  if (enrichedData.galleryImages && enrichedData.galleryImages.length > 1) {
    // Partial success — we have images at least
  }

  // --- Tier 2: Screenshot + AI Vision ---
  if (opts.enableTier2 !== false && listing.originalUrl) {
    try {
      if (opts.verbose) console.log(`  [T2] Vision enrichment for ${listing.originalUrl}`);
      const t2Data = await enrichViaVision(listing.originalUrl);
      if (t2Data) {
        enrichedData = mergeEnrichedData(enrichedData, t2Data);
        tier = 2;

        if (enrichedData.description && enrichedData.description.length > 30) {
          return {
            listingId: listing.id,
            mlsNumber: listing.mlsNumber,
            tier,
            success: true,
            data: enrichedData,
            durationMs: Date.now() - start,
          };
        }
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (opts.verbose) console.log(`  [T2] Failed: ${lastError}`);
    }
  }

  // --- Tier 3: Google Search ---
  if (opts.enableTier3 !== false) {
    try {
      // Extract city from existing listing data
      const cityMatch = listing.title.match(/,\s*([^,]+?)(?:\s*\(|$)/);
      const city = cityMatch?.[1]?.trim();
      if (opts.verbose) console.log(`  [T3] Google search for MLS ${listing.mlsNumber}`);

      const { data: t3Data, sourceUrl } = await enrichViaGoogleSearch(
        listing.mlsNumber,
        city
      );
      if (t3Data) {
        enrichedData = mergeEnrichedData(enrichedData, t3Data);
        tier = 3;

        return {
          listingId: listing.id,
          mlsNumber: listing.mlsNumber,
          tier,
          success: true,
          data: enrichedData,
          durationMs: Date.now() - start,
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (opts.verbose) console.log(`  [T3] Failed: ${lastError}`);
    }
  }

  // Return whatever we got (even partial data is better than nothing)
  const hasAnyData = enrichedData.description || enrichedData.yearBuilt || enrichedData.area ||
    (enrichedData.galleryImages && enrichedData.galleryImages.length > 1);

  return {
    listingId: listing.id,
    mlsNumber: listing.mlsNumber,
    tier,
    success: !!hasAnyData,
    data: hasAnyData ? enrichedData : undefined,
    error: hasAnyData ? undefined : lastError || "No enrichment data found across all tiers",
    durationMs: Date.now() - start,
  };
}

/**
 * Enrich multiple listings in batch.
 * Connects to the given PostgreSQL database, finds sparse listings,
 * and enriches them through the 3-tier pipeline.
 *
 * @param databaseUrl - PostgreSQL connection string (Neon DB)
 * @param opts - Enrichment options
 * @returns Array of results for each listing processed
 */
export async function enrichListings(
  databaseUrl: string,
  opts: EnrichmentOptions = {}
): Promise<{
  results: EnrichmentResult[];
  summary: {
    total: number;
    enriched: number;
    failed: number;
    tier1: number;
    tier2: number;
    tier3: number;
    totalDurationMs: number;
  };
}> {
  const {
    limit = 20,
    delayMs = 2000,
    enableTier2 = true,
    enableTier3 = true,
    verbose = false,
  } = opts;

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 3 });
  const batchStart = Date.now();

  try {
    const listings = await fetchSparseListings(pool, limit);
    if (verbose) console.log(`Found ${listings.length} listings to enrich\n`);

    const results: EnrichmentResult[] = [];
    let enrichedCount = 0;
    let t1Count = 0;
    let t2Count = 0;
    let t3Count = 0;

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      if (verbose) {
        console.log(`[${i + 1}/${listings.length}] ${listing.mlsNumber}: ${listing.title.slice(0, 60)}...`);
      }

      const result = await enrichSingleListing(listing, {
        ...opts,
        enableTier2,
        enableTier3,
        verbose,
      }, i);

      if (result.success && result.data) {
        await updateListingWithEnrichedData(pool, listing.id, result.data);
        enrichedCount++;
        if (result.tier === 1) t1Count++;
        else if (result.tier === 2) t2Count++;
        else if (result.tier === 3) t3Count++;

        if (verbose) {
          const fields = Object.entries(result.data)
            .filter(([, v]) => v !== undefined && v !== null)
            .map(([k]) => k);
          console.log(
            `  ✅ Tier ${result.tier} | ${result.durationMs}ms | Fields: ${fields.join(", ")}`
          );
        }
      } else {
        if (verbose) console.log(`  ❌ Failed: ${result.error || "No data"}`);
      }

      results.push(result);

      // Rate limiting between requests
      if (i < listings.length - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }

    return {
      results,
      summary: {
        total: listings.length,
        enriched: enrichedCount,
        failed: listings.length - enrichedCount,
        tier1: t1Count,
        tier2: t2Count,
        tier3: t3Count,
        totalDurationMs: Date.now() - batchStart,
      },
    };
  } finally {
    await pool.end();
  }
}

/**
 * Enrich a single listing by ID.
 * Useful for on-demand enrichment from the CRM dashboard.
 */
export async function enrichSingleListingById(
  databaseUrl: string,
  listingId: number,
  opts: Omit<EnrichmentOptions, "limit"> = {}
): Promise<EnrichmentResult> {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });

  try {
    const query = `
      SELECT id, mls_number AS "mlsNumber", title, slug, description,
             original_url AS "originalUrl", features, room_details AS "roomDetails",
             year_built AS "yearBuilt", area, lot_area AS "lotArea",
             main_image_url AS "mainImageUrl", gallery_images AS "galleryImages",
             latitude, longitude, addendum,
             address, city, property_type AS "propertyType", listing_type AS "listingType"
      FROM properties WHERE id = $1
    `;
    const { rows } = await pool.query(query, [listingId]);
    if (rows.length === 0) {
      return {
        listingId,
        mlsNumber: "",
        tier: 1,
        success: false,
        error: "Listing not found",
        durationMs: 0,
      };
    }

    const result = await enrichSingleListing(rows[0], {
      enableTier2: true,
      enableTier3: true,
      verbose: true,
      ...opts,
    });

    if (result.success && result.data) {
      await updateListingWithEnrichedData(pool, listingId, result.data);
    }

    return result;
  } finally {
    await pool.end();
  }
}
