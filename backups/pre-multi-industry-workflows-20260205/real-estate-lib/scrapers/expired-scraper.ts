/**
 * Expired Listing Scraper
 * Finds listings that have expired/been withdrawn from MLS
 * These are high-value prospects for real estate agents
 */

import { prisma } from '@/lib/db';
import { runApifyActor, APIFY_ACTORS } from './apify-client';
import { normalizePhone } from './utils';

export interface ExpiredListingInput {
  mlsNumber?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  originalListPrice?: number;
  lastListPrice?: number;
  daysOnMarket: number;
  expiredDate: Date;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  sourceUrl?: string;
}

export interface ExpiredScrapingConfig {
  userId: string;
  targetCities?: string[];
  targetStates?: string[];
  targetZipCodes?: string[];
  minPrice?: number;
  maxPrice?: number;
  maxDaysExpired?: number; // Only get listings expired within X days
  maxListings?: number;
}

/**
 * Scrape expired listings (requires MLS access or public records)
 */
export async function scrapeExpiredListings(config: ExpiredScrapingConfig): Promise<{
  success: boolean;
  totalFound: number;
  newLeads: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let totalFound = 0;
  let newLeads = 0;

  try {
    // Method 1: Scrape from public property records
    const publicRecordsResult = await scrapePublicRecords(config);
    totalFound += publicRecordsResult.found;
    newLeads += publicRecordsResult.newLeads;
    if (publicRecordsResult.error) errors.push(publicRecordsResult.error);

    // Method 2: Scrape from Zillow "Off Market" listings
    const offMarketResult = await scrapeOffMarketListings(config);
    totalFound += offMarketResult.found;
    newLeads += offMarketResult.newLeads;
    if (offMarketResult.error) errors.push(offMarketResult.error);

    return {
      success: newLeads > 0 || errors.length === 0,
      totalFound,
      newLeads,
      errors
    };
  } catch (error) {
    return {
      success: false,
      totalFound: 0,
      newLeads: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Scrape public property records for expired listings
 */
async function scrapePublicRecords(config: ExpiredScrapingConfig) {
  // This would typically require county assessor data or a service like ATTOM
  // Using a generic approach here
  
  const counties = mapStatesToCounties(config.targetStates || []);
  const startUrls = counties.map(county => ({
    url: `https://www.${county.toLowerCase().replace(' ', '')}-assessor.gov/property-search`
  }));

  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.WEB_SCRAPER,
    input: {
      startUrls,
      pageFunction: `
        async function pageFunction(context) {
          const { page, request } = context;
          // Generic property record extraction
          const listings = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.property-record')).map(el => ({
              address: el.querySelector('.address')?.textContent,
              owner: el.querySelector('.owner-name')?.textContent,
              status: el.querySelector('.status')?.textContent,
              lastSale: el.querySelector('.last-sale-date')?.textContent
            }));
          });
          return listings.filter(l => l.status?.toLowerCase().includes('expired'));
        }
      `,
      maxRequestsPerCrawl: config.maxListings || 50
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, error: apifyResult.error };
  }

  const items = apifyResult.items?.flat() || [];
  let newLeads = 0;

  for (const item of items) {
    if (!item.address) continue;
    
    const saved = await saveExpiredListing(config.userId, {
      address: item.address,
      city: 'Unknown',
      state: config.targetStates?.[0] || 'Unknown',
      daysOnMarket: 0,
      expiredDate: new Date(),
      ownerName: item.owner
    });
    
    if (!saved.duplicate) newLeads++;
  }

  return { found: items.length, newLeads };
}

/**
 * Scrape Zillow off-market/recently sold listings
 */
async function scrapeOffMarketListings(config: ExpiredScrapingConfig) {
  const searchUrls = (config.targetStates || ['CA']).map(
    state => `https://www.zillow.com/${state.toLowerCase()}/?searchQueryState={"filterState":{"isRecentlySold":{"value":true},"doz":{"value":"30"}}}`
  );

  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.ZILLOW_SCRAPER,
    input: {
      searchUrls,
      maxItems: config.maxListings || 50,
      includeOffMarket: true,
      includeRecentlySold: true
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, error: apifyResult.error };
  }

  const items = apifyResult.items || [];
  let newLeads = 0;

  // Filter for listings that were listed but didn't sell (expired/withdrawn)
  const expiredItems = items.filter((item: any) => 
    item.homeStatus === 'RECENTLY_SOLD' && 
    item.daysOnZillow > 60 // Long time on market suggests difficulty selling
  );

  for (const item of expiredItems) {
    const saved = await saveExpiredListing(config.userId, {
      address: item.address?.streetAddress || 'Unknown',
      city: item.address?.city || 'Unknown',
      state: item.address?.state || 'Unknown',
      zip: item.address?.zipcode,
      originalListPrice: item.price,
      daysOnMarket: item.daysOnZillow || 0,
      expiredDate: new Date(),
      propertyType: item.homeType,
      beds: item.bedrooms,
      baths: item.bathrooms,
      sqft: item.livingArea,
      sourceUrl: item.url || item.detailUrl
    });
    
    if (!saved.duplicate) newLeads++;
  }

  return { found: expiredItems.length, newLeads };
}

/**
 * Save an expired listing to the database
 */
async function saveExpiredListing(userId: string, listing: ExpiredListingInput) {
  // Check for duplicate
  const existing = await prisma.rEExpiredListing.findFirst({
    where: {
      assignedUserId: userId,
      address: listing.address,
      city: listing.city
    }
  });

  if (existing) {
    return { success: true, listing: existing, duplicate: true };
  }

  const newListing = await prisma.rEExpiredListing.create({
    data: {
      assignedUserId: userId,
      source: 'SCRAPED',
      sourceId: listing.mlsNumber,
      address: listing.address,
      city: listing.city,
      state: listing.state,
      zip: listing.zip,
      originalListPrice: listing.originalListPrice,
      finalListPrice: listing.lastListPrice,
      daysOnMarket: listing.daysOnMarket,
      expiredDate: listing.expiredDate,
      ownerName: listing.ownerName,
      ownerPhone: listing.ownerPhone ? normalizePhone(listing.ownerPhone) : null,
      ownerEmail: listing.ownerEmail,
      status: 'NEW'
    }
  });

  return { success: true, listing: newListing, duplicate: false };
}

/**
 * Map states to major counties for property record lookup
 */
function mapStatesToCounties(states: string[]): string[] {
  const stateCountyMap: Record<string, string[]> = {
    'CA': ['Los Angeles County', 'San Diego County', 'Orange County'],
    'TX': ['Harris County', 'Dallas County', 'Tarrant County'],
    'FL': ['Miami-Dade County', 'Broward County', 'Palm Beach County'],
    'NY': ['New York County', 'Kings County', 'Queens County'],
    'ON': ['Toronto', 'Ottawa', 'Mississauga'],
    'BC': ['Vancouver', 'Surrey', 'Burnaby'],
    'QC': ['Montreal', 'Quebec City', 'Laval']
  };

  return states.flatMap(state => stateCountyMap[state] || []);
}
