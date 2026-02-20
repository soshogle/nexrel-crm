/**
 * Types for the listing enrichment system.
 * Used across all three tiers of enrichment.
 */

export interface EnrichedData {
  description?: string;
  buildingStyle?: string;
  yearBuilt?: number;
  area?: string;
  areaUnit?: string;
  lotArea?: string;
  parking?: string;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  features?: {
    heating?: string;
    heatingEnergy?: string;
    waterSupply?: string;
    sewageSystem?: string;
    amenities?: string[];
    proximity?: string[];
    inclusions?: string[];
  };
  roomDetails?: Array<{
    name: string;
    level: string;
    dimensions: string;
    flooring?: string;
    details?: string;
  }>;
  galleryImages?: string[];
  mainImageUrl?: string;
  latitude?: string;
  longitude?: string;
  addendum?: string;
  municipalTax?: string;
  schoolTax?: string;
  moveInDate?: string;
  brokerName?: string;
  brokerAgency?: string;
  brokerPhone?: string;
}

export interface EnrichmentResult {
  listingId: number;
  mlsNumber: string;
  tier: 1 | 2 | 3;
  success: boolean;
  data?: EnrichedData;
  error?: string;
  durationMs: number;
}

export interface EnrichmentOptions {
  limit?: number;
  /** Only enrich listings missing these fields */
  requireFields?: (keyof EnrichedData)[];
  /** Skip listings already enriched after this date */
  enrichedAfter?: Date;
  /** Delay between requests (ms) to avoid rate limiting */
  delayMs?: number;
  /** Enable Tier 2 (screenshot + AI vision) */
  enableTier2?: boolean;
  /** Enable Tier 3 (Google search fallback) */
  enableTier3?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export interface ListingRow {
  id: number;
  mlsNumber: string;
  title: string;
  slug: string;
  description: string | null;
  originalUrl: string | null;
  features: unknown;
  roomDetails: unknown;
  yearBuilt: number | null;
  area: string | null;
  lotArea: string | null;
  mainImageUrl: string | null;
  galleryImages: string[] | null;
  latitude: string | null;
  longitude: string | null;
  addendum: string | null;
  address: string | null;
  city: string | null;
  propertyType: string | null;
  listingType: string | null;
}
