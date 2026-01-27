/**
 * Scraping Job Manager - Handles scheduled and on-demand scraping jobs
 * Agent-configurable targeting by city/area with frequency settings
 */

import { prisma } from '@/lib/db';
import { scrapeDuProprio, type ScrapingConfig } from './duproprio';
import { scrapeUSFSBO, type USScrapingConfig } from './us-fsbo';

export interface ScrapingJobConfig {
  userId: string;
  name: string;
  sources: ('duproprio' | 'fsbo.com' | 'zillow_fsbo' | 'forsalebyowner.com')[];
  targetCities: string[];
  targetStates?: string[]; // For US sources
  targetZipCodes?: string[];
  minPrice?: number;
  maxPrice?: number;
  propertyTypes?: string[];
  maxListingsPerRun?: number;
  frequency: 'manual' | 'daily' | 'weekly' | 'biweekly';
  isActive: boolean;
}

export async function createScrapingJob(config: ScrapingJobConfig): Promise<{
  success: boolean;
  jobId?: string;
  error?: string;
}> {
  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        name: config.name,
        sources: config.sources,
        targetCities: config.targetCities,
        targetStates: config.targetStates || [],
        targetZipCodes: config.targetZipCodes || [],
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        propertyTypes: config.propertyTypes || [],
        maxListingsPerRun: config.maxListingsPerRun || 100,
        frequency: config.frequency,
        isActive: config.isActive,
        lastRunAt: null,
        nextRunAt: calculateNextRun(config.frequency),
        status: 'IDLE'
      }
    });

    return { success: true, jobId: job.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create job'
    };
  }
}

export async function runScrapingJob(jobId: string): Promise<{
  success: boolean;
  results?: {
    totalListings: number;
    newListings: number;
    updatedListings: number;
    bySource: Record<string, number>;
  };
  errors?: string[];
}> {
  const errors: string[] = [];
  let totalListings = 0;
  const bySource: Record<string, number> = {};

  try {
    // Get job config
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    if (!job) return { success: false, errors: ['Job not found'] };

    // Update status to running
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: { status: 'RUNNING' }
    });

    const sources = job.sources as string[];
    const canadianSources = sources.filter(s => s === 'duproprio');
    const usSources = sources.filter(s => ['fsbo.com', 'zillow_fsbo', 'forsalebyowner.com'].includes(s));

    // Run Canadian scraping
    if (canadianSources.length > 0) {
      const duProprioConfig: ScrapingConfig = {
        userId: job.userId,
        targetCities: job.targetCities as string[],
        minPrice: job.minPrice || undefined,
        maxPrice: job.maxPrice || undefined,
        propertyTypes: (job.propertyTypes as string[]) || undefined,
        maxListings: job.maxListingsPerRun || 100
      };

      const result = await scrapeDuProprio(duProprioConfig);
      totalListings += result.listings.length;
      bySource['duproprio'] = result.listings.length;
      if (result.errors.length > 0) errors.push(...result.errors);
    }

    // Run US scraping
    if (usSources.length > 0) {
      const usConfig: USScrapingConfig = {
        userId: job.userId,
        targetCities: job.targetCities as string[],
        targetStates: (job.targetStates as string[]) || ['TX', 'FL', 'CA'],
        targetZipCodes: (job.targetZipCodes as string[]) || undefined,
        minPrice: job.minPrice || undefined,
        maxPrice: job.maxPrice || undefined,
        propertyTypes: (job.propertyTypes as string[]) || undefined,
        maxListings: job.maxListingsPerRun || 100,
        sources: usSources as any
      };

      const result = await scrapeUSFSBO(usConfig);
      totalListings += result.listings.length;
      Object.assign(bySource, result.bySource);
      if (result.errors.length > 0) errors.push(...result.errors);
    }

    // Update job status
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: {
        status: 'IDLE',
        lastRunAt: new Date(),
        nextRunAt: calculateNextRun(job.frequency),
        totalListingsFound: { increment: totalListings }
      }
    });

    return {
      success: true,
      results: {
        totalListings,
        newListings: totalListings, // Would need tracking for accurate count
        updatedListings: 0,
        bySource
      },
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    // Update job status on error
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: { status: 'ERROR' }
    }).catch(() => {});

    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

export async function getScrapingJobs(userId: string): Promise<any[]> {
  return prisma.rEScrapingJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

export async function updateScrapingJob(
  jobId: string,
  updates: Partial<ScrapingJobConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: {
        ...updates,
        nextRunAt: updates.frequency ? calculateNextRun(updates.frequency) : undefined
      }
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    };
  }
}

export async function deleteScrapingJob(jobId: string): Promise<{ success: boolean }> {
  try {
    await prisma.rEScrapingJob.delete({ where: { id: jobId } });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getJobsDueForRun(): Promise<any[]> {
  return prisma.rEScrapingJob.findMany({
    where: {
      isActive: true,
      frequency: { not: 'manual' },
      OR: [
        { nextRunAt: { lte: new Date() } },
        { nextRunAt: null }
      ]
    }
  });
}

function calculateNextRun(frequency: string): Date | null {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'biweekly':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}
