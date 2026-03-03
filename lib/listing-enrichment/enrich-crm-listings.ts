/**
 * CRM Listing Enrichment
 *
 * Enriches REProperty records in the CRM database with full listing data
 * scraped directly from Centris, RE/MAX, and Realtor.ca.
 *
 * Flow:
 *   1. Fetch active REProperty records that are missing key data.
 *   2. For each, build the Centris / RE/MAX URL from the MLS number.
 *   3. Scrape the detail page (Centris → RE/MAX → Google fallback).
 *   4. Update the CRM record with enriched data.
 *   5. Sync the enriched listing to the owner's website.
 *
 * Apify is used only for the initial bulk import; this provides the
 * full detail scrape that Apify doesn't cover (room details, addendum,
 * features, coordinates, gallery images, etc.).
 */

import { prisma } from '@/lib/db';
import { scrapeCentrisDetail } from './centris-detail';
import { scrapeRemaxDetail } from './remax-detail';
import { enrichViaGoogleSearch } from './google-search';
import { syncListingToWebsite } from '@/lib/website-builder/listings-service';
import type { EnrichedData } from './types';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mergeEnriched(a: EnrichedData, b: EnrichedData): EnrichedData {
  const merged = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value == null) continue;
    const existing = (merged as any)[key];
    if (existing == null ||
        (typeof existing === 'string' && existing.length < 10) ||
        (Array.isArray(existing) && existing.length === 0)) {
      (merged as any)[key] = value;
    }
  }
  return merged;
}

interface EnrichResult {
  mlsNumber: string;
  address: string;
  source: string;
  fieldsUpdated: string[];
  syncedToWebsite: boolean;
  error?: string;
}

/**
 * Enrich all active CRM REProperty listings that are missing data.
 * Scrapes directly from Centris/RE/MAX as the primary source.
 */
