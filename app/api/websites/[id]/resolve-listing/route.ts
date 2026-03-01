/**
 * POST /api/websites/[id]/resolve-listing
 *
 * Called by the owner's website when a visitor searches for a listing that
 * doesn't exist in the website's local Neon DB. The flow:
 *   1. Search CRM DB (REProperty + RERentalListing) for active matches.
 *   2. If found in CRM → also enrich via Centris/Google for full details → sync to website.
 *   3. If not found in CRM → search Centris/Google → create in CRM → sync to website.
 *
 * Auth: x-website-secret header (same as other website→CRM server calls).
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { resolveWebsiteDb } from '@/lib/dal/resolve-website-db';
import { apiErrors } from '@/lib/api-error';
import { prisma } from '@/lib/db';
import { syncListingToWebsite } from '@/lib/website-builder/listings-service';
import type { SyncListingInput } from '@/lib/website-builder/listings-service';
import { enrichViaGoogleSearch, lookupPropertyByAddress } from '@/lib/listing-enrichment/google-search';
import { scrapeCentrisDetail } from '@/lib/listing-enrichment/centris-detail';
import type { EnrichedData } from '@/lib/listing-enrichment/types';
import type { PropertyLookupData } from '@/lib/listing-enrichment/google-search';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const websiteId = params.id;
    if (!websiteId) return apiErrors.badRequest('Website ID required');

    const secret = request.headers.get('x-website-secret');
    const expectedSecret = process.env.WEBSITE_VOICE_CONFIG_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const query: string = (body.query || '').trim();
    if (!query) return apiErrors.badRequest('query is required');

    const resolved = await resolveWebsiteDb(websiteId);
    if (!resolved) return apiErrors.notFound('Website not found');

    const website = await resolved.db.website.findFirst({
      where: { id: websiteId },
      select: { id: true, userId: true, neonDatabaseUrl: true, templateType: true },
    });

    if (!website || website.templateType !== 'SERVICE') {
      return apiErrors.notFound('No SERVICE website found');
    }

    const userId = website.userId;
    const isMlsLike = /^\d{5,12}$/.test(query);

    // --- Step 1: Search CRM DB ---
    const [crmProperties, crmRentals] = await Promise.all([
      prisma.rEProperty.findMany({
        where: {
          userId,
          listingStatus: 'ACTIVE',
          OR: isMlsLike
            ? [
                { mlsNumber: query },
                { address: { contains: query, mode: 'insensitive' } },
              ]
            : [
                { address: { contains: query, mode: 'insensitive' } },
                { mlsNumber: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
        },
        take: 5,
      }),
      prisma.rERentalListing.findMany({
        where: {
          userId,
          listingStatus: 'ACTIVE',
          OR: isMlsLike
            ? [
                { mlsNumber: query },
                { address: { contains: query, mode: 'insensitive' } },
              ]
            : [
                { address: { contains: query, mode: 'insensitive' } },
                { mlsNumber: { contains: query, mode: 'insensitive' } },
              ],
        },
        take: 5,
      }),
    ]);

    const synced: Array<{ type: string; address: string; mlsNumber?: string | null }> = [];

    // Sync found CRM sale properties to website with full data
    for (const prop of crmProperties) {
      const photos = Array.isArray(prop.photos) ? (prop.photos as string[]) : [];

      // Try to enrich with more detail from Centris/Google if we have an MLS number
      let enriched: EnrichedData | null = null;
      if (prop.mlsNumber) {
        enriched = await safeEnrich(prop.mlsNumber, prop.city, prop.address);
      }

      const syncInput: SyncListingInput = {
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
        photos: enriched?.galleryImages?.length ? enriched.galleryImages : photos,
        description: prop.description || enriched?.description || null,
        features: prop.features,
        lat: enriched?.latitude ? parseFloat(enriched.latitude) : null,
        lng: enriched?.longitude ? parseFloat(enriched.longitude) : null,
        virtualTourUrl: prop.virtualTourUrl || enriched?.virtualTourUrl || null,
        yearBuilt: prop.yearBuilt || enriched?.yearBuilt || null,
        lotSize: prop.lotSize ? String(prop.lotSize) : enriched?.lotArea || null,
        rooms: enriched?.rooms || null,
        areaUnit: enriched?.areaUnit || 'ft²',
        addendum: enriched?.addendum || null,
        neighborhood: null,
        featuresJson: enriched?.features || buildFeaturesJson(prop.features),
        roomDetails: enriched?.roomDetails || null,
      };

      const result = await syncListingToWebsite(userId, syncInput);
      if (result.success) {
        synced.push({ type: 'sale', address: prop.address, mlsNumber: prop.mlsNumber });
      }
    }

    // Sync found CRM rental listings to website
    for (const rental of crmRentals) {
      const photos = Array.isArray((rental as any).photos) ? ((rental as any).photos as string[]) : [];

      let enriched: EnrichedData | null = null;
      if (rental.mlsNumber) {
        enriched = await safeEnrich(rental.mlsNumber, rental.city, rental.address);
      }

      const syncInput: SyncListingInput = {
        address: rental.address,
        city: rental.city,
        state: rental.state,
        zip: rental.zip,
        country: rental.country || 'CA',
        beds: rental.beds,
        baths: rental.baths ? Math.round(rental.baths) : null,
        sqft: rental.sqft,
        propertyType: (rental as any).propertyType || 'OTHER',
        listingStatus: rental.listingStatus,
        rentPrice: rental.rentPrice,
        rentPriceLabel: rental.rentPriceLabel,
        priceLabel: rental.rentPriceLabel,
        listingType: 'rent',
        mlsNumber: rental.mlsNumber,
        photos: enriched?.galleryImages?.length ? enriched.galleryImages : photos,
        description: rental.description || enriched?.description || null,
        features: (rental as any).features || [],
        lat: enriched?.latitude ? parseFloat(enriched.latitude) : null,
        lng: enriched?.longitude ? parseFloat(enriched.longitude) : null,
        rooms: enriched?.rooms || null,
        areaUnit: enriched?.areaUnit || null,
        addendum: enriched?.addendum || null,
        featuresJson: enriched?.features || null,
        roomDetails: enriched?.roomDetails || null,
      };

      const result = await syncListingToWebsite(userId, syncInput);
      if (result.success) {
        synced.push({ type: 'rent', address: rental.address, mlsNumber: rental.mlsNumber });
      }
    }

    if (synced.length > 0) {
      return NextResponse.json({
        resolved: true,
        source: 'crm',
        count: synced.length,
        listings: synced,
      });
    }

    // --- Step 2: Not in CRM → search Centris/Google ---
    let enriched: (EnrichedData & { mlsNumber?: string; listPrice?: number; virtualTourUrl?: string }) | null = null;
    let sourceUrl: string | undefined;

    try {
      if (isMlsLike) {
        const gResult = await enrichViaGoogleSearch(query);
        if (gResult.data) {
          const data = gResult.data as PropertyLookupData;
          enriched = data;
          sourceUrl = gResult.sourceUrl;
          if (!enriched.mlsNumber) enriched.mlsNumber = query;
        }
      } else {
        const addrResult = await lookupPropertyByAddress(query);
        if (addrResult?.data) {
          enriched = addrResult.data as PropertyLookupData;
          sourceUrl = addrResult.sourceUrl;
        }
      }
    } catch (e) {
      console.warn('[resolve-listing] Online search failed:', e);
    }

    if (!enriched) {
      return NextResponse.json({ resolved: false, source: 'none', count: 0, listings: [] });
    }

    // If we found a Centris URL, try to get even more detail from the Centris detail page
    if (sourceUrl?.includes('centris.ca')) {
      try {
        const centrisDetail = await scrapeCentrisDetail(sourceUrl);
        if (centrisDetail) {
          enriched = mergeEnrichedData(enriched, centrisDetail);
        }
      } catch (e) {
        console.warn('[resolve-listing] Centris detail scrape failed:', e);
      }
    }

    const address = query;
    const city = '';
    const state = 'QC';
    const zip = '';

    // Create in CRM
    try {
      await prisma.rEProperty.create({
        data: {
          userId,
          address,
          city,
          state,
          zip,
          country: 'CA',
          beds: enriched.bedrooms || null,
          baths: enriched.bathrooms || null,
          sqft: enriched.area ? parseInt(String(enriched.area).replace(/[^0-9]/g, ''), 10) || null : null,
          lotSize: enriched.lotArea ? parseInt(String(enriched.lotArea).replace(/[^0-9]/g, ''), 10) || null : null,
          yearBuilt: enriched.yearBuilt || null,
          propertyType: mapPropertyType(enriched.buildingStyle),
          listingStatus: 'ACTIVE',
          listPrice: enriched.listPrice || null,
          mlsNumber: enriched.mlsNumber || null,
          photos: enriched.galleryImages || [],
          description: enriched.description || null,
          features: [
            ...(enriched.features?.amenities || []),
            ...(enriched.features?.proximity || []),
          ],
          virtualTourUrl: enriched.virtualTourUrl || null,
        },
      });
    } catch (e: any) {
      console.warn('[resolve-listing] CRM insert warning:', e.message);
    }

    // Sync to website with full data
    const syncInput: SyncListingInput = {
      address,
      city,
      state,
      zip,
      country: 'CA',
      beds: enriched.bedrooms || null,
      baths: enriched.bathrooms || null,
      sqft: enriched.area ? parseInt(String(enriched.area).replace(/[^0-9]/g, ''), 10) || null : null,
      propertyType: mapPropertyType(enriched.buildingStyle) || 'OTHER',
      listingStatus: 'ACTIVE',
      listPrice: enriched.listPrice || null,
      listingType: 'sale',
      mlsNumber: enriched.mlsNumber || null,
      photos: enriched.galleryImages || (enriched.mainImageUrl ? [enriched.mainImageUrl] : null),
      description: enriched.description || null,
      features: [
        ...(enriched.features?.amenities || []),
        ...(enriched.features?.proximity || []),
      ],
      lat: enriched.latitude ? parseFloat(enriched.latitude) : null,
      lng: enriched.longitude ? parseFloat(enriched.longitude) : null,
      virtualTourUrl: enriched.virtualTourUrl || sourceUrl || null,
      yearBuilt: enriched.yearBuilt || null,
      lotSize: enriched.lotArea || null,
      rooms: enriched.rooms || null,
      areaUnit: enriched.areaUnit || 'ft²',
      addendum: enriched.addendum || null,
      featuresJson: enriched.features || null,
      roomDetails: enriched.roomDetails || null,
    };

    const syncResult = await syncListingToWebsite(userId, syncInput);

    return NextResponse.json({
      resolved: syncResult.success,
      source: 'online',
      count: syncResult.success ? 1 : 0,
      listings: syncResult.success
        ? [{ type: 'sale', address, mlsNumber: enriched.mlsNumber }]
        : [],
    });
  } catch (error: any) {
    console.error('[resolve-listing] Error:', error);
    return apiErrors.internal(error.message || 'Listing resolution failed');
  }
}

/** Try to enrich a listing from Centris/Google. Never throws. */
async function safeEnrich(
  mlsNumber: string,
  city?: string,
  address?: string
): Promise<EnrichedData | null> {
  try {
    const result = await enrichViaGoogleSearch(mlsNumber, city, address);
    if (!result.data) return null;

    // If we found a Centris URL, scrape the detail page for richer data
    if (result.sourceUrl?.includes('centris.ca')) {
      try {
        const detail = await scrapeCentrisDetail(result.sourceUrl);
        if (detail) return mergeEnrichedData(result.data, detail);
      } catch {}
    }

    return result.data;
  } catch (e) {
    console.warn('[resolve-listing] safeEnrich failed:', e);
    return null;
  }
}

