/**
 * Geo-Based Comparable Properties Engine
 *
 * Finds truly comparable sold properties using a multi-factor scoring system
 * that emphasizes geographic proximity above all else:
 *
 *   1. Haversine distance (lat/lng) — closest properties score highest
 *   2. Postal code proximity — same full postal > same FSA > neighbouring FSA
 *   3. Municipality / city match
 *   4. Property criteria — beds, baths, sqft, year built, property type
 *
 * Works with both CRM REProperty records (sold listings from Centris import)
 * and the website's Neon DB (active/sold with lat/lng already populated).
 *
 * When REProperty records lack coordinates, the engine geocodes the subject
 * property and scores remaining comps by postal code and criteria.
 */

import { prisma } from '@/lib/db';
import { reverseGeocodePostalCode } from '@/lib/geocode-postal';

const EARTH_RADIUS_KM = 6371;

export interface SubjectForComps {
  address: string;
  city: string;
  state: string;
  zip?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt?: number;
  lotSize?: number;
  propertyType: string;
}

export interface GeoComparable {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  soldPrice: number | null;
  listPrice: number | null;
  soldDate: Date | null;
  listingDate: Date | null;
  daysOnMarket: number;
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number | null;
  lotSize: number | null;
  propertyType: string;
  mlsNumber: string | null;
  status: 'sold' | 'active' | 'pending';
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  postalMatch: 'exact' | 'fsa' | 'partial' | 'none';
  proximityScore: number;
  criteriaScore: number;
  totalScore: number;
  pricePerSqft: number;
  adjustedPrice?: number;
  adjustments?: { type: string; amount: number; reason: string }[];
}

export interface GeoCompsResult {
  subject: SubjectForComps;
  comparables: GeoComparable[];
  medianPrice: number;
  medianAdjustedPrice: number;
  suggestedPriceRange: { low: number; mid: number; high: number };
  avgPricePerSqft: number;
  avgDistanceKm: number | null;
  postalCodeCoverage: string;
  confidence: 'high' | 'medium' | 'low';
}

// ── Haversine distance ──────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Postal code helpers ─────────────────────────────────────────────

function extractPostalCode(text: string): string | null {
  const match = text.match(/\b([A-Za-z]\d[A-Za-z])[ -]?(\d[A-Za-z]\d)\b/);
  return match ? (match[1] + match[2]).toUpperCase() : null;
}

function getFSA(postalCode: string): string {
  return postalCode.slice(0, 3).toUpperCase();
}

function postalProximity(
  subjectPostal: string | null,
  compPostal: string | null
): { match: 'exact' | 'fsa' | 'partial' | 'none'; score: number } {
  if (!subjectPostal || !compPostal) return { match: 'none', score: 0 };

  const s = subjectPostal.replace(/\s/g, '').toUpperCase();
  const c = compPostal.replace(/\s/g, '').toUpperCase();

  if (s === c) return { match: 'exact', score: 50 };

  const sFSA = getFSA(s);
  const cFSA = getFSA(c);
  if (sFSA === cFSA) return { match: 'fsa', score: 35 };

  // First 2 chars match (same letter + digit = very close area)
  if (s.slice(0, 2) === c.slice(0, 2)) return { match: 'partial', score: 15 };

  // Same first letter (same province region)
  if (s[0] === c[0]) return { match: 'partial', score: 5 };

  return { match: 'none', score: 0 };
}

// ── Distance scoring ────────────────────────────────────────────────

function distanceScore(km: number | null): number {
  if (km == null) return 0;
  if (km <= 0.5) return 50;  // Same street / block
  if (km <= 1) return 45;
  if (km <= 2) return 38;
  if (km <= 3) return 30;
  if (km <= 5) return 22;
  if (km <= 8) return 14;
  if (km <= 12) return 8;
  if (km <= 20) return 3;
  return 0;
}

// ── Criteria scoring ────────────────────────────────────────────────

