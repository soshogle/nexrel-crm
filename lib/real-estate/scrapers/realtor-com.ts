/**
 * realtor-com Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource } from '../types';

export interface REALTOR_COMConfig {
  userId: string;
  targetCities?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeREALTOR_COM(config: REALTOR_COMConfig) {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        name: 'realtor-com scrape',
        source: 'OTHER',
        sources: ['OTHER'],
        targetCities: config.targetCities || [],
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        status: 'PENDING'
      }
    });

    return { success: true, listings: [], errors: [], jobId: job.id };
  } catch (error: any) {
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkREALTOR_COMJobStatus(jobId: string) {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    return { status: job?.status || 'NOT_FOUND', listings: [] };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