/** Merge two EnrichedData objects, preferring non-null values from `b` over `a`. */
function mergeEnrichedData(a: EnrichedData, b: EnrichedData): EnrichedData {
  return {
    description: b.description || a.description,
    buildingStyle: b.buildingStyle || a.buildingStyle,
    yearBuilt: b.yearBuilt ?? a.yearBuilt,
    area: b.area || a.area,
    areaUnit: b.areaUnit || a.areaUnit,
    lotArea: b.lotArea || a.lotArea,
    parking: b.parking || a.parking,
    rooms: b.rooms ?? a.rooms,
    bedrooms: b.bedrooms ?? a.bedrooms,
    bathrooms: b.bathrooms ?? a.bathrooms,
    features: mergeFeatures(a.features, b.features),
    roomDetails: b.roomDetails?.length ? b.roomDetails : a.roomDetails,
    galleryImages: (b.galleryImages?.length ?? 0) > (a.galleryImages?.length ?? 0) ? b.galleryImages : a.galleryImages,
    mainImageUrl: b.mainImageUrl || a.mainImageUrl,
    latitude: b.latitude || a.latitude,
    longitude: b.longitude || a.longitude,
    addendum: b.addendum || a.addendum,
    municipalTax: b.municipalTax || a.municipalTax,
    schoolTax: b.schoolTax || a.schoolTax,
    moveInDate: b.moveInDate || a.moveInDate,
    virtualTourUrl: b.virtualTourUrl || a.virtualTourUrl,
    mlsNumber: b.mlsNumber || a.mlsNumber,
    listPrice: b.listPrice ?? a.listPrice,
  };
}

