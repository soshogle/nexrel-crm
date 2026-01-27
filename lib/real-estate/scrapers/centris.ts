/**
 * Centris.ca Scraper for Quebec Real Estate Listings
 * Uses Apify actor: ecomscrape~centris-property-search-scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './index';

export interface CentrisListing {
  externalId: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  price: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  brokerName?: string;
  brokerPhone?: string;
  listingUrl: string;
  imageUrls: string[];
  daysOnMarket: number;
}

export async function scrapeCentris(config: {
  userId: string;
  targetCities: string[];
  minPrice?: number;
  maxPrice?: number;
  maxListings?: number;
}): Promise<{
  success: boolean;
  listings: CentrisListing[];
  errors: string[];
  jobId?: string;
  status?: string;
}> {
  const apiToken = await getApifyToken();
  if (!apiToken) {
    return { success: false, listings: [], errors: ['Apify API token not configured'] };
  }

  // Centris search actor
  const actorId = 'ecomscrape~centris-property-search-scraper';
  
  // Build search URL for Centris
  const city = config.targetCities[0] || 'montreal';
  const searchUrl = `https://www.centris.ca/en/properties~for-sale~${city.toLowerCase().replace(/\s+/g, '-')}?view=Thumbnail`;

  console.log('🏠 Starting Centris scrape for:', city, searchUrl);

  const input = {
    startUrls: [{ url: searchUrl }],
    maxItems: Math.min(config.maxListings || 50, 100),
    proxy: { useApifyProxy: true }
  };

  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}&maxItems=${input.maxItems}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Centris Apify error:', response.status, errorText);
      return { success: false, listings: [], errors: [`Apify error: ${response.status}`] };
    }

    const result = await response.json();
    const runId = result.data?.id;

    if (!runId) {
      return { success: false, listings: [], errors: ['Failed to start Centris scrape'] };
    }

    // Save job for tracking
    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `Centris - ${city}`,
        sources: ['CENTRIS'],
        targetCities: config.targetCities,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'RUNNING',
        lastRunAt: new Date()
      },
      update: {
        status: 'RUNNING',
        lastRunAt: new Date()
      }
    });

    console.log('✅ Centris scrape started, job ID:', runId);

    return {
      success: true,
      listings: [],
      errors: [],
      jobId: runId,
      status: 'started'
    };

  } catch (error: any) {
    console.error('❌ Centris scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkCentrisJobStatus(runId: string, userId: string) {
  const apiToken = await getApifyToken();
  if (!apiToken) throw new Error('Apify token not found');

  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
  const statusData = await statusRes.json();
  const runStatus = statusData.data?.status;

  if (runStatus === 'SUCCEEDED') {
    const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
    const items = await datasetRes.json();
    
    const listings = Array.isArray(items) ? items.map(mapCentrisListing) : [];
    
    // Store in database
    for (const listing of listings) {
      await storeCentrisListing(userId, listing);
    }

    await prisma.rEScrapingJob.update({
      where: { id: runId },
      data: { status: 'COMPLETED', totalListingsFound: listings.length, lastRunStatus: 'SUCCESS' }
    }).catch(() => {});

    return { status: 'completed', listings };
  }

  if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(runStatus)) {
    return { status: 'failed', listings: [], error: runStatus };
  }

  return { status: 'running', listings: [], progress: statusData.data?.statusMessage };
}

function mapCentrisListing(item: any): CentrisListing {
  return {
    externalId: item.id || item.listingId || `centris_${Date.now()}`,
    address: item.address || item.streetAddress || '',
    city: item.city || item.municipality || '',
    province: item.province || 'QC',
    postalCode: item.postalCode || item.zipCode,
    price: parseInt(String(item.price || item.askingPrice || 0).replace(/[^0-9]/g, '')) || 0,
    propertyType: item.propertyType || item.type || 'Residential',
    bedrooms: item.bedrooms || item.beds,
    bathrooms: item.bathrooms || item.baths,
    squareFeet: item.squareFeet || item.livingArea,
    description: item.description,
    brokerName: item.brokerName || item.agentName,
    brokerPhone: item.brokerPhone || item.agentPhone,
    listingUrl: item.url || item.listingUrl || '',
    imageUrls: Array.isArray(item.images) ? item.images : (item.imageUrl ? [item.imageUrl] : []),
    daysOnMarket: item.daysOnMarket || 0
  };
}

async function storeCentrisListing(userId: string, listing: CentrisListing) {
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: listing.externalId, source: 'CENTRIS' as any }
  });

  if (existing) {
    await prisma.rEFSBOListing.update({
      where: { id: existing.id },
      data: { listPrice: listing.price, lastSeenAt: new Date() }
    });
  } else {
    await prisma.rEFSBOListing.create({
      data: {
        source: 'CENTRIS' as any,
        sourceUrl: listing.listingUrl,
        sourceListingId: listing.externalId,
        address: listing.address,
        city: listing.city,
        state: listing.province,
        zip: listing.postalCode,
        country: 'CA',
        listPrice: listing.price,
        propertyType: listing.propertyType,
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        sqft: listing.squareFeet,
        description: listing.description,
        sellerName: listing.brokerName,
        sellerPhone: listing.brokerPhone,
        photos: listing.imageUrls.length > 0 ? listing.imageUrls : undefined,
        daysOnMarket: listing.daysOnMarket,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        status: 'NEW',
        assignedUserId: userId
      }
    });
  }
}