function criteriaScore(subject: SubjectForComps, comp: {
  beds: number;
  baths: number;
  sqft: number;
  yearBuilt: number | null;
  propertyType: string;
  lotSize: number | null;
  city: string;
}): number {
  let score = 0;

  // City match (important if no lat/lng)
  if (subject.city.toLowerCase() === comp.city.toLowerCase()) score += 8;

  // Property type match
  if (normalizeType(subject.propertyType) === normalizeType(comp.propertyType)) score += 10;

  // Bedrooms (max 15 pts)
  const bedDiff = Math.abs(subject.beds - comp.beds);
  if (bedDiff === 0) score += 15;
  else if (bedDiff === 1) score += 10;
  else if (bedDiff === 2) score += 4;

  // Bathrooms (max 10 pts)
  const bathDiff = Math.abs(subject.baths - comp.baths);
  if (bathDiff === 0) score += 10;
  else if (bathDiff <= 1) score += 6;
  else if (bathDiff <= 2) score += 2;

  // Square footage (max 15 pts)
  const sqftRatio = subject.sqft > 0 && comp.sqft > 0
    ? Math.abs(subject.sqft - comp.sqft) / Math.max(subject.sqft, 1)
    : 1;
  if (sqftRatio <= 0.05) score += 15;
  else if (sqftRatio <= 0.10) score += 12;
  else if (sqftRatio <= 0.20) score += 8;
  else if (sqftRatio <= 0.35) score += 4;

  // Year built (max 8 pts)
  if (subject.yearBuilt && comp.yearBuilt) {
    const yearDiff = Math.abs(subject.yearBuilt - comp.yearBuilt);
    if (yearDiff <= 3) score += 8;
    else if (yearDiff <= 8) score += 5;
    else if (yearDiff <= 15) score += 2;
  }

  // Lot size (max 4 pts)
  if (subject.lotSize && comp.lotSize && subject.lotSize > 0 && comp.lotSize > 0) {
    const lotRatio = Math.abs(subject.lotSize - comp.lotSize) / Math.max(subject.lotSize, 1);
    if (lotRatio <= 0.15) score += 4;
    else if (lotRatio <= 0.30) score += 2;
  }

  return score;
}

function normalizeType(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes('single') || lower.includes('house') || lower.includes('detached')) return 'single_family';
  if (lower.includes('condo') || lower.includes('apartment')) return 'condo';
  if (lower.includes('town')) return 'townhouse';
  if (lower.includes('duplex')) return 'duplex';
  if (lower.includes('triplex')) return 'triplex';
  if (lower.includes('multi')) return 'multi_family';
  if (lower.includes('land') || lower.includes('lot')) return 'land';
  return lower;
}

// ── Price adjustments ───────────────────────────────────────────────

