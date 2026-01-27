export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Apify Actor IDs for different sources
const APIFY_ACTORS: Record<string, { actorId: string; name: string; inputMapper: (params: any) => any }> = {
  duproprio: {
    actorId: 'aitorsm/duproprio',
    name: 'DuProprio',
    inputMapper: (params) => ({
      startUrls: params.searchUrl ? [{ url: params.searchUrl }] : [],
      location: params.location,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      maxItems: params.maxItems || 50,
    }),
  },
  'fsbo.com': {
    actorId: 'benthepythondev/fsbo-real-estate-scraper',
    name: 'FSBO.com',
    inputMapper: (params) => ({
      state: params.state,
      city: params.city,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minBeds: params.minBeds,
      propertyType: params.propertyType,
      maxPages: params.maxPages || 5,
    }),
  },
  craigslist: {
    actorId: 'benthepythondev/craigslist-real-estate-scraper',
    name: 'Craigslist',
    inputMapper: (params) => ({
      location: params.location,
      category: 'housing/fsbo',
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minBeds: params.minBeds,
      maxItems: params.maxItems || 50,
    }),
  },
  'realtor.ca': {
    actorId: 'memo23/realtor-canada-search-cheerio',
    name: 'Realtor.ca',
    inputMapper: (params) => ({
      startUrls: params.searchUrl ? [{ url: params.searchUrl }] : [],
      location: params.location,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      maxItems: params.maxItems || 50,
    }),
  },
  zillow: {
    actorId: 'maxcopell/zillow-scraper',
    name: 'Zillow FSBO',
    inputMapper: (params) => ({
      searchUrls: params.searchUrl ? [params.searchUrl] : [],
      location: params.location,
      listingType: 'fsbo',
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      minBeds: params.minBeds,
      maxItems: params.maxItems || 50,
    }),
  },
  kijiji: {
    actorId: 'trudax/kijiji-scraper',
    name: 'Kijiji Real Estate',
    inputMapper: (params) => ({
      searchUrl: params.searchUrl,
      location: params.location,
      category: 'real-estate',
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      maxItems: params.maxItems || 50,
    }),
  },
  rightmove: {
    actorId: 'dtrungtin/rightmove-scraper',
    name: 'Rightmove',
    inputMapper: (params) => ({
      searchUrl: params.searchUrl,
      location: params.location,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      maxItems: params.maxItems || 50,
    }),
  },
  purplebricks: {
    actorId: 'apify/web-scraper',
    name: 'Purplebricks',
    inputMapper: (params) => ({
      startUrls: [{ url: `https://www.purplebricks.com/search?location=${encodeURIComponent(params.location || '')}` }],
      maxItems: params.maxItems || 50,
    }),
  },
  forsalebyowner: {
    actorId: 'kobimantzur/fsbo-scraper',
    name: 'ForSaleByOwner.com',
    inputMapper: (params) => ({
      location: params.location,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      propertyType: params.propertyType,
      maxItems: params.maxItems || 50,
    }),
  },
};

// Get Apify API token
function getApifyToken(): string | null {
  // Use environment variable (Vercel compatible)
  return process.env.APIFY_API_TOKEN || null;
}

// Normalize results from different sources to a common format
function normalizeResults(source: string, results: any[]): FSBOLead[] {
  return results.map((item, index) => {
    // Common fields mapping based on source
    const normalized: FSBOLead = {
      id: item.id || item.listing_id || item.propertyId || `${source}-${index}-${Date.now()}`,
      source: source,
      url: item.url || item.link || item.listingUrl || '',
      title: item.title || item.address || item.name || 'Property Listing',
      price: parsePrice(item.price || item.askingPrice || item.listPrice),
      address: item.address || item.street || item.location || '',
      city: item.city || item.municipality || '',
      state: item.state || item.province || item.region || '',
      zipCode: item.zipCode || item.postalCode || item.zip_code || '',
      country: getCountryFromSource(source),
      beds: parseInt(item.beds || item.bedrooms || item.bedroom || '0') || null,
      baths: parseInt(item.baths || item.bathrooms || item.bathroom || '0') || null,
      sqft: parseInt(item.sqft || item.squareFeet || item.livingArea || item.size || '0') || null,
      lotSize: item.lotSize || item.landArea || null,
      yearBuilt: item.yearBuilt || item.year_built || null,
      propertyType: item.propertyType || item.property_type || item.type || 'House',
      description: item.description || item.remarks || item.publicRemarks || '',
      photos: normalizePhotos(item.photos || item.images || item.imageUrls || item.gallery || []),
      sellerName: item.sellerName || item.seller_name || item.ownerName || item.contactName || null,
      sellerPhone: item.sellerPhone || item.seller_phone || item.phone || item.contactPhone || null,
      sellerEmail: item.sellerEmail || item.seller_email || item.email || item.contactEmail || null,
      listedDate: item.listedDate || item.listed_date || item.datePosted || item.createdAt || null,
      daysOnMarket: item.daysOnMarket || item.dom || null,
      leadScore: item.lead_score || item.leadScore || calculateLeadScore(item),
      rawData: item,
      scrapedAt: new Date().toISOString(),
    };
    return normalized;
  });
}

