/**
 * Realtor.ca sync — fetch broker listings from Apify, write to broker database.
 * Used for brokers who list on Realtor.ca (e.g. Theodora).
 * Set realtorBrokerUrl in agency config to the agent page URL.
 *
 * Uses memo23/realtor-canada-search-cheerio ($25/mo) — accepts agent profile URLs
 * as startUrls and extracts property listings. Fallback: scrapemind/realtor-ca-scraper.
 */
import pg from "pg";
import { ApifyClient } from "apify-client";
import { verifyAndUpdateListings } from "@/lib/listing-verification";

const REALTOR_ACTORS = [
  "memo23/realtor-canada-search-cheerio", // Primary: accepts agent URLs + map URLs, 99.2% success
  "scrapemind/realtor-ca-scraper", // Fallback: original actor
] as const;

/** Fallback map URL when agent URL returns no listings — Canada-wide rent search */
const REALTOR_MAP_FALLBACK_URL =
  "https://www.realtor.ca/map#ZoomLevel=4&Center=54.920828%2C-99.316406&LatitudeMax=69.85098&LongitudeMax=-15.46875&LatitudeMin=31.30671&LongitudeMin=176.83594&Sort=6-D&PropertyTypeGroupID=1&TransactionTypeId=3&PropertySearchTypeId=0&BuildingTypeId=17&Currency=CAD";

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr || typeof priceStr !== "string") return null;
  const num = priceStr.replace(/[^0-9]/g, "");
  return num ? parseInt(num, 10) : null;
}

/** Extract Canadian postal code (A1A 1A1) from text */
function extractPostalCode(text: string | undefined): string | null {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/);
  return match ? (match[1] + match[2]).toUpperCase().replace(/\s/g, "") : null;
}

function mapPropertyType(type: string | undefined): "apartment" | "condo" | "house" | "townhouse" | "duplex" | "triplex" | "commercial" | "land" {
  const t = (type || "").toLowerCase();
  if (t.includes("condo") || t.includes("apartment")) return "condo";
  if (t.includes("house") || t.includes("single family") || t.includes("detached")) return "house";
  if (t.includes("townhouse") || t.includes("town house")) return "townhouse";
  if (t.includes("duplex")) return "duplex";
  if (t.includes("triplex")) return "triplex";
  if (t.includes("commercial")) return "commercial";
  if (t.includes("land")) return "land";
  return "apartment";
}

