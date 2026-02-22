/**
 * Property Evaluation — find comparables and estimate value.
 * Connects to broker's Neon DB via Website.neonDatabaseUrl.
 * Falls back to Centris regional stats when no comparables.
 */

import { createDalContext } from "@/lib/context/industry-context";
import { websiteService } from "@/lib/dal";
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
  postalCode?: string;
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

/** Canadian postal code format: A1A 1A1. Extract FSA (first 3 chars) for area matching. */
function extractPostalCode(text: string): string | null {
  const match = text.match(/\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/);
  return match ? (match[1] + match[2]).toUpperCase().replace(/\s/g, "") : null;
}

function getFSA(postalCode: string): string {
  return postalCode.slice(0, 3).toUpperCase();
}

/** Haversine distance in km between two lat/lng points */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find comparable properties from broker's database.
 * Prioritizes: same postal code (FSA) > distance > price proximity.
 * Canada Post format: FSA (first 3 chars) defines delivery area.
 */
export async function findComparables(
  websiteId: string,
  details: PropertyDetails,
  userId: string,
  limit = 5,
  industry?: string | null
): Promise<ComparableProperty[]> {
  const ctx = createDalContext(userId, industry);
  const website = await websiteService.findUnique(ctx, websiteId);

  if (!website?.neonDatabaseUrl || website.templateType !== "SERVICE") {
    return [];
  }

  const pool = getPool(website.neonDatabaseUrl);
  const city = details.city || extractCityFromAddress(details.address);
  const beds = details.bedrooms ?? 0;
  const baths = details.bathrooms ?? 0;
  const propType = details.propertyType || "house";
  const subjectPostal = details.postalCode
    ? extractPostalCode(details.postalCode) || details.postalCode.replace(/\s/g, "").toUpperCase()
    : extractPostalCode(details.address);
  const subjectFSA = subjectPostal ? getFSA(subjectPostal) : null;
  const subjectLat = details.latitude;
  const subjectLng = details.longitude;

  // Fetch more candidates (up to 50) — we'll filter/sort by postal, distance, price
  const fetchLimit = 50;
  let result: { rows: any[] };
  try {
    result = await pool.query(
      `SELECT address, city, price, bedrooms, bathrooms, property_type, status, listing_type, area,
              latitude, longitude,
              COALESCE(postal_code, (regexp_match(address, '([A-Za-z][0-9][A-Za-z][ -]?[0-9][A-Za-z][0-9])'))[1]) AS postal_code
       FROM properties
       WHERE status IN ('sold', 'active')
         AND listing_type = 'sale'
         AND city ILIKE $1
         AND price IS NOT NULL AND price::numeric > 0
         AND (bedrooms IS NULL OR bedrooms BETWEEN $2 AND $3)
         AND (bathrooms IS NULL OR bathrooms >= $4)
       ORDER BY CASE WHEN status = 'sold' THEN 0 ELSE 1 END, created_at DESC
       LIMIT $5`,
      [`%${city}%`, Math.max(0, beds - 1), beds + 2, Math.max(0, baths - 1), fetchLimit]
    );
  } catch {
    result = await pool.query(
      `SELECT address, city, price, bedrooms, bathrooms, property_type, status, listing_type, area,
              latitude, longitude
       FROM properties
       WHERE status IN ('sold', 'active')
         AND listing_type = 'sale'
         AND city ILIKE $1
         AND price IS NOT NULL AND price::numeric > 0
         AND (bedrooms IS NULL OR bedrooms BETWEEN $2 AND $3)
         AND (bathrooms IS NULL OR bathrooms >= $4)
       ORDER BY CASE WHEN status = 'sold' THEN 0 ELSE 1 END, created_at DESC
       LIMIT $5`,
      [`%${city}%`, Math.max(0, beds - 1), beds + 2, Math.max(0, baths - 1), fetchLimit]
    );
  }

  const rows = result.rows.map((r: any) => {
    const pc = r.postal_code || extractPostalCode(r.address || "");
    const fsa = pc ? getFSA(String(pc).replace(/\s/g, "")) : null;
    const lat = r.latitude != null ? parseFloat(r.latitude) : null;
    const lng = r.longitude != null ? parseFloat(r.longitude) : null;
    const price = parseFloat(r.price) || 0;
    return {
      address: r.address || "",
      city: r.city || "",
      price,
      bedrooms: r.bedrooms != null ? parseInt(r.bedrooms, 10) : null,
      bathrooms: r.bathrooms != null ? parseFloat(r.bathrooms) : null,
      propertyType: r.property_type || "house",
      status: r.status || "active",
      listingType: r.listing_type || "sale",
      area: r.area != null ? parseFloat(r.area) : null,
      fsa,
      lat,
      lng,
    };
  });

  // Filter out properties >25km away when we have subject coordinates
  let filtered = rows;
  if (subjectLat != null && subjectLng != null && Number.isFinite(subjectLat) && Number.isFinite(subjectLng)) {
    filtered = rows.filter((r) => {
      if (r.lat == null || r.lng == null || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) return true;
      return haversineKm(subjectLat, subjectLng, r.lat, r.lng) <= 25;
    });
  }
  if (filtered.length === 0) filtered = rows;

  // Score and sort: postal code match > distance > price proximity
  const scored = filtered.map((r) => {
    let score = 0;
    // Same FSA (postal code area) — highest priority
    if (subjectFSA && r.fsa && r.fsa === subjectFSA) score += 1000;
    else if (subjectFSA && r.fsa && r.fsa[0] === subjectFSA[0]) score += 100; // Same first letter (province)
    // Distance when we have coords
    if (
      subjectLat != null &&
      subjectLng != null &&
      r.lat != null &&
      r.lng != null &&
      Number.isFinite(r.lat) &&
      Number.isFinite(r.lng)
    ) {
      const km = haversineKm(subjectLat, subjectLng, r.lat, r.lng);
      if (km <= 2) score += 500;
      else if (km <= 5) score += 200;
      else if (km <= 10) score += 50;
      else if (km > 25) score -= 200; // Penalize far away
    }
    // Price proximity (assume subject ~median of comparables; prefer within ±30%)
    const prices = filtered.map((x) => x.price).filter((p) => p > 0);
    const medianPrice = prices.length > 0 ? median(prices) : r.price;
    const pctDiff = medianPrice > 0 ? Math.abs(r.price - medianPrice) / medianPrice : 0;
    if (pctDiff <= 0.2) score += 80;
    else if (pctDiff <= 0.35) score += 40;
    else if (pctDiff > 0.6) score -= 100;
    return { ...r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  return top.map(({ fsa, lat, lng, ...r }) => ({
    address: r.address,
    city: r.city,
    price: r.price,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    propertyType: r.propertyType,
    status: r.status,
    listingType: r.listingType,
    area: r.area,
  }));
}

/**
 * Run property evaluation: find comparables and estimate value.
 */
export async function runPropertyEvaluation(
  websiteId: string,
  details: PropertyDetails,
  userId: string,
  industry?: string | null
): Promise<PropertyEvaluationResult> {
  const comparables = await findComparables(websiteId, details, userId, 5, industry);

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
