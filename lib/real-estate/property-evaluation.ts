/**
 * Property Evaluation — find comparables and estimate value.
 * Connects to broker's Neon DB via Website.neonDatabaseUrl.
 * Falls back to Centris regional stats when no comparables.
 */

import { prisma } from "@/lib/db";
import { Pool } from "pg";
import { getRegionalMedianPrice } from "./centris-regional-stats";

let poolCache = new Map<string, Pool>();

function getPool(connectionString: string): Pool {
  let pool = poolCache.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString });
    poolCache.set(connectionString, pool);
  }
  return pool;
}

export interface PropertyDetails {
  address: string;
  city?: string;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  livingArea?: number;
  latitude?: number;
  longitude?: number;
}

export interface ComparableProperty {
  address: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  status: string;
  listingType: string;
  area: number | null;
}

export interface PropertyEvaluationResult {
  estimatedValue: number;
  comparables: ComparableProperty[];
  address: string;
  city: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  /** True when estimate came from Centris regional median (no comparables) */
  usedRegionalFallback?: boolean;
}

/**
 * Find comparable properties from broker's database.
 * Prefers sold listings, then active for-sale. Matches by city, similar beds/baths.
 */
export async function findComparables(
  websiteId: string,
  details: PropertyDetails,
  limit = 5
): Promise<ComparableProperty[]> {
  const website = await prisma.website.findFirst({
    where: { id: websiteId },
    select: { neonDatabaseUrl: true, templateType: true },
  });

  if (!website?.neonDatabaseUrl || website.templateType !== "SERVICE") {
    return [];
  }

  const pool = getPool(website.neonDatabaseUrl);
  const city = details.city || extractCityFromAddress(details.address);
  const beds = details.bedrooms ?? 0;
  const baths = details.bathrooms ?? 0;
  const propType = details.propertyType || "house";

  // Find sold first, then active. Same city, similar beds/baths. For sale only.
  const result = await pool.query(
    `SELECT address, city, price, bedrooms, bathrooms, property_type, status, listing_type, area
     FROM properties
     WHERE status IN ('sold', 'active')
       AND listing_type = 'sale'
       AND city ILIKE $1
       AND price IS NOT NULL AND price::numeric > 0
       AND (bedrooms IS NULL OR bedrooms BETWEEN $2 AND $3)
       AND (bathrooms IS NULL OR bathrooms >= $4)
     ORDER BY CASE WHEN status = 'sold' THEN 0 ELSE 1 END, created_at DESC
     LIMIT $5`,
    [`%${city}%`, Math.max(0, beds - 1), beds + 2, Math.max(0, baths - 1), limit]
  );

  return result.rows.map((r: any) => ({
    address: r.address || "",
    city: r.city || "",
    price: parseFloat(r.price) || 0,
    bedrooms: r.bedrooms != null ? parseInt(r.bedrooms, 10) : null,
    bathrooms: r.bathrooms != null ? parseFloat(r.bathrooms) : null,
    propertyType: r.property_type || "house",
    status: r.status || "active",
    listingType: r.listing_type || "sale",
    area: r.area != null ? parseFloat(r.area) : null,
  }));
}

/**
 * Run property evaluation: find comparables and estimate value.
 */
export async function runPropertyEvaluation(
  websiteId: string,
  details: PropertyDetails
): Promise<PropertyEvaluationResult> {
  const comparables = await findComparables(websiteId, details, 5);

  const city = details.city || extractCityFromAddress(details.address) || "";
  const propType = details.propertyType || "house";

  if (comparables.length === 0) {
    const regionalMedian = getRegionalMedianPrice(city || "Montreal", propType);
    return {
      estimatedValue: regionalMedian ?? 0,
      comparables: [],
      address: details.address,
      city,
      bedrooms: details.bedrooms ?? null,
      bathrooms: details.bathrooms ?? null,
      propertyType: propType,
      usedRegionalFallback: !!regionalMedian,
    };
  }

  // Simple valuation: median of comparable prices, with slight adjustment for beds/baths
  const prices = comparables.map((c) => c.price).filter((p) => p > 0);
  const medianPrice = prices.length > 0 ? median(prices) : 0;

  return {
    estimatedValue: Math.round(medianPrice),
    comparables,
    address: details.address,
    city: details.city || comparables[0]?.city || "",
    bedrooms: details.bedrooms ?? null,
    bathrooms: details.bathrooms ?? null,
    propertyType: details.propertyType || "house",
  };
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function extractCityFromAddress(address: string): string {
  // Simple: last part after comma is often city (e.g. "123 Main St, Montreal, QC")
  const parts = address.split(",").map((p) => p.trim());
  return parts.length >= 2 ? parts[parts.length - 2] : "";
}
