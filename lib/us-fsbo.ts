/**
 * US FSBO Scraper - fsbo.com, Zillow FSBO, ForSaleByOwner.com
 */

import { prisma } from '@/lib/db';
import { storeFSBOListing } from './duproprio';

export interface USFSBOListing {
  externalId: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  price: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: string;
  yearBuilt?: number;
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  listingUrl: string;
  imageUrls: string[];
  daysOnMarket: number;
  listedAt: Date;
  source: 'fsbo.com' | 'zillow_fsbo' | 'forsalebyowner.com';
}

export interface USScrapingConfig {
  userId: string;
  targetCities: string[];
  targetStates: string[];
  targetZipCodes?: string[];
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  maxListings?: number;
  sources?: ('fsbo.com' | 'zillow_fsbo' | 'forsalebyowner.com')[];
}

export async function scrapeUSFSBO(config: USScrapingConfig): Promise<{
  success: boolean;
  listings: USFSBOListing[];
  errors: string[];
  bySource: Record<string, number>;
}> {
  const errors: string[] = [];
  const listings: USFSBOListing[] = [];
  const bySource: Record<string, number> = {};
  const sources = config.sources || ['fsbo.com', 'zillow_fsbo', 'forsalebyowner.com'];

  try {
    const apifyConfigured = await checkApifyConfig();

    if (!apifyConfigured) {
      errors.push('Apify API not configured. Please configure APIFY_API_TOKEN in environment variables.');
      return { success: false, listings: [], errors, bySource };
    }

    for (const source of sources) {
      try {
        const sourceListings = await scrapeSourceWithApify(source, config);

        listings.push(...sourceListings);
        bySource[source] = sourceListings.length;

        // Store in database
        for (const listing of sourceListings) {
          await storeUSFSBOListing(config.userId, listing);
        }
      } catch (err) {
        errors.push(`${source}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        bySource[source] = 0;
      }
    }

    return { success: true, listings, errors, bySource };
  } catch (error) {
    errors.push(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, listings: [], errors, bySource };
  }
}

async function checkApifyConfig(): Promise<boolean> {
  return !!process.env.APIFY_API_TOKEN;
}

async function getApifyToken(): Promise<string> {
  return process.env.APIFY_API_TOKEN || '';
}

async function scrapeSourceWithApify(
  source: string,
  config: USScrapingConfig
): Promise<USFSBOListing[]> {
  const apiToken = await getApifyToken();

  if (!apiToken) throw new Error('Apify API token not found');

  // Use dedicated actors for each source
  const actorConfig: Record<string, { actorId: string; buildInput: (cfg: USScrapingConfig) => any }> = {
    'fsbo.com': {
      actorId: 'benthepythondev/fsbo-real-estate-scraper',
      buildInput: (cfg) => ({
        location: cfg.targetCities.map(c => `${c}, ${cfg.targetStates[0] || 'TX'}`).join('; '),
        minPrice: cfg.minPrice,
        maxPrice: cfg.maxPrice,
        maxItems: cfg.maxListings || 50
      })
    },
    'zillow_fsbo': {
      actorId: 'maxcopell/zillow-scraper',
      buildInput: (cfg) => ({
        searchType: 'fsbo',
        location: cfg.targetCities.map(c => `${c}, ${cfg.targetStates[0] || 'TX'}`),
        minPrice: cfg.minPrice,
        maxPrice: cfg.maxPrice,
        maxItems: cfg.maxListings || 50
      })
    },
    'forsalebyowner.com': {
      actorId: 'kobimantzur/fsbo-scraper',
      buildInput: (cfg) => ({
        locations: cfg.targetCities.map(c => ({ city: c, state: cfg.targetStates[0] || 'TX' })),
        minPrice: cfg.minPrice,
        maxPrice: cfg.maxPrice,
        maxResults: cfg.maxListings || 50
      })
    }
  };

  const actor = actorConfig[source];
  if (!actor) throw new Error(`Unknown source: ${source}`);

  const response = await fetch(`https://api.apify.com/v2/acts/${actor.actorId}/runs?token=${apiToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(actor.buildInput(config))
  });

  if (!response.ok) throw new Error(`Apify request failed: ${response.statusText}`);

  const result = await response.json();
  const runId = result.data.id;
  
  // Poll for results (max 5 minutes)
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
    const status = await statusRes.json();
    
    if (status.data.status === 'SUCCEEDED') {
      const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
      const items = await datasetRes.json();
      return items.map((item: any) => mapToUSFSBO(item, source as any));
    }
    
    if (status.data.status === 'FAILED') throw new Error('Apify run failed');
    attempts++;
  }
  
  throw new Error('Apify run timed out');
}

function getPageFunction(source: string): string {
  // Source-specific page functions for Apify
  const functions: Record<string, string> = {
    'fsbo.com': `
      async function pageFunction(context) {
        const { $, request } = context;
        const listings = [];
        $('.property-listing').each((i, el) => {
          listings.push({
            address: $(el).find('.address').text().trim(),
            price: parseInt($(el).find('.price').text().replace(/[^0-9]/g, '')),
            bedrooms: parseInt($(el).find('.beds').text()),
            bathrooms: parseFloat($(el).find('.baths').text()),
            listingUrl: $(el).find('a').attr('href'),
          });
        });
        return listings;
      }
    `,
    'zillow_fsbo': `
      async function pageFunction(context) {
        const { $, request } = context;
        const listings = [];
        $('[data-test="property-card"]').each((i, el) => {
          listings.push({
            address: $(el).find('[data-test="property-card-addr"]').text().trim(),
            price: parseInt($(el).find('[data-test="property-card-price"]').text().replace(/[^0-9]/g, '')),
            listingUrl: 'https://www.zillow.com' + $(el).find('a').attr('href'),
          });
        });
        return listings;
      }
    `,
    'forsalebyowner.com': `
      async function pageFunction(context) {
        const { $, request } = context;
        const listings = [];
        $('.listing-card').each((i, el) => {
          listings.push({
            address: $(el).find('.listing-address').text().trim(),
            price: parseInt($(el).find('.listing-price').text().replace(/[^0-9]/g, '')),
            listingUrl: $(el).find('a').attr('href'),
          });
        });
        return listings;
      }
    `
  };
  return functions[source] || functions['fsbo.com'];
}

function mapToUSFSBO(item: any, source: USFSBOListing['source']): USFSBOListing {
  return {
    externalId: item.externalId || `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    address: item.address || '',
    city: item.city || '',
    state: item.state || '',
    zipCode: item.zipCode || '',
    price: item.price || 0,
    propertyType: item.propertyType || 'Single Family',
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    squareFeet: item.squareFeet,
    lotSize: item.lotSize,
    yearBuilt: item.yearBuilt,
    description: item.description,
    sellerName: item.sellerName,
    sellerPhone: item.sellerPhone,
    sellerEmail: item.sellerEmail,
    listingUrl: item.listingUrl || '',
    imageUrls: item.imageUrls || [],
    daysOnMarket: item.daysOnMarket || 0,
    listedAt: new Date(item.listedAt || Date.now()),
    source
  };
}

async function storeUSFSBOListing(userId: string, listing: USFSBOListing): Promise<void> {
  // Map source to enum
  const sourceMap: Record<string, string> = {
    'fsbo.com': 'FSBO_COM',
    'zillow_fsbo': 'ZILLOW_FSBO',
    'forsalebyowner.com': 'FORSALEBYOWNER'
  };
  const sourceEnum = sourceMap[listing.source] || 'FSBO_COM';
  
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: listing.externalId, source: sourceEnum as any }
  });

  if (existing) {
    await prisma.rEFSBOListing.update({
      where: { id: existing.id },
      data: {
        listPrice: listing.price,
        daysOnMarket: listing.daysOnMarket,
        lastSeenAt: new Date()
      }
    });
  } else {
    await prisma.rEFSBOListing.create({
      data: {
        source: sourceEnum as any,
        sourceUrl: listing.listingUrl,
        sourceListingId: listing.externalId,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zipCode,
        country: 'US',
        listPrice: listing.price,
        propertyType: listing.propertyType,
        beds: listing.bedrooms,
        baths: listing.bathrooms,
        sqft: listing.squareFeet,
        yearBuilt: listing.yearBuilt,
        description: listing.description,
        sellerName: listing.sellerName,
        sellerPhone: listing.sellerPhone,
        sellerEmail: listing.sellerEmail,
        photos: listing.imageUrls.length > 0 ? listing.imageUrls : undefined,
        daysOnMarket: listing.daysOnMarket,
        firstSeenAt: listing.listedAt,
        lastSeenAt: new Date(),
        status: 'NEW',
        assignedUserId: userId
      }
    });
  }
}
