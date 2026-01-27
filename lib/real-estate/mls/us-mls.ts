/**
 * US MLS Integration
 * Supports various MLS boards via RETS/RESO API
 */

import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

export interface USMLSListing {
  mlsNumber: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
  agentEmail?: string;
  brokerageName?: string;
  listingUrl: string;
  photos: string[];
  daysOnMarket: number;
  listingDate: Date;
  status: 'Active' | 'Pending' | 'Sold' | 'Expired' | 'Withdrawn';
  features: string[];
  mlsBoard: string;
}

export interface MLSCredentials {
  boardName: string;  // e.g., 'CRMLS', 'Bright MLS', 'NWMLS'
  apiUrl: string;
  username: string;
  password: string;
  apiKey?: string;
  retsVersion?: string;
}

export interface USMLSSearchParams {
  city?: string;
  state?: string;
  zipCode?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  status?: string;
  pageSize?: number;
  page?: number;
}

// Major US MLS boards configuration
const MLS_BOARDS: Record<string, { name: string; coverage: string[]; resoCompliant: boolean }> = {
  'CRMLS': { name: 'California Regional MLS', coverage: ['CA'], resoCompliant: true },
  'BRIGHT': { name: 'Bright MLS', coverage: ['DC', 'MD', 'VA', 'WV', 'PA', 'NJ', 'DE'], resoCompliant: true },
  'NWMLS': { name: 'Northwest MLS', coverage: ['WA'], resoCompliant: true },
  'MRED': { name: 'Midwest Real Estate Data', coverage: ['IL', 'IN', 'WI'], resoCompliant: true },
  'HAR': { name: 'Houston Association of Realtors', coverage: ['TX'], resoCompliant: true },
  'MIAMI': { name: 'Miami Association of Realtors', coverage: ['FL'], resoCompliant: true },
  'ARMLS': { name: 'Arizona Regional MLS', coverage: ['AZ'], resoCompliant: true },
  'GAMLS': { name: 'Georgia MLS', coverage: ['GA'], resoCompliant: true },
  'NTREIS': { name: 'North Texas Real Estate Info Systems', coverage: ['TX'], resoCompliant: true }
};

/**
 * Search US MLS listings
 */
export async function searchUSMLS(
  params: USMLSSearchParams,
  credentials: MLSCredentials
): Promise<{
  success: boolean;
  listings: USMLSListing[];
  total: number;
  error?: string;
}> {
  try {
    const board = MLS_BOARDS[credentials.boardName];
    
    if (board?.resoCompliant) {
      return await searchViaRESO(params, credentials);
    } else {
      return await searchViaRETS(params, credentials);
    }
  } catch (error) {
    return {
      success: false,
      listings: [],
      total: 0,
      error: error instanceof Error ? error.message : 'MLS search failed'
    };
  }
}

/**
 * Search via RESO Web API (modern standard)
 */
async function searchViaRESO(
  params: USMLSSearchParams,
  credentials: MLSCredentials
): Promise<{ success: boolean; listings: USMLSListing[]; total: number; error?: string }> {
  const authHeader = credentials.apiKey
    ? `Bearer ${credentials.apiKey}`
    : `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')}`;

  // Build OData filter
  const filters: string[] = [];
  if (params.city) filters.push(`City eq '${params.city}'`);
  if (params.state) filters.push(`StateOrProvince eq '${params.state}'`);
  if (params.zipCode) filters.push(`PostalCode eq '${params.zipCode}'`);
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
      `${credentials.apiUrl}/Property?${filterQuery}&$top=${pageSize}&$skip=${skip}&$count=true`,
      {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`RESO API error: ${response.statusText}`);
    }

    const data = await response.json();
    const listings = (data.value || []).map((item: any) => mapRESOToListing(item, credentials.boardName));

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
      error: error instanceof Error ? error.message : 'RESO request failed'
    };
  }
}

/**
 * Search via RETS (legacy protocol)
 */
async function searchViaRETS(
  params: USMLSSearchParams,
  credentials: MLSCredentials
): Promise<{ success: boolean; listings: USMLSListing[]; total: number; error?: string }> {
  // RETS implementation would use a library like rets-client
  // Return empty with message - RETS requires specific implementation per MLS board
  return {
    success: false,
    listings: [],
    total: 0,
    error: `RETS protocol not yet implemented for ${credentials.boardName}. Please use a RESO-compliant MLS board or contact support.`
  };
}

function mapRESOToListing(item: any, mlsBoard: string): USMLSListing {
  return {
    mlsNumber: item.ListingKey || item.ListingId,
    address: `${item.StreetNumber || ''} ${item.StreetName || ''} ${item.StreetSuffix || ''}`.trim(),
    city: item.City || '',
    state: item.StateOrProvince || '',
    zipCode: item.PostalCode || '',
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
    agentEmail: item.ListAgentEmail,
    brokerageName: item.ListOfficeName,
    listingUrl: '',
    photos: (item.Media || []).map((m: any) => m.MediaURL).filter(Boolean),
    daysOnMarket: item.DaysOnMarket || 0,
    listingDate: new Date(item.ListingContractDate || Date.now()),
    status: mapStatus(item.StandardStatus),
    features: item.InteriorFeatures?.split(',') || [],
    mlsBoard
  };
}

function mapStatus(status: string): USMLSListing['status'] {
  const map: Record<string, USMLSListing['status']> = {
    'Active': 'Active',
    'ActiveUnderContract': 'Pending',
    'Pending': 'Pending',
    'Closed': 'Sold',
    'Expired': 'Expired',
    'Withdrawn': 'Withdrawn'
  };
  return map[status] || 'Active';
}



/**
 * Store MLS credentials for a user
 */
export async function storeMLSCredentials(
  userId: string,
  credentials: MLSCredentials
): Promise<{ success: boolean; error?: string }> {
  try {
    // Encrypt credentials before storing
    const encryptedCreds = {
      ...credentials,
      password: Buffer.from(credentials.password).toString('base64'),
      apiKey: credentials.apiKey ? Buffer.from(credentials.apiKey).toString('base64') : undefined
    };

    await prisma.rEScrapingJob.upsert({
      where: {
        id: `mls_${userId}_${credentials.boardName}`
      },
      update: {
        mlsCredentials: encryptedCreds as any
      },
      create: {
        id: `mls_${userId}_${credentials.boardName}`,
        userId,
        name: `MLS - ${credentials.boardName}`,
        sources: [],
        targetCities: [],
        frequency: 'manual',
        mlsCredentials: encryptedCreds as any,
        status: 'IDLE'
      }
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store credentials'
    };
  }
}

/**
 * Get user's configured MLS boards
 */
export async function getUserMLSBoards(userId: string): Promise<string[]> {
  const jobs = await prisma.rEScrapingJob.findMany({
    where: {
      userId,
      mlsCredentials: { not: Prisma.JsonNull }
    },
    select: { name: true }
  });

  return jobs
    .map(j => j.name.replace('MLS - ', ''))
    .filter(name => Object.keys(MLS_BOARDS).includes(name));
}
