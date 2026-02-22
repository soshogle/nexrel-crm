/**
 * Central Centris sync — fetch from Apify once, write to all broker databases.
 * Used by nexrel-crm cron. Each broker keeps their own DB; we write the same
 * Montreal listings to all of them.
 */
import pg from "pg";
import { ApifyClient } from "apify-client";
import { verifyAndUpdateListings } from "@/lib/listing-verification";

const CENTRIS_URLS = [
  "https://www.centris.ca/en/properties~for-sale~montreal-island",
  "https://www.centris.ca/en/for-rent~montreal",
  "https://www.centris.ca/en/condos-apartments~for-rent~montreal-island",
  "https://www.centris.ca/en/houses~for-sale~montreal-island",
  "https://www.centris.ca/fr/propriete~a-vendre~berthierville?uc=0",
];

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

function mapApifyItemToProperty(item: Record<string, unknown>): Record<string, unknown> | null {
  const mls = String(item.id || "").trim();
  if (!mls) return null;

  const title = (item.title as string) || `Property ${mls}`;
  const slug = `centris-${mls}`;
  const priceNum = parsePrice(item.price as string);
  const category = (item.category as string) || "";
  const fromUrl = (item.from_url as string) || "";
  const listingType =
    category.toLowerCase().includes("rent") || fromUrl.includes("rent") ? "rent" : "sale";
  const priceLabel = listingType === "rent" ? "mo" : "";
  const priceVal = priceNum ?? 0;
  const isPrestige = listingType === "sale" && priceVal >= 1_000_000;

  let city = "Montréal";
  let neighborhood: string | null = null;
  const titleMatch = title.match(/(?:à|in|at)\s+([^,]+)/i);
  if (titleMatch) {
    const loc = titleMatch[1].trim();
    if (loc.includes("Montreal") || loc.includes("Montréal")) {
      city = "Montréal";
      neighborhood = loc.replace(/Montreal( Island)?/i, "").trim() || null;
    } else {
      city = loc;
    }
  }

  const detail = item.detail as Record<string, string> | undefined;
  const beds = detail?.bed ? parseInt(detail.bed, 10) : null;
  const baths = detail?.bath ? parseFloat(detail.bath) : null;

  const location = item.location as Record<string, string> | undefined;
  const latStr = location?.lat ?? (item as Record<string, unknown>).latitude ?? (item as Record<string, unknown>).lat;
  const lngStr = location?.lng ?? (item as Record<string, unknown>).longitude ?? (item as Record<string, unknown>).lng;
  const latitude = latStr != null ? parseFloat(String(latStr)) : null;
  const longitude = lngStr != null ? parseFloat(String(lngStr)) : null;

  // Postal code: from item field or extract from address/title
  const postalCode =
    extractPostalCode((item as Record<string, unknown>).postalCode as string) ??
    extractPostalCode((item as Record<string, unknown>).postal_code as string) ??
    extractPostalCode((item as Record<string, unknown>).address as string) ??
    extractPostalCode(title) ??
    null;

  return {
    mls_number: mls,
    title: title.slice(0, 500),
    slug: slug.slice(0, 500),
    property_type: category.toLowerCase().includes("condo") || category.toLowerCase().includes("apartment")
      ? "condo"
      : category.toLowerCase().includes("house") || category.toLowerCase().includes("maison")
        ? "house"
        : "apartment",
    listing_type: listingType,
    status: "active",
    price: String(priceVal),
    price_label: priceLabel,
    address: title.slice(0, 500),
    neighborhood,
    city,
    province: "Quebec",
    bedrooms: beds,
    bathrooms: baths,
    area: null,
    area_unit: "ft²",
    description: category || "",
    main_image_url: item.image || null,
    gallery_images: item.image ? [item.image] : [],
    room_details: null,
    is_featured: false,
    is_prestige: isPrestige,
    original_url: item.url || `https://www.centris.ca/en/property/${mls}`,
    latitude: Number.isFinite(latitude) ? latitude : null,
    longitude: Number.isFinite(longitude) ? longitude : null,
    postal_code: postalCode,
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
    // Ensure postal_code column exists (for property evaluation comparables)
    try {
      await client.query(ADD_POSTAL_CODE_SQL);
    } catch {
      // Column may already exist; continue
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

export type SyncResult = {
  fetched: number;
  databases: {
    urlPreview: string;
    imported: number;
    brokerFeatured?: number;
    error?: string;
    verification?: { verified: number; updated: number; unknown: number };
  }[];
};

/** Per-website broker URL override: fetch from Centris URLs and mark as featured/sold in that DB */
export type BrokerOverride = {
  databaseUrl: string;
  centrisBrokerUrl?: string;
  centrisBrokerSoldUrl?: string;
};

function mapApifyItemToPropertyWithFeatured(
  item: Record<string, unknown>,
  isFeatured: boolean,
  status: "active" | "sold" = "active"
): Record<string, unknown> | null {
  const p = mapApifyItemToProperty(item);
  if (!p) return null;
  return { ...p, is_featured: isFeatured, status };
}

/**
 * Fetch from Apify once, then write to all broker databases.
 * @param databaseUrls - Array of PostgreSQL connection strings (from CENTRIS_REALTOR_DATABASE_URLS)
 * @param brokerOverrides - Optional: for each entry, fetch from centrisBrokerUrl and mark those listings as featured in that DB
 */
export async function runCentralCentrisSync(
  databaseUrls: string[],
  maxPerUrl = 25,
  brokerOverrides?: BrokerOverride[]
): Promise<SyncResult> {
  const APIFY_TOKEN = process.env.APIFY_TOKEN;
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN not configured");
  }

  const client = new ApifyClient({ token: APIFY_TOKEN });
  const input = {
    urls: CENTRIS_URLS,
    max_items_per_url: maxPerUrl,
    max_retries_per_url: 2,
    proxy: { useApifyProxy: true, apifyProxyCountry: "CA" },
  };

  const run = await client.actor("ecomscrape/centris-property-search-scraper").call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const properties = items
    .map((item: Record<string, unknown>) => mapApifyItemToProperty(item))
    .filter(Boolean) as Record<string, unknown>[];

  const mainCentrisMls = new Set(properties.map((p) => String(p.mls_number)));
  const activeCentrisByDb = new Map<string, Set<string>>();
  for (const url of databaseUrls) {
    activeCentrisByDb.set(url, new Set(mainCentrisMls));
  }

  const databases: SyncResult["databases"] = [];
  for (const url of databaseUrls) {
    const preview = url.replace(/:[^:@]+@/, ":****@").slice(0, 50) + "...";
    const result = await importToDatabase(url, properties);
    databases.push({
      urlPreview: preview,
      imported: result.count,
      error: result.error,
    });
  }

  // Broker-specific sync: fetch from broker URLs and mark as featured; optionally fetch sold listings
  if (brokerOverrides && brokerOverrides.length > 0) {
    for (const { databaseUrl, centrisBrokerUrl, centrisBrokerSoldUrl } of brokerOverrides) {
      if (centrisBrokerUrl?.trim()) {
        try {
          const brokerRun = await client.actor("ecomscrape/centris-property-search-scraper").call({
            urls: [centrisBrokerUrl.trim()],
            max_items_per_url: 20,
            max_retries_per_url: 2,
            proxy: { useApifyProxy: true, apifyProxyCountry: "CA" },
          });
          const { items: brokerItems } = await client.dataset(brokerRun.defaultDatasetId).listItems();
          const brokerProperties = brokerItems
            .map((item: Record<string, unknown>) =>
              mapApifyItemToPropertyWithFeatured(item, true, "active")
            )
            .filter(Boolean) as Record<string, unknown>[];
          const brokerResult = await importToDatabase(databaseUrl, brokerProperties);
          const idx = databaseUrls.indexOf(databaseUrl);
          if (idx >= 0) databases[idx].brokerFeatured = brokerResult.count;
          const active = activeCentrisByDb.get(databaseUrl) ?? new Set(mainCentrisMls);
          brokerProperties.forEach((p) => active.add(String(p.mls_number)));
          activeCentrisByDb.set(databaseUrl, active);
        } catch (err) {
          console.warn("[centris-sync] Broker URL fetch failed:", centrisBrokerUrl, err);
        }
      }
      if (centrisBrokerSoldUrl?.trim()) {
        try {
          const soldRun = await client.actor("ecomscrape/centris-property-search-scraper").call({
            urls: [centrisBrokerSoldUrl.trim()],
            max_items_per_url: 30,
            max_retries_per_url: 2,
            proxy: { useApifyProxy: true, apifyProxyCountry: "CA" },
          });
          const { items: soldItems } = await client.dataset(soldRun.defaultDatasetId).listItems();
          const soldProperties = soldItems
            .map((item: Record<string, unknown>) =>
              mapApifyItemToPropertyWithFeatured(item, false, "sold")
            )
            .filter(Boolean) as Record<string, unknown>[];
          await importToDatabase(databaseUrl, soldProperties);
        } catch (err) {
          console.warn("[centris-sync] Broker sold URL fetch failed:", centrisBrokerSoldUrl, err);
        }
      }
    }
  }

  // Verify listings that disappeared from scrape (fetch source pages, update only when confirmed)
  for (let i = 0; i < databaseUrls.length; i++) {
    const url = databaseUrls[i];
    const activeMls = Array.from(activeCentrisByDb.get(url) ?? mainCentrisMls);
    if (activeMls.length > 0) {
      const verification = await verifyAndUpdateListings(url, "centris", activeMls);
      if (databases[i]) databases[i].verification = verification;
    }
  }

  return { fetched: properties.length, databases };
}
