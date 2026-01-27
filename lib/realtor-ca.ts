/**
 * Realtor.ca Scraper for Canadian Real Estate Listings
 * Uses Apify actor: scrapemind~Realtor-ca-Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './index';

export async function scrapeRealtorCA(config: {
  userId: string;
  targetCities: string[];
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

  const actorId = 'scrapemind~Realtor-ca-Scraper';
  const city = config.targetCities[0] || 'toronto';
  
  // Realtor.ca search URL
  const searchUrl = `https://www.realtor.ca/map#ZoomLevel=11&Center=${encodeURIComponent(city)}&LatitudeMax=45.5&LongitudeMax=-73.5&LatitudeMin=45.4&LongitudeMin=-73.6&Sort=6-D&PropertyTypeGroupID=1&TransactionTypeId=2&PropertySearchTypeId=1&Currency=CAD`;

  console.log('🏠 Starting Realtor.ca scrape for:', city);

  const input = {
    location: city,
    maxItems: Math.min(config.maxListings || 50, 100),
    minPrice: config.minPrice,
    maxPrice: config.maxPrice,
    propertyType: 'residential',
    transactionType: 'sale'
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
      console.error('❌ Realtor.ca Apify error:', response.status, errorText);
      return { success: false, listings: [], errors: [`Apify error: ${response.status}`] };
    }

    const result = await response.json();
    const runId = result.data?.id;

    if (!runId) {
      return { success: false, listings: [], errors: ['Failed to start Realtor.ca scrape'] };
    }

    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `Realtor.ca - ${city}`,
        sources: ['REALTOR_CA'],
        targetCities: config.targetCities,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'RUNNING',
        lastRunAt: new Date()
      },
      update: { status: 'RUNNING', lastRunAt: new Date() }
    });

    console.log('✅ Realtor.ca scrape started, job ID:', runId);
    return { success: true, listings: [], errors: [], jobId: runId, status: 'started' };

  } catch (error: any) {
    console.error('❌ Realtor.ca scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkRealtorCAJobStatus(runId: string, userId: string) {
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
      await storeRealtorCAListing(userId, item);
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

async function storeRealtorCAListing(userId: string, item: any) {
  const externalId = item.MlsNumber || item.id || `rca_${Date.now()}`;
  
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: externalId, source: 'REALTOR_CA' as any }
  });

  const listingData = {
    source: 'REALTOR_CA' as any,
    sourceUrl: item.RelativeDetailsURL ? `https://www.realtor.ca${item.RelativeDetailsURL}` : item.url || '',
    sourceListingId: externalId,
    address: item.Property?.Address?.AddressText || item.address || '',
    city: item.Property?.Address?.City || item.city || '',
    state: item.Property?.Address?.Province || item.province || 'ON',
    zip: item.Property?.Address?.PostalCode || item.postalCode,
    country: 'CA',
    listPrice: parseInt(String(item.Property?.Price || item.price || 0).replace(/[^0-9]/g, '')) || 0,
    propertyType: item.Property?.Type || item.propertyType || 'Residential',
    beds: parseInt(item.Building?.Bedrooms) || item.bedrooms,
    baths: parseFloat(item.Building?.BathroomTotal) || item.bathrooms,
    sqft: parseInt(item.Building?.SizeInterior?.replace(/[^0-9]/g, '')) || item.squareFeet,
    description: item.PublicRemarks || item.description,
    sellerName: item.Individual?.[0]?.Name || item.agentName,
    sellerPhone: item.Individual?.[0]?.Phones?.[0]?.PhoneNumber || item.agentPhone,
    photos: item.Property?.Photo ? [item.Property.Photo.HighResPath] : (item.images || []),
    daysOnMarket: 0,
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
