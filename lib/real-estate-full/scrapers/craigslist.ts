/**
 * Craigslist Real Estate Scraper for FSBO Listings
 * Uses Apify actor: benthepythondev~craigslist-real-estate-scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './index';

export async function scrapeCraigslist(config: {
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

  const actorId = 'benthepythondev~craigslist-real-estate-scraper';
  const city = config.targetCities[0] || 'austin';
  
  // Map city names to Craigslist subdomains
  const cityMap: Record<string, string> = {
    'new york': 'newyork',
    'los angeles': 'losangeles',
    'san francisco': 'sfbay',
    'chicago': 'chicago',
    'houston': 'houston',
    'phoenix': 'phoenix',
    'austin': 'austin',
    'dallas': 'dallas',
    'miami': 'miami',
    'seattle': 'seattle',
    'denver': 'denver',
    'montreal': 'montreal',
    'toronto': 'toronto',
    'vancouver': 'vancouver'
  };
  
  const subdomain = cityMap[city.toLowerCase()] || city.toLowerCase().replace(/\s+/g, '');
  const searchUrl = `https://${subdomain}.craigslist.org/search/rea?hasPic=1&postedToday=0&bundleDuplicates=1&fsbo=1`;

  console.log('🏠 Starting Craigslist scrape for:', city, searchUrl);

  const input = {
    startUrls: [{ url: searchUrl }],
    maxItems: Math.min(config.maxListings || 50, 100),
    minPrice: config.minPrice,
    maxPrice: config.maxPrice
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
      console.error('❌ Craigslist Apify error:', response.status, errorText);
      return { success: false, listings: [], errors: [`Apify error: ${response.status}`] };
    }

    const result = await response.json();
    const runId = result.data?.id;

    if (!runId) {
      return { success: false, listings: [], errors: ['Failed to start Craigslist scrape'] };
    }

    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `Craigslist - ${city}`,
        sources: ['CRAIGSLIST'],
        targetCities: config.targetCities,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'RUNNING',
        lastRunAt: new Date()
      },
      update: { status: 'RUNNING', lastRunAt: new Date() }
    });

    console.log('✅ Craigslist scrape started, job ID:', runId);
    return { success: true, listings: [], errors: [], jobId: runId, status: 'started' };

  } catch (error: any) {
    console.error('❌ Craigslist scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkCraigslistJobStatus(runId: string, userId: string) {
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
      await storeCraigslistListing(userId, item);
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

async function storeCraigslistListing(userId: string, item: any) {
  const externalId = item.id || item.postId || `cl_${Date.now()}`;
  
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: externalId, source: 'CRAIGSLIST' as any }
  });

  // Parse location from title or address
  const location = item.location || item.hood || '';
  const [city, state] = location.split(',').map((s: string) => s.trim());

  const listingData = {
    source: 'CRAIGSLIST' as any,
    sourceUrl: item.url || item.link || '',
    sourceListingId: externalId,
    address: item.address || item.title || '',
    city: city || item.city || '',
    state: state || item.state || '',
    zip: item.zipcode,
    country: item.country || 'US',
    listPrice: parseInt(String(item.price || 0).replace(/[^0-9]/g, '')) || 0,
    propertyType: item.propertyType || item.housing_type || 'Single Family',
    beds: item.bedrooms || item.beds,
    baths: item.bathrooms || item.baths,
    sqft: item.sqft || item.squareFeet,
    description: item.description || item.body,
    sellerPhone: item.phone,
    sellerEmail: item.email,
    photos: item.images || item.photos || (item.image ? [item.image] : []),
    daysOnMarket: item.postDate ? Math.floor((Date.now() - new Date(item.postDate).getTime()) / 86400000) : 0,
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
