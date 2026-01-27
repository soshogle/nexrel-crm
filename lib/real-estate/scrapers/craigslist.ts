/**
 * craigslist Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource } from '../types';

export interface CRAIGSLISTConfig {
  userId: string;
  location: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeCRAIGSLIST(config: CRAIGSLISTConfig) {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        source: 'CRAIGSLIST' as REFSBOSource,
        status: 'PENDING',
        location: config.location,
        listingsFound: 0,
        listingsProcessed: 0,
        isRecurring: false
      }
    });

    return { success: true, listings: [], errors: [], jobId: job.id };
  } catch (error: any) {
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkCRAIGSLISTJobStatus(jobId: string) {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    return { status: job?.status || 'NOT_FOUND', listings: [] };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
