/**
 * DuProprio.com Scraper for Canadian FSBO Listings
 * Extracts: seller name, phone, email, property details, price, address
 */

import { prisma } from '@/lib/db';

export interface DuProprioListing {
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
}

export interface ScrapingConfig {
  userId: string;
  targetCities: string[];
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  maxListings?: number;
  includeExpired?: boolean;
}

// Simulated scraping - in production, use Apify or Puppeteer
export async function scrapeDuProprio(config: ScrapingConfig): Promise<{
  success: boolean;
  listings: DuProprioListing[];
  errors: string[];
  jobId?: string;
  status?: 'started' | 'running' | 'completed' | 'failed';
}> {
  const errors: string[] = [];
  const listings: DuProprioListing[] = [];

  try {
    // Check if Apify is configured
    const apifyConfigured = await checkApifyConfig();
    
    if (!apifyConfigured) {
      errors.push('Apify API not configured. Please configure APIFY_API_TOKEN in environment variables.');
      return { success: false, listings: [], errors };
    }
    
    // Start Apify run (async - returns immediately with job ID)
    const { runId, status } = await startApifyRun(config);
    
    if (!runId) {
      errors.push('Failed to start Apify scraping job');
      return { success: false, listings: [], errors };
    }

    // Save job to database for tracking
    await prisma.rEScrapingJob.upsert({
      where: { id: runId },
      create: {
        id: runId,
        userId: config.userId,
        name: `DuProprio - ${config.targetCities.join(', ')}`,
        sources: ['DUPROPRIO'],
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

    return { 
      success: true, 
      listings: [], 
      errors: [],
      jobId: runId,
      status: 'started'
    };
  } catch (error) {
    console.error('DuProprio scrape error:', error);
    errors.push(`Scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, listings: [], errors };
  }
}

// Check status of a running job and fetch results if complete
export async function checkDuProprioJobStatus(runId: string, userId: string): Promise<{
  status: 'running' | 'completed' | 'failed';
  listings: DuProprioListing[];
  progress?: string;
  error?: string;
}> {
  try {
    const apiToken = await getApifyToken();
    if (!apiToken) throw new Error('Apify API token not found');

    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
    const statusData = await statusRes.json();
    
    const runStatus = statusData.data?.status;
    const statusMessage = statusData.data?.statusMessage || '';

    if (runStatus === 'SUCCEEDED') {
      // Fetch results from dataset
      const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
      const items = await datasetRes.json();
      
      const listings = Array.isArray(items) ? items.map(mapApifyToDuProprio) : [];
      
      // Store listings in database
      for (const listing of listings) {
        await storeFSBOListing(userId, listing, 'duproprio');
      }

      // Update job status
      await prisma.rEScrapingJob.update({
        where: { id: runId },
        data: { 
          status: 'COMPLETED',
          totalListingsFound: listings.length,
          lastRunStatus: 'SUCCESS'
        }
      }).catch(() => {}); // Ignore if job doesn't exist

      return { status: 'completed', listings };
    }

    if (runStatus === 'FAILED' || runStatus === 'ABORTED' || runStatus === 'TIMED-OUT') {
      await prisma.rEScrapingJob.update({
        where: { id: runId },
        data: { status: 'FAILED', lastRunStatus: runStatus }
      }).catch(() => {});

      return { 
        status: 'failed', 
        listings: [],
        error: `Apify run ${runStatus.toLowerCase()}: ${statusMessage}`
      };
    }

    // Still running
    return { 
      status: 'running', 
      listings: [],
      progress: statusMessage 
    };
  } catch (error) {
    return { 
      status: 'failed', 
      listings: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function checkApifyConfig(): Promise<boolean> {
  return !!process.env.APIFY_API_TOKEN;
}

async function getApifyToken(): Promise<string> {
  return process.env.APIFY_API_TOKEN || '';
}

// Start an Apify run and return immediately (non-blocking)
async function startApifyRun(config: ScrapingConfig): Promise<{ runId: string | null; status: string }> {
  const apiToken = await getApifyToken();
  if (!apiToken) {
    console.error('❌ Apify API token not found');
    return { runId: null, status: 'error' };
  }

  const actorId = 'aitorsm/duproprio';
  
  // Build DuProprio search URLs
  const startUrls = config.targetCities.map(city => {
    const regionMap: Record<string, string> = {
      'montreal': 'montreal',
      'laval': 'laval', 
      'longueuil': 'monteregie',
      'quebec': 'quebec',
      'quebec city': 'quebec',
      'gatineau': 'outaouais',
      'sherbrooke': 'estrie',
      'trois-rivieres': 'mauricie',
      'saguenay': 'saguenay-lac-st-jean'
    };
    const region = regionMap[city.toLowerCase()] || city.toLowerCase().replace(/\s+/g, '-');
    
    let url = `https://duproprio.com/en/search/list?search=true&regions[]=${region}`;
    if (config.minPrice) url += `&min_price=${config.minPrice}`;
    if (config.maxPrice) url += `&max_price=${config.maxPrice}`;
    
    return { url };
  });

  console.log('🚀 Starting DuProprio Apify run with URLs:', startUrls);

  try {
    const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls,
        maxPages: Math.min(config.maxListings || 50, 5) // Limit pages
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Apify start failed:', response.status, errorText);
      return { runId: null, status: 'error' };
    }

    const result = await response.json();
    const runId = result.data?.id;
    
    console.log('✅ Apify run started:', runId);
    return { runId, status: 'started' };
  } catch (error) {
    console.error('❌ Apify start error:', error);
    return { runId: null, status: 'error' };
  }
}

async function scrapeWithApify(config: ScrapingConfig): Promise<DuProprioListing[]> {
  const apiToken = await getApifyToken();

  if (!apiToken) throw new Error('Apify API token not found');

  // Use dedicated DuProprio actor
  const actorId = 'aitorsm/duproprio';
  
  // Build DuProprio search URLs for each city
  // DuProprio URL format: https://duproprio.com/en/search/list?search=true&regions[]={region}&min_price={min}&max_price={max}
  const startUrls = config.targetCities.map(city => {
    // Convert city names to DuProprio region codes
    const regionMap: Record<string, string> = {
      'montreal': 'montreal',
      'laval': 'laval', 
      'longueuil': 'monteregie',
      'quebec': 'quebec',
      'quebec city': 'quebec',
      'gatineau': 'outaouais',
      'sherbrooke': 'estrie',
      'trois-rivieres': 'mauricie',
      'saguenay': 'saguenay-lac-st-jean'
    };
    const region = regionMap[city.toLowerCase()] || city.toLowerCase().replace(/\s+/g, '-');
    
    let url = `https://duproprio.com/en/search/list?search=true&regions[]=${region}`;
    if (config.minPrice) url += `&min_price=${config.minPrice}`;
    if (config.maxPrice) url += `&max_price=${config.maxPrice}`;
    
    return { url };
  });

  console.log('🔍 DuProprio scrape URLs:', startUrls);

  const response = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apiToken}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startUrls,
      maxPages: Math.min(config.maxListings || 50, 10) // Limit pages to control cost
    })
  });

  if (!response.ok) {
    throw new Error(`Apify request failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  // Poll for results (max 5 minutes)
  const runId = result.data.id;
  let attempts = 0;
  while (attempts < 30) {
    await new Promise(r => setTimeout(r, 10000));
    const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiToken}`);
    const status = await statusRes.json();
    
    if (status.data.status === 'SUCCEEDED') {
      const datasetRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiToken}`);
      const items = await datasetRes.json();
      return items.map(mapApifyToDuProprio);
    }
    
    if (status.data.status === 'FAILED') {
      throw new Error('Apify run failed');
    }
    
    attempts++;
  }
  
  throw new Error('Apify run timed out');
}

function mapApifyToDuProprio(item: any): DuProprioListing {
  // Handle nested address structure from aitorsm/duproprio actor
  const addressObj = item.address || {};
  const street = addressObj.street || item.street || item.addressLine1 || '';
  const city = addressObj.city || item.city || item.municipality || '';
  const province = addressObj.province || addressObj.region || item.province || item.state || 'QC';
  
  // Price handling - can be in various formats
  let price = 0;
  if (item.price) {
    price = typeof item.price === 'string' 
      ? parseInt(item.price.replace(/[^0-9]/g, '')) 
      : item.price;
  } else if (item.askingPrice) {
    price = typeof item.askingPrice === 'string' 
      ? parseInt(item.askingPrice.replace(/[^0-9]/g, '')) 
      : item.askingPrice;
  }
  
  // Living area - can be nested object with squareFeet
  let squareFeet: number | undefined = undefined;
  if (item.livingArea) {
    if (typeof item.livingArea === 'object') {
      squareFeet = item.livingArea.squareFeet || item.livingArea.value || undefined;
    } else {
      squareFeet = parseInt(String(item.livingArea).replace(/[^0-9]/g, '')) || undefined;
    }
  } else if (item.squareFeet || item.sqft) {
    squareFeet = item.squareFeet || item.sqft;
  }
  
  // Lot size - can be nested object
  let lotSize: string | undefined = undefined;
  if (item.lotSize) {
    if (typeof item.lotSize === 'object') {
      lotSize = item.lotSize.display || `${item.lotSize.squareFeet || item.lotSize.value} sqft`;
    } else {
      lotSize = String(item.lotSize);
    }
  }
  
  // Images from photos array - handle multiple formats
  let imageUrls: string[] = [];
  if (item.photos && Array.isArray(item.photos)) {
    imageUrls = item.photos.map((p: any) => typeof p === 'string' ? p : (p.url || p.src || ''));
  } else if (item.images && Array.isArray(item.images)) {
    imageUrls = item.images.map((p: any) => typeof p === 'string' ? p : (p.url || p.src || ''));
  } else if (item.imageUrl || item.photo) {
    imageUrls = [item.imageUrl || item.photo];
  }
  
  // Calculate days on market - check multiple possible field names
  let daysOnMarket = 0;
  let listedAt = new Date();
  
  if (item.daysOnMarket) {
    daysOnMarket = parseInt(String(item.daysOnMarket)) || 0;
  } else if (item.listingDate || item.postedDate || item.datePosted || item.createdAt) {
    const dateStr = item.listingDate || item.postedDate || item.datePosted || item.createdAt;
    listedAt = new Date(dateStr);
    daysOnMarket = Math.floor((Date.now() - listedAt.getTime()) / (1000 * 60 * 60 * 24));
  } else if (item.dateOnMarket) {
    // Some scrapers provide this
    const dateStr = item.dateOnMarket;
    listedAt = new Date(dateStr);
    daysOnMarket = Math.floor((Date.now() - listedAt.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Seller info - DuProprio shows owner info on detail pages
  // Check multiple possible field names from different scrapers
  const sellerName = item.sellerName || item.ownerName || item.contactName || 
                     item.seller?.name || item.owner?.name || item.vendorName || undefined;
  
  // Phone number - check multiple formats
  const sellerPhone = item.sellerPhone || item.phone || item.contactPhone || 
                      item.seller?.phone || item.owner?.phone || item.phoneNumber ||
                      item.tel || item.telephone || undefined;
  
  // Email
  const sellerEmail = item.sellerEmail || item.email || item.contactEmail || 
                      item.seller?.email || item.owner?.email || undefined;
  
  return {
    externalId: item.propertyId || item.id || item.listingId || `dp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    address: street,
    city,
    province,
    postalCode: addressObj.postalCode || item.postalCode || item.zip || undefined,
    price,
    propertyType: item.propertyType || item.type || item.category || 'Single Family',
    bedrooms: item.bedrooms || item.beds || item.bedroom || undefined,
    bathrooms: item.bathrooms || item.baths || item.bathroom || undefined,
    squareFeet,
    lotSize,
    yearBuilt: item.yearBuilt || item.builtYear || undefined,
    description: item.description || item.summary || undefined,
    sellerName,
    sellerPhone,
    sellerEmail,
    listingUrl: item.url || item.listingUrl || item.link || '',
    imageUrls,
    daysOnMarket,
    listedAt: daysOnMarket > 0 ? new Date(Date.now() - daysOnMarket * 24 * 60 * 60 * 1000) : listedAt
  };
}

async function storeFSBOListing(
  userId: string,
  listing: DuProprioListing,
  source: string
): Promise<void> {
  // Map source string to enum value
  const sourceEnum = source === 'duproprio' ? 'DUPROPRIO' : 'FSBO_COM';
  
  // Check if listing already exists
  const existing = await prisma.rEFSBOListing.findFirst({
    where: { sourceListingId: listing.externalId, source: sourceEnum as any }
  });

  if (existing) {
    // Update existing
    await prisma.rEFSBOListing.update({
      where: { id: existing.id },
      data: {
        listPrice: listing.price,
        daysOnMarket: listing.daysOnMarket,
        lastSeenAt: new Date()
      }
    });
  } else {
    // Create new
    await prisma.rEFSBOListing.create({
      data: {
        source: sourceEnum as any,
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

export { storeFSBOListing };
