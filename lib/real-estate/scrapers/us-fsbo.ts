/**
 * US FSBO Sites Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource } from '../types';

export interface USFSBOListing {
  sourceUrl: string;
  sourceListingId?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  listPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  propertyType?: string;
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  photos?: string[];
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
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        name: `US FSBO - ${config.targetStates.join(', ')}`,
        source: 'FSBO_COM',
        sources: ['FSBO_COM'],
        targetStates: config.targetStates,
        targetCities: config.targetCities || [],
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        country: 'US',
        status: 'RUNNING',
        lastRunAt: new Date()
      }
    });

    return { success: true, listings: [], errors: [], jobId: job.id };
  } catch (error: any) {
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkUSFSBOJobStatus(jobId: string): Promise<{
  status: string;
  listings: USFSBOListing[];
}> {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    return { status: job?.status || 'NOT_FOUND', listings: [] };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
