/**
 * US FSBO Sites Scraper
 * Covers FSBO.com, ForSaleByOwner.com, etc.
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource, REFSBOStatus } from '../types';

export interface USFSBOListing {
  externalId: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  price: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  listingUrl: string;
  imageUrls: string[];
}

export interface ScrapeUSFSBOConfig {
  userId: string;
  targetStates: string[];
  targetCities?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeUSFSBO(config: ScrapeUSFSBOConfig): Promise<{
  success: boolean;
  listings: USFSBOListing[];
  errors: string[];
  jobId?: string;
}> {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { 
      success: false, 
      listings: [], 
      errors: ['APIFY_API_TOKEN not configured'] 
    };
  }

  try {
    // Create job record
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        source: 'FSBO_COM' as REFSBOSource,
        status: 'RUNNING',
        location: config.targetStates.join(', '),
        filters: {
          cities: config.targetCities,
          minPrice: config.minPrice,
          maxPrice: config.maxPrice
        },
        listingsFound: 0,
        listingsProcessed: 0,
        isRecurring: false,
        startedAt: new Date()
      }
    });

    return {
      success: true,
      listings: [],
      errors: [],
      jobId: job.id
    };
  } catch (error: any) {
    console.error('US FSBO scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkUSFSBOJobStatus(jobId: string): Promise<{
  status: string;
  listings: USFSBOListing[];
}> {
  try {
    const job = await prisma.rEScrapingJob.findUnique({
      where: { id: jobId }
    });
    return { 
      status: job?.status || 'NOT_FOUND', 
      listings: [] 
    };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
