/**
 * Realtor.ca sync — fetch broker listings from Apify, write to broker database.
 * Used for brokers who list on Realtor.ca (e.g. Theodora).
 * Set realtorBrokerUrl in agency config to the agent page URL.
 */
import pg from "pg";
import { ApifyClient } from "apify-client";

const REALTOR_ACTOR = "scrapemind/realtor-ca-scraper";

function parsePrice(priceStr: string | undefined): number | null {
  if (!priceStr || typeof priceStr !== "string") return null;
  const num = priceStr.replace(/[^0-9]/g, "");
  return num ? parseInt(num, 10) : null;
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
  const province = (address?.Province || address?.province || item.Province || item.province) as string | undefined;

  const beds = building?.Bedrooms ?? building?.bedrooms ?? item.Bedrooms ?? item.bedrooms;
  const bedrooms = typeof beds === "number" ? beds : beds ? parseInt(String(beds), 10) : null;
  const baths = building?.BathroomTotal ?? building?.bathroomTotal ?? item.BathroomTotal ?? item.bathroomTotal;
  const bathrooms = typeof baths === "number" ? baths : baths ? parseFloat(String(baths)) : null;

  const propType = (building?.Type || building?.type || property?.Type || property?.type) as string | undefined;
  const listingType = (item.StatusId || item.statusId) === "3" ? "rent" : "sale";
  const priceLabel = listingType === "rent" ? "mo" : "";

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

  return {
    mls_number: mls,
    title,
    slug,
    property_type: mapPropertyType(propType),
    listing_type: listingType,
    status: "active",
    price: String(priceNum || 0),
    price_label: priceLabel,
    address: (addressText || title).split("|")[0]?.trim().slice(0, 500) || title,
    neighborhood: (address?.CommunityName || address?.communityName) as string | undefined ?? null,
    city: city || "Montréal",
    province: province || "Quebec",
    bedrooms: Number.isNaN(bedrooms) ? null : bedrooms,
    bathrooms: Number.isNaN(bathrooms) ? null : bathrooms,
    area: area || null,
    area_unit: "ft²",
    description: (description || "").slice(0, 5000) || null,
    main_image_url: mainImage,
    gallery_images: galleryImages,
    room_details: null,
    is_featured: true,
    original_url: `https://www.realtor.ca/real-estate/${item.Id || mls}/`,
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

export type RealtorSyncResult = {
  fetched: number;
  imported: number;
  error?: string;
};

/**
 * Fetch Realtor.ca listings for a broker's agent page and import to their database.
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
  const input = {
    startUrls: [agentUrl.trim()],
    getDetails: true,
    simplifyOutput: false,
    maxListings: 50,
    numberOfWorkers: 3,
    proxy: { useApifyProxy: true, apifyProxyCountry: "CA" },
  };

  const run = await client.actor(REALTOR_ACTOR).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();

  const properties = items
    .map((item: Record<string, unknown>) => mapRealtorItemToProperty(item))
    .filter(Boolean) as Record<string, unknown>[];

  const result = await importToDatabase(databaseUrl, properties);
  return {
    fetched: properties.length,
    imported: result.count,
    error: result.error,
  };
}
