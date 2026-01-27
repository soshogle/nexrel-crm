/**
 * Realtor.com Scraper for US Real Estate Listings
 * Uses Apify actor: epctex~realtor-scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './index';

export async function scrapeRealtorCom(config: {
  userId: string;
  targetCities: string[];
  targetStates?: string[];
  minPrice?: number;
  maxPrice?: number;
  maxListings?: number;
}): Promise<{
  success: boolean;
  listings: any[];
  errors: string[];
  jobId?: string;
  status?: string;
}> {
  const apiToken = await getApifyToken();
  if (!apiToken) {
    return { success: false, listings: [], errors: ['Apify API token not configured'] };
  }

  const actorId = 'epctex~realtor-scraper';
  const city = config.targetCities[0] || 'austin';
  const state = config.targetStates?.[0] || 'TX';
  
  // Realtor.com search URL for FSBO listings
  const searchUrl = `https://www.realtor.com/realestateandhomes-search/${city}_${state}/type-single-family-home/fsbo`;

  console.log('🏠 Starting Realtor.com scrape for:', city, state);

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
      console.error('❌ Realtor.com Apify error:', response.status, errorText);
      return { success: false, listings: [], errors: [`Apify error: ${response.status}`] };
    }

    const result = await response.json();
    const runId = result.data?.id;

    if (!runId) {
      return { success: false, listings: [], errors: ['Failed to start Realtor.com scrape'] };
    }

    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `Realtor.com - ${city}, ${state}`,
        sources: ['REALTOR_COM'],
        targetCities: config.targetCities,
        targetStates: config.targetStates,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'RUNNING',
        lastRunAt: new Date()
      },
      update: { status: 'RUNNING', lastRunAt: new Date() }
    });

    console.log('✅ Realtor.com scrape started, job ID:', runId);
    return { success: true, listings: [], errors: [], jobId: runId, status: 'started' };

  } catch (error: any) {
    console.error('❌ Realtor.com scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkRealtorComJobStatus(runId: string, userId: string) {
  const apiToken = await getApifyToken();
  if (!apiToken) throw new Error('Apify token not found');

  const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
  const statusData = await statusRes.json();
  const runStatus = statusData.data?.status;

  if (runStatus === 'SUCCEEDED') {
    const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
    const items = await datasetRes.json();
    
    const listings = Array.isArray(items) ? items : [];
    
    for (const item of listings) {
      await storeRealtorComListing(userId, item);
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

async function storeRealtorComListing(userId: string, item: any) {
  const externalId = item.property_id || item.listing_id || item.id || `rcom_${Date.now()}`;
  
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: externalId, source: 'REALTOR_COM' as any }
  });

  const address = item.location?.address || item.address || {};
  
  const listingData = {
    source: 'REALTOR_COM' as any,
    sourceUrl: item.href || item.url || `https://www.realtor.com/realestateandhomes-detail/${externalId}`,
    sourceListingId: externalId,
    address: address.line || item.streetAddress || '',
    city: address.city || item.city || '',
    state: address.state_code || address.state || item.state || '',
    zip: address.postal_code || item.zipCode,
    country: 'US',
    listPrice: item.list_price || item.price || 0,
    propertyType: item.description?.type || item.propertyType || 'Single Family',
    beds: item.description?.beds || item.bedrooms,
    baths: item.description?.baths || item.bathrooms,
    sqft: item.description?.sqft || item.squareFeet,
    yearBuilt: item.description?.year_built || item.yearBuilt,
    description: item.description?.text || item.remarks,
    sellerName: item.advertisers?.[0]?.name || item.agentName,
    sellerPhone: item.advertisers?.[0]?.phone || item.agentPhone,
    photos: item.photos?.map((p: any) => p.href || p.url) || item.images || [],
    daysOnMarket: item.list_date ? Math.floor((Date.now() - new Date(item.list_date).getTime()) / 86400000) : 0,
    lastSeenAt: new Date(),
    assignedUserId: userId
  };

  if (existing) {
    await prisma.rEFSBOListing.update({
      where: { id: existing.id },
      data: { listPrice: listingData.listPrice, lastSeenAt: new Date() }
    });
  } else {
    await prisma.rEFSBOListing.create({
      data: { ...listingData, firstSeenAt: new Date(), status: 'NEW' }
    });
  }
}
