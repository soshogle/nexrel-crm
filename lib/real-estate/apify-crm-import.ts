/**
 * Import new Centris listings from a broker's website DB into the CRM REProperty table.
 * Only imports listings whose MLS number doesn't already exist in the CRM — incremental.
 *
 * This bridges the website DB (populated by Apify Centris scraper) with the CRM
 * (used by market insights, CMA, reports, etc.).
 */

import { getCrmDb } from "@/lib/dal";
import { resolveDalContext } from "@/lib/context/industry-context";
import pg from "pg";

type PropertyType =
  | "SINGLE_FAMILY"
  | "CONDO"
  | "TOWNHOUSE"
  | "MULTI_FAMILY"
  | "LAND"
  | "COMMERCIAL"
  | "MOBILE_HOME"
  | "OTHER";
type ListingStatus = "ACTIVE" | "PENDING" | "SOLD" | "WITHDRAWN" | "EXPIRED";

function mapPropertyType(websiteType: string | null): PropertyType {
  if (!websiteType) return "OTHER";
  const t = websiteType.toLowerCase();
  if (t.includes("condo") || t.includes("apartment")) return "CONDO";
  if (t.includes("house") || t.includes("single") || t.includes("detached"))
    return "SINGLE_FAMILY";
  if (t.includes("town")) return "TOWNHOUSE";
  if (
    t.includes("duplex") ||
    t.includes("triplex") ||
    t.includes("multi") ||
    t.includes("revenue")
  )
    return "MULTI_FAMILY";
  if (t.includes("land") || t.includes("lot")) return "LAND";
  if (t.includes("commercial") || t.includes("industrial")) return "COMMERCIAL";
  if (t.includes("mobile")) return "MOBILE_HOME";
  return "OTHER";
}

function mapListingStatus(websiteStatus: string | null): ListingStatus {
  if (!websiteStatus) return "ACTIVE";
  const s = websiteStatus.toLowerCase();
  if (s === "sold") return "SOLD";
  if (s === "pending") return "PENDING";
  if (s === "withdrawn" || s === "removed") return "WITHDRAWN";
  if (s === "expired") return "EXPIRED";
  return "ACTIVE";
}

export interface CrmImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

/**
 * Read listings from a broker's website DB and import new ones into CRM REProperty.
 * Skips any MLS number already present in the CRM for this user.
 */
export async function importApifyListingsToCrm(
  userId: string,
  websiteDatabaseUrl: string,
): Promise<CrmImportResult> {
  const result: CrmImportResult = { imported: 0, skipped: 0, errors: 0 };
  const ctx = await resolveDalContext(userId);
  const db = getCrmDb(ctx);

  if (!websiteDatabaseUrl) return result;

  const client = new pg.Client({
    connectionString: websiteDatabaseUrl,
    ssl: { rejectUnauthorized: true },
  });

  try {
    await client.connect();

    const { rows: websiteListings } = await client.query(`
      SELECT mls_number, title, address, city, province, property_type, listing_type,
             status, price, bedrooms, bathrooms, area, latitude, longitude, postal_code,
             original_url, created_at, updated_at
      FROM properties
      WHERE mls_number IS NOT NULL AND mls_number != ''
      ORDER BY updated_at DESC
      LIMIT 500
    `);

    if (websiteListings.length === 0) return result;

    const mlsNumbers = websiteListings
      .map((r: any) => r.mls_number)
      .filter(Boolean) as string[];

    const existingInCrm = await db.rEProperty.findMany({
      where: { userId, mlsNumber: { in: mlsNumbers } },
      select: { mlsNumber: true },
    });
    const existingSet = new Set(existingInCrm.map((r) => r.mlsNumber));

    const newListings = websiteListings.filter(
      (r: any) => r.mls_number && !existingSet.has(r.mls_number),
    );
    result.skipped = websiteListings.length - newListings.length;

    if (newListings.length === 0) return result;

    const batch = newListings.map((r: any) => {
      const price = r.price
        ? parseFloat(String(r.price).replace(/[^0-9.]/g, ""))
        : null;
      const status = mapListingStatus(r.status);
      return {
        userId,
        address: (r.address || r.title || "").slice(0, 500),
        city: r.city || "Montréal",
        state: "QC",
        zip: r.postal_code || "",
        country: "CA",
        mlsNumber: r.mls_number,
        listPrice: price && price > 0 ? price : null,
        soldPrice: status === "SOLD" ? price : null,
        propertyType: mapPropertyType(r.property_type) as any,
        listingStatus: status as any,
        beds: r.bedrooms ? parseInt(r.bedrooms) : null,
        baths: r.bathrooms ? parseFloat(r.bathrooms) : null,
        sqft: r.area ? parseInt(r.area) : null,
        latitude: r.latitude ? parseFloat(r.latitude) : null,
        longitude: r.longitude ? parseFloat(r.longitude) : null,
        isBrokerListing: false,
        listingDate: r.created_at ? new Date(r.created_at) : new Date(),
        description:
          `Imported from Centris via Apify sync. Original: ${r.original_url || ""}`.trim(),
      };
    });

    const created = await db.rEProperty.createMany({
      data: batch,
      skipDuplicates: true,
    });
    result.imported = created.count;
  } catch (err) {
    console.error("[apify-crm-import] Error:", err);
    result.errors++;
  } finally {
    await client.end();
  }

  return result;
}
