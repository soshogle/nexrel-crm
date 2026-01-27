/**
 * Realtor.ca API Integration
 * Fetches listings from Canada's national real estate listing service
 * Note: Requires CREA DDF or individual board API access
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface RealtorCaListing {
  mlsNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  price: number;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  squareFeet?: number;
  lotSize?: string;
  yearBuilt?: number;
  description: string;
  agentName?: string;
  agentPhone?: string;
  brokerageName?: string;
  listingUrl: string;
  photos: string[];
  daysOnMarket: number;
  listingDate: Date;
  status: 'Active' | 'Pending' | 'Sold' | 'Expired';
  features: string[];
}

export interface RealtorCaSearchParams {
  city?: string;
  province?: string;
  postalCodePrefix?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  maxDaysOnMarket?: number;
  status?: string;
  pageSize?: number;
  page?: number;
}

/**
 * Search Realtor.ca listings
 * Uses web scraping via Apify if DDF not configured
 */
export async function searchRealtorCa(
  params: RealtorCaSearchParams,
  userId: string
): Promise<{
  success: boolean;
  listings: RealtorCaListing[];
  total: number;
  error?: string;
}> {
  try {
    // Check if DDF API credentials exist
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });

    if (!user) {
      return { success: false, listings: [], total: 0, error: 'User not found' };
    }

    // Check for DDF credentials in REScrapingJob (MLS credentials field)
    const ddfCredentials = await prisma.rEScrapingJob.findFirst({
      where: {
        userId,
        mlsCredentials: { not: Prisma.JsonNull }
      },
      select: { mlsCredentials: true }
    });

    if (ddfCredentials?.mlsCredentials) {
      // Use official DDF API
      return await searchViaDDF(params, ddfCredentials.mlsCredentials as any);
    }

    // Fallback to Apify scraping
    return await searchViaApify(params);
  } catch (error) {
    return {
      success: false,
      listings: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}

/**
 * Search using CREA DDF API
 */
async function searchViaDDF(
  params: RealtorCaSearchParams,
  credentials: { username: string; password: string; apiUrl?: string }
): Promise<{ success: boolean; listings: RealtorCaListing[]; total: number; error?: string }> {
  // CREA Data Distribution Facility (DDF) implementation
  // Documentation: https://www.crea.ca/data-distribution-facility/
  
  const apiUrl = credentials.apiUrl || 'https://data.crea.ca/reso/odata';
  const authHeader = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;

  // Build OData filter query
  const filters: string[] = [];
  if (params.city) filters.push(`City eq '${params.city}'`);
  if (params.province) filters.push(`StateOrProvince eq '${params.province}'`);
  if (params.minPrice) filters.push(`ListPrice ge ${params.minPrice}`);
  if (params.maxPrice) filters.push(`ListPrice le ${params.maxPrice}`);
  if (params.propertyType) filters.push(`PropertyType eq '${params.propertyType}'`);
  if (params.minBeds) filters.push(`BedroomsTotal ge ${params.minBeds}`);
  if (params.minBaths) filters.push(`BathroomsTotalInteger ge ${params.minBaths}`);
  if (params.status) filters.push(`StandardStatus eq '${params.status}'`);

  const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';
  const pageSize = params.pageSize || 50;
  const skip = ((params.page || 1) - 1) * pageSize;

  try {
    const response = await fetch(
      `${apiUrl}/Property?${filterQuery}&$top=${pageSize}&$skip=${skip}&$count=true`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      return {
        success: false,
        listings: [],
        total: 0,
        error: `DDF API error: ${response.statusText}`
      };
    }

    const data = await response.json();
    const listings = (data.value || []).map(mapDDFToListing);

    return {
      success: true,
      listings,
      total: data['@odata.count'] || listings.length
    };
  } catch (error) {
    return {
      success: false,
      listings: [],
      total: 0,
      error: error instanceof Error ? error.message : 'DDF request failed'
    };
  }
}

function mapDDFToListing(item: any): RealtorCaListing {
  return {
    mlsNumber: item.ListingKey || item.ListingId,
    address: `${item.StreetNumber || ''} ${item.StreetName || ''} ${item.StreetSuffix || ''}`.trim(),
    city: item.City || '',
    province: item.StateOrProvince || '',
    postalCode: item.PostalCode || '',
    price: item.ListPrice || 0,
    propertyType: item.PropertyType || 'Residential',
    bedrooms: item.BedroomsTotal || 0,
    bathrooms: item.BathroomsTotalInteger || 0,
    squareFeet: item.LivingArea,
    lotSize: item.LotSizeArea ? `${item.LotSizeArea} ${item.LotSizeUnits || 'sqft'}` : undefined,
    yearBuilt: item.YearBuilt,
    description: item.PublicRemarks || '',
    agentName: item.ListAgentFullName,
    agentPhone: item.ListAgentDirectPhone,
    brokerageName: item.ListOfficeName,
    listingUrl: `https://www.realtor.ca/real-estate/${item.ListingKey}`,
    photos: (item.Media || []).map((m: any) => m.MediaURL).filter(Boolean),
    daysOnMarket: item.DaysOnMarket || 0,
    listingDate: new Date(item.ListingContractDate || Date.now()),
    status: mapDDFStatus(item.StandardStatus),
    features: item.InteriorFeatures?.split(',') || []
  };
}

function mapDDFStatus(status: string): RealtorCaListing['status'] {
  const map: Record<string, RealtorCaListing['status']> = {
    'Active': 'Active',
    'ActiveUnderContract': 'Pending',
    'Pending': 'Pending',
    'Closed': 'Sold',
    'Expired': 'Expired',
    'Withdrawn': 'Expired'
  };
  return map[status] || 'Active';
}

/**
 * Search via Apify web scraping (fallback)
 */
async function searchViaApify(
  params: RealtorCaSearchParams
): Promise<{ success: boolean; listings: RealtorCaListing[]; total: number; error?: string }> {
  // Get Apify token from environment
  const apiToken = process.env.APIFY_API_TOKEN;
  
  if (!apiToken) {
    return {
      success: false,
      listings: [],
      total: 0,
      error: 'Realtor.ca API not configured. Please configure CREA DDF credentials or Apify API token.'
    };
  }

  try {
    // Build Realtor.ca search URL
    const searchParams = new URLSearchParams();
    if (params.city) searchParams.set('CityName', params.city);
    if (params.province) searchParams.set('Province', params.province);
    if (params.minPrice) searchParams.set('PriceMin', params.minPrice.toString());
    if (params.maxPrice) searchParams.set('PriceMax', params.maxPrice.toString());
    if (params.minBeds) searchParams.set('BedRange', `${params.minBeds}-0`);
    if (params.minBaths) searchParams.set('BathRange', `${params.minBaths}-0`);

    const searchUrl = `https://www.realtor.ca/map#view=list&${searchParams.toString()}`;

    // Run Apify actor
    const response = await fetch(`https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${apiToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: [{ url: searchUrl }],
        maxRequestsPerCrawl: params.pageSize || 50,
        pageFunction: `
          async function pageFunction(context) {
            const { $ } = context;
            const listings = [];
            $('[data-listing-id]').each((i, el) => {
              listings.push({
                mlsNumber: $(el).attr('data-listing-id'),
                address: $(el).find('.address').text().trim(),
                price: parseInt($(el).find('.price').text().replace(/[^0-9]/g, '')),
                beds: parseInt($(el).find('.bedrooms').text()),
                baths: parseFloat($(el).find('.bathrooms').text()),
                sqft: $(el).find('.sqft').text(),
                listingUrl: 'https://www.realtor.ca' + $(el).find('a').attr('href'),
              });
            });
            return listings;
          }
        `
      })
    });

    if (!response.ok) {
      return {
        success: false,
        listings: [],
        total: 0,
        error: `Realtor.ca scraping failed: ${response.statusText}`
      };
    }

    // Note: Results need to be polled - return empty for now with message
    return {
      success: true,
      listings: [],
      total: 0,
      error: 'Scraping job started. Results will appear shortly.'
    };
  } catch (error) {
    return {
      success: false,
      listings: [],
      total: 0,
      error: error instanceof Error ? error.message : 'Realtor.ca search failed'
    };
  }
}



/**
 * Get expired listings for outreach
 */
export async function getExpiredListings(
  params: { city?: string; province?: string; minDaysExpired?: number },
  userId: string
): Promise<RealtorCaListing[]> {
  const result = await searchRealtorCa(
    { ...params, status: 'Expired' },
    userId
  );
  return result.listings;
}

/**
 * Compare property to sold comparables
 */
export async function getComparables(
  address: string,
  city: string,
  province: string,
  userId: string
): Promise<{
  subject: Partial<RealtorCaListing>;
  comparables: RealtorCaListing[];
  avgPrice: number;
  priceRange: { min: number; max: number };
}> {
  // Search for recently sold properties in the area
  const result = await searchRealtorCa(
    {
      city,
      province,
      status: 'Sold',
      pageSize: 10
    },
    userId
  );

  const prices = result.listings.map(l => l.price).filter(p => p > 0);
  const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

  return {
    subject: { address, city, province },
    comparables: result.listings,
    avgPrice,
    priceRange: {
      min: Math.min(...prices, 0),
      max: Math.max(...prices, 0)
    }
  };
}