function mapRealtorItemToProperty(item: Record<string, unknown>): Record<string, unknown> | null {
  const mls = String(item.MlsNumber || item.mlsNumber || item.Id || item.id || "").trim();
  if (!mls) return null;

  const building = (item.Building || item.building) as Record<string, unknown> | undefined;
  const property = (item.Property || item.property) as Record<string, unknown> | undefined;
  const address = (property?.Address || property?.address) as Record<string, unknown> | undefined;

  const priceStr = (property?.Price || property?.price || item.Price || item.price) as string | undefined;
  const priceNum = parsePrice(priceStr);

  const addressText = (address?.AddressText || address?.addressText || item.Address || item.address) as string | undefined;
  const city = (address?.City || address?.city || item.City || item.city) as string | undefined;
  const province = (address?.Province || address?.province || item.Province || item.province || item.ProvinceName) as string | undefined;
  const latStr = (address?.Latitude || address?.latitude || item.Latitude || item.latitude) as string | number | undefined;
  const lngStr = (address?.Longitude || address?.longitude || item.Longitude || item.longitude) as string | number | undefined;
  const latitude = latStr != null ? parseFloat(String(latStr)) : null;
  const longitude = lngStr != null ? parseFloat(String(lngStr)) : null;

  const beds = building?.Bedrooms ?? building?.bedrooms ?? item.Bedrooms ?? item.bedrooms;
  const bedrooms = typeof beds === "number" ? beds : beds ? parseInt(String(beds), 10) : null;
  const baths = building?.BathroomTotal ?? building?.bathroomTotal ?? item.BathroomTotal ?? item.bathroomTotal;
  const bathrooms = typeof baths === "number" ? baths : baths ? parseFloat(String(baths)) : null;

  const propType = (building?.Type || building?.type || property?.Type || property?.type) as string | undefined;
  const listingType = (item.StatusId || item.statusId) === "3" ? "rent" : "sale";
  const priceLabel = listingType === "rent" ? "mo" : "";

  // memo23 puts Photo under Property; scrapemind may use item.Photo
  const photos = (item.Photo || item.photo || property?.Photo || property?.photo) as Array<{ HighResPath?: string; MedResPath?: string; LowResPath?: string }> | undefined;
  const mainImage = Array.isArray(photos) && photos.length > 0
    ? (photos[0].HighResPath || photos[0].MedResPath || photos[0].LowResPath)
    : null;
  const galleryImages = Array.isArray(photos)
    ? photos
        .map((p) => p.HighResPath || p.MedResPath || p.LowResPath)
        .filter(Boolean) as string[]
    : [];

  const area = (building?.SizeInterior || building?.sizeInterior) as string | undefined;
  const description = (item.PublicRemarks || item.publicRemarks || item.Description || item.description) as string | undefined;

  const slug = `realtor-${mls}`.replace(/[^a-z0-9-]/gi, "-").slice(0, 500);
  const title = (addressText || `Property ${mls}`).split("|")[0]?.trim().slice(0, 500) || `Property ${mls}`;

  const postalCode =
    (address?.PostalCode || address?.postalCode || item.PostalCode || item.postalCode) as string | undefined;
  const postalCodeNorm = extractPostalCode(postalCode) ?? extractPostalCode(addressText ?? "") ?? null;

  const priceVal = priceNum ?? 0;
  const isPrestige = listingType === "sale" && priceVal >= 1_000_000;
  return {
    mls_number: mls,
    title,
    slug,
    property_type: mapPropertyType(propType),
    listing_type: listingType,
    status: "active",
    price: String(priceVal),
    price_label: priceLabel,
    address: (addressText || title).split("|")[0]?.trim().slice(0, 500) || title,
    neighborhood: (address?.CommunityName || address?.communityName) as string | undefined ?? null,
    city: city || "Montréal",
    province: province || "Quebec",
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    bedrooms: Number.isNaN(bedrooms) ? null : bedrooms,
    bathrooms: Number.isNaN(bathrooms) ? null : bathrooms,
    area: area || null,
    area_unit: "ft²",
    description: (description || "").slice(0, 5000) || null,
    main_image_url: mainImage,
    gallery_images: galleryImages,
    room_details: null,
    is_featured: true,
    is_prestige: isPrestige,
    original_url: `https://www.realtor.ca/real-estate/${item.Id || mls}/`,
    postal_code: postalCodeNorm,
  };
}

const ADD_POSTAL_CODE_SQL = `
  ALTER TABLE properties ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
  CREATE INDEX IF NOT EXISTS idx_properties_postal_code ON properties (postal_code) WHERE postal_code IS NOT NULL;
`;

async function importToDatabase(
  databaseUrl: string,
  properties: Record<string, unknown>[]
): Promise<{ count: number; error?: string }> {
  const cols = [
    "mls_number", "title", "slug", "property_type", "listing_type", "status", "price", "price_label",
    "address", "neighborhood", "city", "province", "bedrooms", "bathrooms", "area", "area_unit",
    "description", "main_image_url", "gallery_images", "is_featured", "is_prestige", "room_details", "original_url",
    "latitude", "longitude", "postal_code",
  ];
  const updateCols = cols.filter((c) => c !== "mls_number");
  const updateSet = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
    try {
      await client.query(ADD_POSTAL_CODE_SQL);
    } catch {
      // Column may already exist
    }
    let count = 0;
    for (const p of properties) {
      const vals = [
        p.mls_number,
        p.title,
        p.slug,
        p.property_type,
        p.listing_type,
        p.status,
        p.price,
        p.price_label,
        p.address,
        p.neighborhood,
        p.city,
        p.province,
        p.bedrooms,
        p.bathrooms,
        p.area,
        p.area_unit,
        p.description,
        p.main_image_url,
        JSON.stringify(p.gallery_images),
        p.is_featured,
        p.is_prestige ?? false,
        p.room_details ? JSON.stringify(p.room_details) : null,
        p.original_url,
        p.latitude ?? null,
        p.longitude ?? null,
        p.postal_code ?? null,
      ];
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
      await client.query(
        `INSERT INTO properties (${cols.join(", ")}) VALUES (${placeholders})
         ON CONFLICT (mls_number) DO UPDATE SET ${updateSet}`,
        vals
      );
      count++;
    }
    return { count };
  } catch (err) {
    return { count: 0, error: String(err) };
  } finally {
    await client.end();
  }
}

