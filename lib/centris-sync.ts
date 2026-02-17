/**
 * Central Centris sync — fetch from Apify once, write to all broker databases.
 * Used by nexrel-crm cron. Each broker keeps their own DB; we write the same
 * Montreal listings to all of them.
 */
import pg from "pg";
import { ApifyClient } from "apify-client";

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
    price: String(priceNum || 0),
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
    original_url: item.url || `https://www.centris.ca/en/property/${mls}`,
  };
}

async function importToDatabase(
  databaseUrl: string,
  properties: Record<string, unknown>[]
): Promise<{ count: number; error?: string }> {
  const cols = [
    "mls_number", "title", "slug", "property_type", "listing_type", "status", "price", "price_label",
    "address", "neighborhood", "city", "province", "bedrooms", "bathrooms", "area", "area_unit",
    "description", "main_image_url", "gallery_images", "is_featured", "room_details", "original_url",
  ];
  const updateCols = cols.filter((c) => c !== "mls_number");
  const updateSet = updateCols.map((c) => `${c} = EXCLUDED.${c}`).join(", ");

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true } });
  try {
    await client.connect();
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
        p.room_details ? JSON.stringify(p.room_details) : null,
        p.original_url,
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
  databases: { urlPreview: string; imported: number; error?: string }[];
};

/**
 * Fetch from Apify once, then write to all broker databases.
 * @param databaseUrls - Array of PostgreSQL connection strings (from CENTRIS_REALTOR_DATABASE_URLS)
 */
export async function runCentralCentrisSync(
  databaseUrls: string[],
  maxPerUrl = 25
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

  return { fetched: properties.length, databases };
}