export async function enrichCrmListings(
  userId: string,
  opts: { limit?: number; delayMs?: number; verbose?: boolean } = {}
): Promise<{ results: EnrichResult[]; enriched: number; failed: number }> {
  const { limit = 30, delayMs = 2000, verbose = false } = opts;

  const properties = await prisma.rEProperty.findMany({
    where: {
      userId,
      listingStatus: 'ACTIVE',
      mlsNumber: { not: null },
      OR: [
        { description: null },
        { description: '' },
        { yearBuilt: null },
        { sqft: null },
        { photos: { equals: null } },
      ],
    },
    orderBy: { updatedAt: 'asc' },
    take: limit,
  });

  if (verbose) console.log(`[enrichCRM] Found ${properties.length} listings to enrich for user ${userId}`);

  const results: EnrichResult[] = [];
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < properties.length; i++) {
    const prop = properties[i];
    if (!prop.mlsNumber) continue;

    if (verbose) console.log(`[enrichCRM] [${i + 1}/${properties.length}] ${prop.mlsNumber}: ${prop.address}`);

    let data: EnrichedData | null = null;
    let source = 'none';

    // Tier 1a: Centris direct scrape
    const centrisUrl = `https://www.centris.ca/en/properties~for-sale~${slugify(prop.city)}/${prop.mlsNumber}`;
    try {
      const centrisData = await scrapeCentrisDetail(centrisUrl);
      if (centrisData) {
        data = centrisData;
        source = 'centris';
        if (verbose) console.log(`  [centris] Got data`);
      }
    } catch (e: any) {
      if (verbose) console.log(`  [centris] Failed: ${e.message}`);
    }

    // Tier 1b: RE/MAX direct scrape
    if (!data?.description || data.description.length < 30) {
      const remaxUrl = buildRemaxUrl(prop);
      if (remaxUrl) {
        try {
          const remaxData = await scrapeRemaxDetail(remaxUrl);
          if (remaxData) {
            data = data ? mergeEnriched(data, remaxData) : remaxData;
            source = data === remaxData ? 'remax' : `${source}+remax`;
            if (verbose) console.log(`  [remax] Got data`);
          }
        } catch (e: any) {
          if (verbose) console.log(`  [remax] Failed: ${e.message}`);
        }
      }
    }

    // Tier 2: Google search fallback
    if (!data?.description) {
      try {
        const gResult = await enrichViaGoogleSearch(prop.mlsNumber, prop.city, prop.address);
        if (gResult.data) {
          data = data ? mergeEnriched(data, gResult.data) : gResult.data;
          source = source === 'none' ? 'google' : `${source}+google`;
          if (verbose) console.log(`  [google] Got data`);
        }
      } catch (e: any) {
        if (verbose) console.log(`  [google] Failed: ${e.message}`);
      }
    }

    if (!data) {
      failed++;
      results.push({
        mlsNumber: prop.mlsNumber,
        address: prop.address,
        source: 'none',
        fieldsUpdated: [],
        syncedToWebsite: false,
        error: 'No enrichment data found',
      });
      if (i < properties.length - 1) await sleep(delayMs);
      continue;
    }

    // Update CRM REProperty
    const fieldsUpdated: string[] = [];
    const updateData: Record<string, any> = {};

    if (data.description && (!prop.description || prop.description.length < 30)) {
      updateData.description = data.description;
      fieldsUpdated.push('description');
    }
    if (data.yearBuilt && !prop.yearBuilt) {
      updateData.yearBuilt = data.yearBuilt;
      fieldsUpdated.push('yearBuilt');
    }
    if (data.area && !prop.sqft) {
      const sqft = parseInt(String(data.area).replace(/[^0-9]/g, ''), 10);
      if (sqft > 0) {
        updateData.sqft = sqft;
        fieldsUpdated.push('sqft');
      }
    }
    if (data.lotArea && !prop.lotSize) {
      const lotSize = parseInt(String(data.lotArea).replace(/[^0-9]/g, ''), 10);
      if (lotSize > 0) {
        updateData.lotSize = lotSize;
        fieldsUpdated.push('lotSize');
      }
    }
    if (data.bedrooms && !prop.beds) {
      updateData.beds = data.bedrooms;
      fieldsUpdated.push('beds');
    }
    if (data.bathrooms && !prop.baths) {
      updateData.baths = data.bathrooms;
      fieldsUpdated.push('baths');
    }
    if (data.galleryImages?.length && !Array.isArray(prop.photos)) {
      updateData.photos = data.galleryImages;
      fieldsUpdated.push('photos');
    }
    if (data.virtualTourUrl && !prop.virtualTourUrl) {
      updateData.virtualTourUrl = data.virtualTourUrl;
      fieldsUpdated.push('virtualTourUrl');
    }

    const enrichedFeatures = [
      ...(data.features?.amenities || []),
      ...(data.features?.proximity || []),
      ...(data.parking ? [`Parking: ${data.parking}`] : []),
    ];
    if (enrichedFeatures.length > 0 && (!prop.features || prop.features.length === 0)) {
      updateData.features = enrichedFeatures;
      fieldsUpdated.push('features');
    }

    // Days on market (for Market Insights stats)
    if (data.daysOnMarket != null && data.daysOnMarket > 0 && (!prop.daysOnMarket || prop.daysOnMarket === 0)) {
      updateData.daysOnMarket = data.daysOnMarket;
      fieldsUpdated.push('daysOnMarket');
    }
    // Listing date (for DOM computation when daysOnMarket missing)
    if (data.listingDate && !prop.listingDate) {
      const parsed = new Date(data.listingDate);
      if (!isNaN(parsed.getTime())) {
        updateData.listingDate = parsed;
        fieldsUpdated.push('listingDate');
      }
    }

    // Populate lat/lng for geo-based comparables
    if (data.latitude && !prop.latitude) {
      const lat = parseFloat(data.latitude);
      if (Number.isFinite(lat)) {
        updateData.latitude = lat;
        fieldsUpdated.push('latitude');
      }
    }
    if (data.longitude && !prop.longitude) {
      const lng = parseFloat(data.longitude);
      if (Number.isFinite(lng)) {
        updateData.longitude = lng;
        fieldsUpdated.push('longitude');
      }
    }

    if (fieldsUpdated.length > 0) {
      await prisma.rEProperty.update({
        where: { id: prop.id },
        data: updateData,
      });
    }

    // Sync enriched listing to owner's website
    let syncedToWebsite = false;
    try {
      const photos = Array.isArray(updateData.photos) ? updateData.photos as string[]
        : Array.isArray(prop.photos) ? prop.photos as string[]
        : data.galleryImages || [];

      const syncResult = await syncListingToWebsite(userId, {
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zip: prop.zip,
        country: prop.country,
        beds: updateData.beds || prop.beds,
        baths: updateData.baths ? Math.round(updateData.baths) : prop.baths ? Math.round(prop.baths) : null,
        sqft: updateData.sqft || prop.sqft,
        propertyType: prop.propertyType,
        listingStatus: prop.listingStatus,
        listPrice: prop.listPrice,
        listingType: 'sale',
        mlsNumber: prop.mlsNumber,
        photos,
        description: updateData.description || prop.description,
        features: updateData.features || prop.features,
        lat: data.latitude ? parseFloat(data.latitude) : null,
        lng: data.longitude ? parseFloat(data.longitude) : null,
        virtualTourUrl: updateData.virtualTourUrl || prop.virtualTourUrl,
        yearBuilt: updateData.yearBuilt || prop.yearBuilt,
        lotSize: (updateData.lotSize || prop.lotSize) ? String(updateData.lotSize || prop.lotSize) : null,
        rooms: data.rooms || null,
        areaUnit: data.areaUnit || 'ft²',
        addendum: data.addendum || null,
        featuresJson: data.features || null,
        roomDetails: data.roomDetails || null,
      });

      syncedToWebsite = syncResult.success;
    } catch (e: any) {
      if (verbose) console.log(`  [sync] Website sync failed: ${e.message}`);
    }

    enriched++;
    results.push({
      mlsNumber: prop.mlsNumber,
      address: prop.address,
      source,
      fieldsUpdated,
      syncedToWebsite,
    });

    if (verbose) console.log(`  ✅ ${source} | Updated: ${fieldsUpdated.join(', ') || 'none'} | Website: ${syncedToWebsite}`);
    if (i < properties.length - 1) await sleep(delayMs);
  }

  return { results, enriched, failed };
}

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildRemaxUrl(prop: { address: string; city: string; mlsNumber?: string | null }): string | null {
  if (!prop.mlsNumber) return null;
  const slug = slugify(`${prop.address}-${prop.city}-${prop.mlsNumber}`);
  return `https://www.remax-quebec.com/en/properties/house-for-sale/${slug}`;
}