export type RealtorSyncResult = {
  fetched: number;
  imported: number;
  error?: string;
  verification?: { verified: number; updated: number; unknown: number };
};

/**
 * Fetch Realtor.ca listings for a broker's agent page and import to their database.
 * Tries memo23/realtor-canada-search-cheerio first (accepts agent URLs), then
 * scrapemind/realtor-ca-scraper as fallback.
 * @param agentUrl - e.g. https://www.realtor.ca/agent/2237157/theodora-stavropoulos-...
 * @param databaseUrl - PostgreSQL connection string
 */
export async function runRealtorSync(
  agentUrl: string,
  databaseUrl: string
): Promise<RealtorSyncResult> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN not configured");
  }

  const client = new ApifyClient({ token: APIFY_TOKEN });
  const url = agentUrl.trim();

  const runWithUrl = async (
    targetUrl: string
  ): Promise<{ items: Record<string, unknown>[]; lastError?: string }> => {
    const memo23Input = {
      startUrls: [{ url: targetUrl }],
      maxItems: 50,
      maxConcurrency: 5,
      proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] as string[] },
    };
    const scrapemindInput = {
      startUrls: [targetUrl],
      getDetails: true,
      simplifyOutput: false,
      maxListings: 50,
      numberOfWorkers: 3,
      proxy: { useApifyProxy: true, apifyProxyCountry: "CA" },
    };

    let lastError: string | undefined;
    for (const actor of REALTOR_ACTORS) {
      try {
        const input = actor === "memo23/realtor-canada-search-cheerio" ? memo23Input : scrapemindInput;
        const run = await client.actor(actor).call(input);
        const dataset = await client.dataset(run.defaultDatasetId).listItems();
        return { items: (dataset.items || []) as Record<string, unknown>[] };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
    return { items: [], lastError };
  };

  let result = await runWithUrl(url);
  let usedMapFallback = false;

  // If agent URL returns no listings, try map fallback (Canada-wide rent search)
  if (result.items.length === 0 && url !== REALTOR_MAP_FALLBACK_URL) {
    result = await runWithUrl(REALTOR_MAP_FALLBACK_URL);
    usedMapFallback = result.items.length > 0;
  }

  const items = result.items;
  const lastError = result.lastError ?? "No listings returned";
  if (items.length === 0) {
    const hint =
      lastError.includes("rent") || lastError.includes("actor-is-not-rented")
        ? " Rent an actor at https://console.apify.com (memo23/realtor-canada-search-cheerio or scrapemind/realtor-ca-scraper, ~$25/mo)."
        : "";
    throw new Error(`Realtor sync failed: ${lastError}${hint}`);
  }

  // Filter to property listings only (memo23 may return agent profiles too)
  let properties = items
    .filter((item) => item.MlsNumber || item.mlsNumber || (item.Id && item.Property))
    .map((item: Record<string, unknown>) => mapRealtorItemToProperty(item))
    .filter(Boolean) as Record<string, unknown>[];

  // Map URL listings (fallback or direct) are not broker's own — don't mark as featured
  if (usedMapFallback || url === REALTOR_MAP_FALLBACK_URL) {
    properties = properties.map((p) => ({ ...p, is_featured: false }));
  }

  const importResult = await importToDatabase(databaseUrl, properties);

  // Verify listings that disappeared from scrape (fetch source pages, update only when confirmed)
  const activeMls = properties.map((p) => String(p.mls_number));
  let verification: { verified: number; updated: number; unknown: number } | undefined;
  if (activeMls.length > 0) {
    verification = await verifyAndUpdateListings(databaseUrl, "realtor", activeMls);
  }

  return {
    fetched: properties.length,
    imported: importResult.count,
    error: importResult.error,
    verification,
  };
}
