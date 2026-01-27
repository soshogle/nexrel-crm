/**
 * zillow Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource } from '../types';

export interface ZILLOWConfig {
  userId: string;
  location: string;
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeZILLOW(config: ZILLOWConfig) {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        source: 'ZILLOW_FSBO' as REFSBOSource,
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

export async function checkZILLOWJobStatus(jobId: string) {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    return { status: job?.status || 'NOT_FOUND', listings: [] };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
