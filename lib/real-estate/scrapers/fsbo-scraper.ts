/**
 * FSBO (For Sale By Owner) Scraper
 * Uses Apify to scrape FSBO listings from multiple sources
 */

import { prisma } from '@/lib/db';
import { REFSBOSource } from '@prisma/client';
import { runApifyActor, APIFY_ACTORS, getDatasetItems, getRunStatus } from './apify-client';
import { saveFSBOListing, updateJobStatus, FSBOListingInput } from './scraper-service';
import { normalizePhone } from './utils';

export interface FSBOScrapingConfig {
  userId: string;
  jobId?: string;
  sources: REFSBOSource[];
  targetCities?: string[];
  targetStates?: string[];
  targetZipCodes?: string[];
  minPrice?: number;
  maxPrice?: number;
  maxListings?: number;
}

export interface FSBOScrapingResult {
  success: boolean;
  totalFound: number;
  newLeads: number;
  duplicates: number;
  bySource: Record<string, number>;
  errors: string[];
  runIds?: Record<string, string>;
}

/**
 * Scrape FSBO listings from configured sources
 */
export async function scrapeFSBOListings(config: FSBOScrapingConfig): Promise<FSBOScrapingResult> {
  const result: FSBOScrapingResult = {
    success: false,
    totalFound: 0,
    newLeads: 0,
    duplicates: 0,
    bySource: {},
    errors: [],
    runIds: {}
  };

  // Update job status if jobId provided
  if (config.jobId) {
    await updateJobStatus(config.jobId, 'RUNNING');
  }

  for (const source of config.sources) {
    try {
      console.log(`[FSBO Scraper] Starting scrape for source: ${source}`);
      
      const sourceResult = await scrapeSource(source, config);
      
      result.totalFound += sourceResult.found;
      result.newLeads += sourceResult.newLeads;
      result.duplicates += sourceResult.duplicates;
      result.bySource[source] = sourceResult.newLeads;
      
      if (sourceResult.runId) {
        result.runIds![source] = sourceResult.runId;
      }
      
      if (sourceResult.error) {
        result.errors.push(`${source}: ${sourceResult.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`${source}: ${errorMsg}`);
      result.bySource[source] = 0;
    }
  }

  result.success = result.newLeads > 0 || result.errors.length === 0;

  // Update job status
  if (config.jobId) {
    await updateJobStatus(
      config.jobId,
      result.success ? 'COMPLETED' : 'FAILED',
      { totalFound: result.totalFound, newLeads: result.newLeads }
    );
  }

  return result;
}

/**
 * Scrape a single source
 */
async function scrapeSource(
  source: REFSBOSource,
  config: FSBOScrapingConfig
): Promise<{
  found: number;
  newLeads: number;
  duplicates: number;
  runId?: string;
  error?: string;
}> {
  switch (source) {
    case 'ZILLOW_FSBO':
      return await scrapeZillowFSBO(config);
    case 'FSBO_COM':
      return await scrapeFSBOCom(config);
    case 'DUPROPRIO':
      return await scrapeDuProprio(config);
    case 'KIJIJI':
      return await scrapeKijiji(config);
    case 'CRAIGSLIST':
      return await scrapeCraigslist(config);
    case 'PURPLEBRICKS':
    case 'FACEBOOK_MARKETPLACE':
    case 'MANUAL_IMPORT':
    case 'OTHER':
      return { found: 0, newLeads: 0, duplicates: 0, error: `Source ${source} requires manual import` };
    default:
      return { found: 0, newLeads: 0, duplicates: 0, error: `Unsupported source: ${source}` };
  }
}

/**
 * Scrape Zillow FSBO listings
 */
async function scrapeZillowFSBO(config: FSBOScrapingConfig) {
  const searchUrls = buildZillowSearchUrls(config);
  
  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.ZILLOW_SCRAPER,
    input: {
      searchUrls,
      maxItems: config.maxListings || 100,
      includeOffMarket: false,
      filterForSaleByOwner: true
    },
    waitForFinish: 300 // 5 minutes
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, duplicates: 0, error: apifyResult.error };
  }

  const items = apifyResult.items || [];
  let newLeads = 0;
  let duplicates = 0;

  for (const item of items) {
    const listing = transformZillowListing(item);
    const saveResult = await saveFSBOListing(config.userId, listing);
    
    if (saveResult.duplicate) {
      duplicates++;
    } else {
      newLeads++;
    }
  }

  return {
    found: items.length,
    newLeads,
    duplicates,
    runId: apifyResult.runId
  };
}

/**
 * Scrape FSBO.com listings
 */
async function scrapeFSBOCom(config: FSBOScrapingConfig) {
  // Use generic web scraper for FSBO.com
  const startUrls = buildFSBOComUrls(config);
  
  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.CHEERIO_SCRAPER,
    input: {
      startUrls: startUrls.map(url => ({ url })),
      pageFunction: `
        async function pageFunction(context) {
          const { $, request } = context;
          const listings = [];
          
          $('.listing-card, .property-listing').each((i, el) => {
            const $el = $(el);
            listings.push({
              address: $el.find('.address, .listing-address').text().trim(),
              price: $el.find('.price, .listing-price').text().trim(),
              beds: $el.find('.beds, .bedrooms').text().trim(),
              baths: $el.find('.baths, .bathrooms').text().trim(),
              sqft: $el.find('.sqft, .square-feet').text().trim(),
              url: $el.find('a').attr('href'),
              source: 'fsbo.com'
            });
          });
          
          return listings;
        }
      `,
      maxRequestsPerCrawl: config.maxListings || 100
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, duplicates: 0, error: apifyResult.error };
  }

  const items = apifyResult.items?.flat() || [];
  let newLeads = 0;
  let duplicates = 0;

  for (const item of items) {
    if (!item.address) continue;
    
    const listing = transformGenericListing(item, 'FSBO_COM');
    const saveResult = await saveFSBOListing(config.userId, listing);
    
    if (saveResult.duplicate) {
      duplicates++;
    } else {
      newLeads++;
    }
  }

  return {
    found: items.length,
    newLeads,
    duplicates,
    runId: apifyResult.runId
  };
}

/**
 * Scrape DuProprio (Quebec, Canada)
 */
async function scrapeDuProprio(config: FSBOScrapingConfig) {
  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.CHEERIO_SCRAPER,
    input: {
      startUrls: [{ url: 'https://duproprio.com/en/search/list' }],
      pageFunction: `
        async function pageFunction(context) {
          const { $, request } = context;
          const listings = [];
          
          $('.listing-card').each((i, el) => {
            const $el = $(el);
            listings.push({
              address: $el.find('.listing-address').text().trim(),
              city: $el.find('.listing-city').text().trim(),
              price: $el.find('.listing-price').text().trim(),
              beds: $el.find('.beds').text().trim(),
              baths: $el.find('.baths').text().trim(),
              url: 'https://duproprio.com' + $el.find('a').attr('href'),
              source: 'duproprio'
            });
          });
          
          return listings;
        }
      `,
      maxRequestsPerCrawl: config.maxListings || 50
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, duplicates: 0, error: apifyResult.error };
  }

  const items = apifyResult.items?.flat() || [];
  let newLeads = 0;
  let duplicates = 0;

  for (const item of items) {
    if (!item.address) continue;
    
    const listing = transformGenericListing(item, 'DUPROPRIO');
    listing.country = 'CA';
    listing.state = 'QC';
    const saveResult = await saveFSBOListing(config.userId, listing);
    
    if (saveResult.duplicate) {
      duplicates++;
    } else {
      newLeads++;
    }
  }

  return {
    found: items.length,
    newLeads,
    duplicates,
    runId: apifyResult.runId
  };
}

/**
 * Scrape Kijiji Real Estate (Canada)
 */
async function scrapeKijiji(config: FSBOScrapingConfig) {
  // Build Kijiji URLs based on target locations
  const startUrls = (config.targetCities || ['toronto', 'vancouver', 'montreal']).map(
    city => ({ url: `https://www.kijiji.ca/b-real-estate/${city}/k0c34l0` })
  );

  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.CHEERIO_SCRAPER,
    input: {
      startUrls,
      pageFunction: `
        async function pageFunction(context) {
          const { $, request } = context;
          const listings = [];
          
          $('[data-testid="listing-card"]').each((i, el) => {
            const $el = $(el);
            listings.push({
              title: $el.find('[data-testid="listing-title"]').text().trim(),
              price: $el.find('[data-testid="listing-price"]').text().trim(),
              location: $el.find('[data-testid="listing-location"]').text().trim(),
              url: 'https://www.kijiji.ca' + $el.find('a').attr('href'),
              source: 'kijiji'
            });
          });
          
          return listings;
        }
      `,
      maxRequestsPerCrawl: config.maxListings || 50
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, duplicates: 0, error: apifyResult.error };
  }

  const items = apifyResult.items?.flat() || [];
  let newLeads = 0;
  let duplicates = 0;

  for (const item of items) {
    if (!item.title && !item.location) continue;
    
    const listing: FSBOListingInput = {
      source: 'KIJIJI',
      sourceUrl: item.url || `https://kijiji.ca/${Date.now()}`,
      address: item.title || 'Unknown',
      city: parseCity(item.location) || 'Unknown',
      state: parseProvince(item.location) || 'ON',
      country: 'CA',
      listPrice: parsePrice(item.price)
    };
    
    const saveResult = await saveFSBOListing(config.userId, listing);
    
    if (saveResult.duplicate) {
      duplicates++;
    } else {
      newLeads++;
    }
  }

  return {
    found: items.length,
    newLeads,
    duplicates,
    runId: apifyResult.runId
  };
}

/**
 * Scrape Craigslist Real Estate
 */
async function scrapeCraigslist(config: FSBOScrapingConfig) {
  const cities = config.targetCities || ['newyork', 'losangeles', 'chicago'];
  const startUrls = cities.map(city => ({
    url: `https://${city}.craigslist.org/search/rea?sale_date=all+dates`
  }));

  const apifyResult = await runApifyActor({
    actorId: APIFY_ACTORS.CHEERIO_SCRAPER,
    input: {
      startUrls,
      pageFunction: `
        async function pageFunction(context) {
          const { $, request } = context;
          const listings = [];
          
          $('.result-row').each((i, el) => {
            const $el = $(el);
            listings.push({
              title: $el.find('.result-title').text().trim(),
              price: $el.find('.result-price').text().trim(),
              location: $el.find('.result-hood').text().trim(),
              url: $el.find('a.result-title').attr('href'),
              date: $el.find('.result-date').attr('datetime'),
              source: 'craigslist'
            });
          });
          
          return listings;
        }
      `,
      maxRequestsPerCrawl: config.maxListings || 50
    },
    waitForFinish: 300
  });

  if (!apifyResult.success) {
    return { found: 0, newLeads: 0, duplicates: 0, error: apifyResult.error };
  }

  const items = apifyResult.items?.flat() || [];
  let newLeads = 0;
  let duplicates = 0;

  for (const item of items) {
    if (!item.title) continue;
    
    const listing: FSBOListingInput = {
      source: 'CRAIGSLIST',
      sourceUrl: item.url || `https://craigslist.org/${Date.now()}`,
      address: item.title,
      city: parseCity(item.location) || 'Unknown',
      state: 'Unknown',
      country: 'US',
      listPrice: parsePrice(item.price)
    };
    
    const saveResult = await saveFSBOListing(config.userId, listing);
    
    if (saveResult.duplicate) {
      duplicates++;
    } else {
      newLeads++;
    }
  }

  return {
    found: items.length,
    newLeads,
    duplicates,
    runId: apifyResult.runId
  };
}

// Helper functions

function buildZillowSearchUrls(config: FSBOScrapingConfig): string[] {
  const urls: string[] = [];
  const states = config.targetStates || ['CA', 'TX', 'FL', 'NY'];
  
  for (const state of states) {
    urls.push(`https://www.zillow.com/${state.toLowerCase()}/?searchQueryState={"filterState":{"fsbo":{"value":true}}}`);
  }
  
  for (const city of config.targetCities || []) {
    urls.push(`https://www.zillow.com/${city.toLowerCase().replace(' ', '-')}/?searchQueryState={"filterState":{"fsbo":{"value":true}}}`);
  }
  
  return urls;
}

function buildFSBOComUrls(config: FSBOScrapingConfig): string[] {
  const states = config.targetStates || ['california', 'texas', 'florida'];
  return states.map(state => `https://www.fsbo.com/listings/${state.toLowerCase()}/`);
}

function transformZillowListing(item: any): FSBOListingInput {
  return {
    source: 'ZILLOW_FSBO',
    sourceUrl: item.url || item.detailUrl || `https://zillow.com/${item.zpid}`,
    sourceListingId: item.zpid?.toString(),
    address: item.address?.streetAddress || item.address || 'Unknown',
    city: item.address?.city || 'Unknown',
    state: item.address?.state || 'Unknown',
    zip: item.address?.zipcode,
    country: 'US',
    listPrice: item.price || item.unformattedPrice,
    beds: item.bedrooms,
    baths: item.bathrooms,
    sqft: item.livingArea,
    lotSize: item.lotSize,
    yearBuilt: item.yearBuilt,
    propertyType: item.homeType,
    description: item.description,
    photos: item.photos?.map((p: any) => p.url) || [],
    daysOnMarket: item.daysOnZillow || 0
  };
}

function transformGenericListing(item: any, source: REFSBOSource): FSBOListingInput {
  return {
    source,
    sourceUrl: item.url || `https://example.com/${Date.now()}`,
    address: item.address || 'Unknown',
    city: item.city || parseCity(item.location) || 'Unknown',
    state: item.state || 'Unknown',
    country: item.country || 'US',
    listPrice: parsePrice(item.price),
    beds: parseInt(item.beds) || undefined,
    baths: parseFloat(item.baths) || undefined,
    sqft: parseInt(item.sqft?.replace(/[^0-9]/g, '')) || undefined
  };
}

function parsePrice(priceStr: string | number | undefined): number | undefined {
  if (!priceStr) return undefined;
  if (typeof priceStr === 'number') return priceStr;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const price = parseFloat(cleaned);
  return isNaN(price) ? undefined : price;
}

function parseCity(location: string | undefined): string | undefined {
  if (!location) return undefined;
  // Try to extract city from location string like "Toronto, ON" or "(Toronto)"
  const match = location.match(/([A-Za-z\s]+),?\s*[A-Z]{2}/) || location.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : location.split(',')[0].trim();
}

function parseProvince(location: string | undefined): string | undefined {
  if (!location) return undefined;
  const match = location.match(/,\s*([A-Z]{2})/);
  return match ? match[1] : undefined;
}
