/**
 * Zillow Scraper for US FSBO Listings
 * Uses Apify actor: maxcopell~zillow-scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './index';

export async function scrapeZillow(config: {
  userId: string;
  targetCities: string[];
  targetStates?: string[];
  minPrice?: number;
  maxPrice?: number;
  maxListings?: number;
  fsboOnly?: boolean;
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

  const actorId = 'maxcopell~zillow-scraper';
  const city = config.targetCities[0] || 'austin';
  const state = config.targetStates?.[0] || 'tx';
  
  // Zillow search URL - FSBO filter
  const searchUrl = config.fsboOnly !== false 
    ? `https://www.zillow.com/${city}-${state.toLowerCase()}/fsbo/`
    : `https://www.zillow.com/${city}-${state.toLowerCase()}/`;

  console.log('🏠 Starting Zillow scrape for:', city, state, config.fsboOnly !== false ? '(FSBO)' : '');

  const input = {
    searchUrl,
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
      console.error('❌ Zillow Apify error:', response.status, errorText);
      return { success: false, listings: [], errors: [`Apify error: ${response.status}`] };
    }

    const result = await response.json();
    const runId = result.data?.id;

    if (!runId) {
      return { success: false, listings: [], errors: ['Failed to start Zillow scrape'] };
    }

    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `Zillow FSBO - ${city}, ${state}`,
        sources: ['ZILLOW_FSBO'],
        targetCities: config.targetCities,
        targetStates: config.targetStates,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'RUNNING',
        lastRunAt: new Date()
      },
      update: { status: 'RUNNING', lastRunAt: new Date() }
    });

    console.log('✅ Zillow scrape started, job ID:', runId);
    return { success: true, listings: [], errors: [], jobId: runId, status: 'started' };

  } catch (error: any) {
    console.error('❌ Zillow scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkZillowJobStatus(runId: string, userId: string) {
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
      await storeZillowListing(userId, item);
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

async function storeZillowListing(userId: string, item: any) {
  const externalId = item.zpid || item.id || `zillow_${Date.now()}`;
  
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: externalId, source: 'ZILLOW_FSBO' as any }
  });

  const listingData = {
    source: 'ZILLOW_FSBO' as any,
    sourceUrl: item.detailUrl || item.url || `https://www.zillow.com/homedetails/${externalId}_zpid/`,
    sourceListingId: externalId,
    address: item.streetAddress || item.address || '',
    city: item.city || '',
    state: item.state || '',
    zip: item.zipcode || item.postalCode,
    country: 'US',
    listPrice: item.price || item.unformattedPrice || 0,
    propertyType: item.homeType || item.propertyType || 'Single Family',
    beds: item.bedrooms || item.beds,
    baths: item.bathrooms || item.baths,
    sqft: item.livingArea || item.squareFeet,
    yearBuilt: item.yearBuilt,
    description: item.description,
    sellerName: item.brokerName || item.agentName,
    sellerPhone: item.brokerPhoneNumber || item.agentPhone,
    photos: item.photos || item.images || (item.imgSrc ? [item.imgSrc] : []),
    daysOnMarket: item.daysOnZillow || 0,
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