function adjustPrice(
  subject: SubjectForComps,
  comp: GeoComparable
): { adjustedPrice: number; adjustments: { type: string; amount: number; reason: string }[] } {
  const adjustments: { type: string; amount: number; reason: string }[] = [];
  let adjustedPrice = comp.price;

  // Square footage ($100/sqft)
  if (subject.sqft > 0 && comp.sqft > 0) {
    const sqftDiff = subject.sqft - comp.sqft;
    if (Math.abs(sqftDiff) > 50) {
      const adj = sqftDiff * 100;
      adjustments.push({ type: 'sqft', amount: adj, reason: `Size: ${sqftDiff > 0 ? '+' : ''}${sqftDiff} sqft` });
      adjustedPrice += adj;
    }
  }

  // Bedrooms ($15,000 each)
  const bedDiff = subject.beds - comp.beds;
  if (bedDiff !== 0) {
    const adj = bedDiff * 15000;
    adjustments.push({ type: 'beds', amount: adj, reason: `Bedrooms: ${bedDiff > 0 ? '+' : ''}${bedDiff}` });
    adjustedPrice += adj;
  }

  // Bathrooms ($10,000 each)
  const bathDiff = subject.baths - comp.baths;
  if (Math.abs(bathDiff) >= 0.5) {
    const adj = Math.round(bathDiff * 10000);
    adjustments.push({ type: 'baths', amount: adj, reason: `Bathrooms: ${bathDiff > 0 ? '+' : ''}${bathDiff}` });
    adjustedPrice += adj;
  }

  // Age ($2,000/year, capped at $30k)
  if (subject.yearBuilt && comp.yearBuilt) {
    const ageDiff = subject.yearBuilt - comp.yearBuilt;
    if (Math.abs(ageDiff) > 5) {
      const adj = Math.min(Math.abs(ageDiff) * 2000, 30000) * Math.sign(ageDiff);
      adjustments.push({ type: 'age', amount: adj, reason: `Age: ${ageDiff > 0 ? '' : '-'}${Math.abs(ageDiff)} years` });
      adjustedPrice += adj;
    }
  }

  // Lot size ($5/sqft, capped at $25k)
  if (subject.lotSize && comp.lotSize && subject.lotSize > 0 && comp.lotSize > 0) {
    const lotDiff = subject.lotSize - comp.lotSize;
    if (Math.abs(lotDiff) > 500) {
      const adj = Math.min(Math.abs(lotDiff) * 5, 25000) * Math.sign(lotDiff);
      adjustments.push({ type: 'lotSize', amount: adj, reason: `Lot: ${lotDiff > 0 ? '+' : ''}${lotDiff} sqft` });
      adjustedPrice += adj;
    }
  }

  // Distance penalty for comps >5km away
  if (comp.distanceKm != null && comp.distanceKm > 5) {
    const penalty = -Math.round(adjustedPrice * 0.02 * Math.min((comp.distanceKm - 5) / 10, 1));
    adjustments.push({ type: 'distance', amount: penalty, reason: `Distance: ${comp.distanceKm.toFixed(1)}km away` });
    adjustedPrice += penalty;
  }

  return { adjustedPrice: Math.round(adjustedPrice), adjustments };
}

// ── Geocode subject property ────────────────────────────────────────