function parsePrice(price: any): number | null {
  if (!price) return null;
  if (typeof price === 'number') return price;
  const cleaned = String(price).replace(/[^0-9.]/g, '');
  return parseFloat(cleaned) || null;
}

function normalizePhotos(photos: any): string[] {
  if (!photos) return [];
  if (typeof photos === 'string') return [photos];
  if (Array.isArray(photos)) {
    return photos.map(p => (typeof p === 'string' ? p : p.url || p.src || p.href)).filter(Boolean);
  }
  return [];
}

function getCountryFromSource(source: string): string {
  const canadianSources = ['duproprio', 'kijiji', 'realtor.ca'];
  const ukSources = ['rightmove', 'purplebricks'];
  if (canadianSources.includes(source)) return 'Canada';
  if (ukSources.includes(source)) return 'United Kingdom';
  return 'United States';
}

function calculateLeadScore(item: any): number {
  let score = 50; // Base score
  if (item.sellerPhone || item.seller_phone || item.phone) score += 20;
  if (item.sellerEmail || item.seller_email || item.email) score += 10;
  if (item.photos?.length > 3 || item.images?.length > 3) score += 10;
  if (item.description?.length > 100) score += 5;
  if (item.price || item.askingPrice) score += 5;
  return Math.min(score, 100);
}

interface FSBOLead {
  id: string;
  source: string;
  url: string;
  title: string;
  price: number | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string | null;
  yearBuilt: string | null;
  propertyType: string;
  description: string;
  photos: string[];
  sellerName: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  listedDate: string | null;
  daysOnMarket: number | null;
  leadScore: number;
  rawData: any;
  scrapedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sources, location, filters } = body;

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: 'No sources selected' }, { status: 400 });
    }

    const apifyToken = getApifyToken();
    if (!apifyToken) {
      return NextResponse.json({ 
        error: 'Apify API token not configured',
        message: 'Please configure your Apify API token in settings'
      }, { status: 500 });
    }

    const allResults: FSBOLead[] = [];
    const errors: { source: string; error: string }[] = [];

    // Helper function to call Apify API
    async function runApifyActor(actorId: string, input: any): Promise<any[]> {
      // Start the actor run
      const runResponse = await fetch(
        `https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...input,
            timeout: 120,
            memory: 1024,
          }),
        }
      );

      if (!runResponse.ok) {
        throw new Error(`Failed to start actor: ${runResponse.statusText}`);
      }

      const runData = await runResponse.json();
      const runId = runData.data.id;

      // Wait for the run to complete (poll status)
      let status = 'RUNNING';
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max

      while (status === 'RUNNING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        
        const statusResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`
        );
        const statusData = await statusResponse.json();
        status = statusData.data.status;
        attempts++;
      }

      if (status !== 'SUCCEEDED') {
        throw new Error(`Actor run failed with status: ${status}`);
      }

      // Get results from default dataset
      const datasetId = runData.data.defaultDatasetId;
      const itemsResponse = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`
      );
      
      if (!itemsResponse.ok) {
        throw new Error('Failed to fetch results');
      }

      return await itemsResponse.json();
    }

    // Process each source in parallel
    const scrapePromises = sources.map(async (sourceId: string) => {
      const sourceConfig = APIFY_ACTORS[sourceId.toLowerCase()];
      if (!sourceConfig) {
        errors.push({ source: sourceId, error: 'Scraper not available for this source' });
        return [];
      }

      try {
        console.log(`Starting scrape for ${sourceConfig.name}...`);
        
        // Build input parameters
        const input = sourceConfig.inputMapper({
          location: location?.city || location?.formatted || '',
          state: location?.state || '',
          city: location?.city || '',
          minPrice: filters?.minPrice || undefined,
          maxPrice: filters?.maxPrice || undefined,
          minBeds: filters?.minBeds || undefined,
          propertyType: filters?.propertyTypes?.[0] || undefined,
          maxItems: 50,
          maxPages: 5,
        });

        // Run the actor
        const items = await runApifyActor(sourceConfig.actorId, input);
        
        console.log(`Got ${items.length} results from ${sourceConfig.name}`);
        
        // Normalize and return results
        return normalizeResults(sourceId, items);
      } catch (err: any) {
        console.error(`Error scraping ${sourceConfig.name}:`, err);
        errors.push({ 
          source: sourceId, 
          error: err.message || 'Failed to scrape this source' 
        });
        return [];
      }
    });

    // Wait for all scrapes to complete
    const results = await Promise.all(scrapePromises);
    results.forEach(r => allResults.push(...r));

    // Sort by lead score descending
    allResults.sort((a, b) => b.leadScore - a.leadScore);

    return NextResponse.json({
      success: true,
      totalResults: allResults.length,
      results: allResults,
      errors: errors.length > 0 ? errors : undefined,
      scrapedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('FSBO scraper error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape FSBO leads', message: error.message },
      { status: 500 }
    );
  }
}

// GET - Return available sources and their status
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apifyToken = getApifyToken();
  const sources = Object.entries(APIFY_ACTORS).map(([id, config]) => ({
    id,
    name: config.name,
    actorId: config.actorId,
    available: !!apifyToken,
  }));

  return NextResponse.json({
    sources,
    apifyConfigured: !!apifyToken,
  });
}