function mergeFeatures(
  a?: EnrichedData['features'],
  b?: EnrichedData['features']
): EnrichedData['features'] {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return {
    heating: b.heating || a.heating,
    heatingEnergy: b.heatingEnergy || a.heatingEnergy,
    waterSupply: b.waterSupply || a.waterSupply,
    sewageSystem: b.sewageSystem || a.sewageSystem,
    amenities: [...new Set([...(a.amenities || []), ...(b.amenities || [])])],
    proximity: [...new Set([...(a.proximity || []), ...(b.proximity || [])])],
    inclusions: [...new Set([...(a.inclusions || []), ...(b.inclusions || [])])],
  };
}

/** Convert a flat features string array into the structured JSON the website expects. */
function buildFeaturesJson(features: string[]): SyncListingInput['featuresJson'] {
  if (!features?.length) return null;
  const amenities: string[] = [];
  let heating: string | undefined;
  for (const f of features) {
    if (f.toLowerCase().startsWith('heating:')) {
      heating = f.replace(/^heating:\s*/i, '').trim();
    } else if (f.toLowerCase().startsWith('parking:')) {
      // parking is a separate field in the features JSON
    } else {
      amenities.push(f);
    }
  }
  return { amenities, heating };
}

function mapPropertyType(raw?: string): any {
  if (!raw) return 'SINGLE_FAMILY';
  const normalized = raw.toUpperCase().replace(/[\s\-]+/g, '_');
  const valid = ['SINGLE_FAMILY', 'CONDO', 'TOWNHOUSE', 'MULTI_FAMILY', 'LAND', 'COMMERCIAL', 'OTHER'];
  if (valid.includes(normalized)) return normalized;
  if (normalized.includes('CONDO')) return 'CONDO';
  if (normalized.includes('TOWN')) return 'TOWNHOUSE';
  if (normalized.includes('DUPLEX') || normalized.includes('TRIPLEX') || normalized.includes('MULTI')) return 'MULTI_FAMILY';
  if (normalized.includes('LAND') || normalized.includes('TERRAIN')) return 'LAND';
  if (normalized.includes('COMMERCIAL')) return 'COMMERCIAL';
  return 'SINGLE_FAMILY';
}