/**
 * Re-sync all enriched CRM listings to the owner's website DB.
 * Use after Apify overwrites enriched data on the website.
 */
export async function resyncEnrichedToWebsite(
  userId: string,
  opts: { limit?: number; verbose?: boolean } = {}
): Promise<{ synced: number; failed: number }> {
  const { limit = 200, verbose = false } = opts;

  const properties = await prisma.rEProperty.findMany({
    where: {
      userId,
      listingStatus: 'ACTIVE',
      mlsNumber: { not: null },
      OR: [
        { photos: { not: { equals: null } } },
        { description: { not: null } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  });

  if (verbose) console.log(`[resync] Found ${properties.length} enriched listings to re-sync`);

  let synced = 0;
  let failed = 0;

  for (const prop of properties) {
    if (!prop.mlsNumber) continue;

    const photos = Array.isArray(prop.photos) ? prop.photos as string[] : [];
    try {
      const result = await syncListingToWebsite(userId, {
        address: prop.address,
        city: prop.city,
        state: prop.state,
        zip: prop.zip,
        country: prop.country,
        beds: prop.beds,
        baths: prop.baths ? Math.round(prop.baths) : null,
        sqft: prop.sqft,
        propertyType: prop.propertyType,
        listingStatus: prop.listingStatus,
        listPrice: prop.listPrice,
        listingType: 'sale',
        mlsNumber: prop.mlsNumber,
        photos,
        description: prop.description,
        features: prop.features as string[] | null,
        lat: prop.latitude,
        lng: prop.longitude,
        virtualTourUrl: prop.virtualTourUrl,
        yearBuilt: prop.yearBuilt,
        lotSize: prop.lotSize ? String(prop.lotSize) : null,
        rooms: null,
        areaUnit: 'ft²',
        addendum: null,
        featuresJson: null,
        roomDetails: null,
      });

      if (result.success) {
        synced++;
        if (verbose) console.log(`  [resync] ✅ ${prop.mlsNumber}`);
      } else {
        failed++;
        if (verbose) console.log(`  [resync] ❌ ${prop.mlsNumber}: ${result.error}`);
      }
    } catch (e: any) {
      failed++;
      if (verbose) console.log(`  [resync] ❌ ${prop.mlsNumber}: ${e.message}`);
    }
  }

  return { synced, failed };
}
