/**
 * centris Scraper
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource } from '../types';

export interface CENTRISConfig {
  userId: string;
  targetCities?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeCENTRIS(config: CENTRISConfig) {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        name: 'centris scrape',
        source: 'OTHER' as REFSBOSource,
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

export async function checkCENTRISJobStatus(jobId: string) {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    return { status: job?.status || 'NOT_FOUND', listings: [] };
  } catch (error) {
    return { status: 'ERROR', listings: [] };
  }
}