async function geocodeAddress(address: string, city: string, state: string): Promise<{
  lat: number | null;
  lng: number | null;
  postalCode: string | null;
} | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const query = `${address}, ${city}, ${state}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as any;
    const result = data.results?.[0];
    if (!result) return null;

    const loc = result.geometry?.location;
    let postalCode: string | null = null;
    for (const c of result.address_components || []) {
      if (c.types?.includes('postal_code')) {
        postalCode = c.long_name?.replace(/\s/g, '').toUpperCase() || null;
      }
    }

    return {
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      postalCode,
    };
  } catch {
    return null;
  }
}

// ── Main function ───────────────────────────────────────────────────

/**
 * Find geo-based comparable sold properties.
 *
 * The scoring system heavily weights geographic proximity so that
 * results represent truly comparable properties in the same area.
 *
 * Max score breakdown (out of ~150 total):
 *   Haversine distance:     50 pts  (same block)
 *   Postal code proximity:  50 pts  (exact match)
 *   Property criteria:      ~55 pts (beds, baths, sqft, year, lot, city, type)
 */
export async function findGeoComparables(
  subject: SubjectForComps,
  userId: string,
  opts: {
    limit?: number;
    maxDistanceKm?: number;
    includeActive?: boolean;
    verbose?: boolean;
  } = {}
): Promise<GeoCompsResult> {
  const { limit = 10, maxDistanceKm = 25, includeActive = false, verbose = false } = opts;

  // Resolve subject coordinates and postal code
  let subjectLat = subject.latitude ?? null;
  let subjectLng = subject.longitude ?? null;
  let subjectPostal = subject.postalCode || subject.zip || extractPostalCode(subject.address);

  if ((subjectLat == null || subjectLng == null) && process.env.GOOGLE_MAPS_API_KEY) {
    const geo = await geocodeAddress(subject.address, subject.city, subject.state);
    if (geo) {
      subjectLat = geo.lat;
      subjectLng = geo.lng;
      if (!subjectPostal && geo.postalCode) subjectPostal = geo.postalCode;
    }
  }

  if (verbose) {
    console.log(`[geo-comps] Subject: ${subject.address}, ${subject.city}`);
    console.log(`[geo-comps] Coords: ${subjectLat}, ${subjectLng} | Postal: ${subjectPostal}`);
  }

  // Determine which statuses to include
  const statuses: string[] = ['SOLD'];
  if (includeActive) statuses.push('ACTIVE', 'PENDING');

  // Fetch candidate properties from CRM
  const candidates = await prisma.rEProperty.findMany({
    where: {
      userId,
      listingStatus: { in: statuses as any },
      OR: [
        { soldPrice: { gt: 0 } },
        { listPrice: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      beds: true,
      baths: true,
      sqft: true,
      yearBuilt: true,
      lotSize: true,
      propertyType: true,
      listingStatus: true,
      listPrice: true,
      soldPrice: true,
      soldDate: true,
      listingDate: true,
      daysOnMarket: true,
      mlsNumber: true,
      latitude: true,
      longitude: true,
    },
    take: 500,
  });

  if (verbose) console.log(`[geo-comps] Found ${candidates.length} candidate properties`);

  // Score each candidate
  const scored: GeoComparable[] = [];

  for (const c of candidates) {
    if (!c.beds && !c.baths && !c.sqft) continue;

    const status: 'sold' | 'active' | 'pending' =
      c.listingStatus === 'SOLD' ? 'sold'
        : c.listingStatus === 'PENDING' ? 'pending'
          : 'active';

    const price = status === 'sold'
      ? Number(c.soldPrice || c.listPrice || 0)
      : Number(c.listPrice || c.soldPrice || 0);

    if (price <= 0) continue;

    const compLat = c.latitude;
    const compLng = c.longitude;
    const compPostal = c.zip || extractPostalCode(c.address);

    // Calculate distance
    let km: number | null = null;
    if (subjectLat != null && subjectLng != null && compLat != null && compLng != null) {
      km = haversineKm(subjectLat, subjectLng, compLat, compLng);
      if (km > maxDistanceKm) continue;
    }

    // Postal proximity
    const postal = postalProximity(subjectPostal, compPostal);

    // If no geo data at all, require at least same city
    if (km == null && postal.match === 'none') {
      if (subject.city.toLowerCase() !== c.city.toLowerCase()) continue;
    }

    const dScore = distanceScore(km);
    const cScore = criteriaScore(subject, {
      beds: c.beds || 0,
      baths: c.baths || 0,
      sqft: c.sqft || 0,
      yearBuilt: c.yearBuilt,
      propertyType: c.propertyType,
      lotSize: c.lotSize,
      city: c.city,
    });

    const sqft = c.sqft || 1;

    const comp: GeoComparable = {
      id: c.id,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      price,
      soldPrice: c.soldPrice,
      listPrice: c.listPrice,
      soldDate: c.soldDate,
      listingDate: c.listingDate,
      daysOnMarket: c.daysOnMarket,
      beds: c.beds || 0,
      baths: c.baths || 0,
      sqft,
      yearBuilt: c.yearBuilt,
      lotSize: c.lotSize,
      propertyType: c.propertyType,
      mlsNumber: c.mlsNumber,
      status,
      latitude: compLat,
      longitude: compLng,
      distanceKm: km,
      postalMatch: postal.match,
      proximityScore: dScore + postal.score,
      criteriaScore: cScore,
      totalScore: dScore + postal.score + cScore,
      pricePerSqft: Math.round(price / Math.max(sqft, 1)),
    };

    scored.push(comp);
  }

  // Sort by total score (proximity + criteria), prefer sold over active
  scored.sort((a, b) => {
    if (a.status === 'sold' && b.status !== 'sold') return -1;
    if (b.status === 'sold' && a.status !== 'sold') return 1;
    return b.totalScore - a.totalScore;
  });

  const topComps = scored.slice(0, limit);

  // Apply price adjustments
  for (const comp of topComps) {
    const { adjustedPrice, adjustments } = adjustPrice(subject, comp);
    comp.adjustedPrice = adjustedPrice;
    comp.adjustments = adjustments;
  }

  // Calculate summary stats
  const prices = topComps.map((c) => c.price).filter((p) => p > 0);
  const adjPrices = topComps.map((c) => c.adjustedPrice || c.price).filter((p) => p > 0);
  const distances = topComps.map((c) => c.distanceKm).filter((d): d is number => d != null);

  const medPrice = median(prices);
  const medAdjPrice = median(adjPrices);
  const avgPpsf = prices.length > 0
    ? Math.round(topComps.reduce((sum, c) => sum + c.pricePerSqft, 0) / topComps.length)
    : 0;

  const sortedAdj = [...adjPrices].sort((a, b) => a - b);
  const suggestedLow = sortedAdj[0] || medAdjPrice * 0.95;
  const suggestedHigh = sortedAdj[sortedAdj.length - 1] || medAdjPrice * 1.05;

  const postalMatches = topComps.filter((c) => c.postalMatch === 'exact' || c.postalMatch === 'fsa');
  const postalCoverage = topComps.length > 0
    ? `${postalMatches.length}/${topComps.length} comps in same postal area`
    : 'No comps found';

  const confidence: 'high' | 'medium' | 'low' =
    topComps.length >= 5 && postalMatches.length >= 3 ? 'high'
      : topComps.length >= 3 ? 'medium'
        : 'low';

  if (verbose) {
    console.log(`[geo-comps] Returning ${topComps.length} comps`);
    console.log(`[geo-comps] Median price: $${medPrice.toLocaleString()} | Adjusted: $${medAdjPrice.toLocaleString()}`);
    console.log(`[geo-comps] Confidence: ${confidence} | Postal: ${postalCoverage}`);
  }

  return {
    subject,
    comparables: topComps,
    medianPrice: medPrice,
    medianAdjustedPrice: medAdjPrice,
    suggestedPriceRange: {
      low: Math.round(suggestedLow),
      mid: Math.round(medAdjPrice),
      high: Math.round(suggestedHigh),
    },
    avgPricePerSqft: avgPpsf,
    avgDistanceKm: distances.length > 0
      ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length * 10) / 10
      : null,
    postalCodeCoverage: postalCoverage,
    confidence,
  };
}

/**
 * Backfill lat/lng for REProperty records that are missing coordinates.
 * Uses Google Maps Geocoding API.
 */
export async function backfillPropertyCoordinates(
  userId: string,
  opts: { limit?: number; verbose?: boolean } = {}
): Promise<{ updated: number; failed: number }> {
  const { limit = 50, verbose = false } = opts;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    if (verbose) console.log('[backfill] No GOOGLE_MAPS_API_KEY — skipping');
    return { updated: 0, failed: 0 };
  }

  const properties = await prisma.rEProperty.findMany({
    where: {
      userId,
      latitude: null,
      longitude: null,
    },
    select: { id: true, address: true, city: true, state: true, zip: true },
    take: limit,
  });

  if (verbose) console.log(`[backfill] ${properties.length} properties need coordinates`);

  let updated = 0;
  let failed = 0;

  for (const prop of properties) {
    const geo = await geocodeAddress(prop.address, prop.city, prop.state);
    if (geo?.lat != null && geo?.lng != null) {
      const updateData: any = { latitude: geo.lat, longitude: geo.lng };
      if (geo.postalCode && (!prop.zip || prop.zip.length < 3)) {
        updateData.zip = geo.postalCode;
      }
      await prisma.rEProperty.update({ where: { id: prop.id }, data: updateData });
      updated++;
    } else {
      failed++;
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  if (verbose) console.log(`[backfill] Updated: ${updated}, Failed: ${failed}`);
  return { updated, failed };
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
