/**
 * Scraping Job Manager
 * Manages scraping jobs for FSBO listings
 */

import { prisma } from '@/lib/db';
import type { REFSBOSource } from '../types';

export interface CreateJobInput {
  userId: string;
  name?: string;
  source?: REFSBOSource;
  sources?: string[];
  targetCities?: string[];
  targetStates?: string[];
  targetZips?: string[];
  country?: string;
  minPrice?: number;
  maxPrice?: number;
  frequency?: string;
  isActive?: boolean;
}

export interface UpdateJobInput {
  status?: string;
  totalListingsFound?: number;
  lastRunAt?: Date;
  lastRunStatus?: string;
  nextRunAt?: Date;
}

export async function createScrapingJob(input: CreateJobInput) {
  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: input.userId,
        name: input.name || 'FSBO Scraping Job',
        source: input.source,
        sources: input.sources || [],
        targetCities: input.targetCities || [],
        targetStates: input.targetStates || [],
        targetZipCodes: input.targetZips || [],
        country: input.country || 'CA',
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        frequency: input.frequency || 'weekly',
        isActive: input.isActive ?? true,
        status: 'IDLE'
      }
    });
    return { success: true, job };
  } catch (error: any) {
    console.error('Error creating scraping job:', error);
    return { success: false, error: error.message };
  }
}

export async function updateScrapingJob(jobId: string, input: UpdateJobInput) {
  try {
    const job = await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: {
        ...input,
        updatedAt: new Date()
      }
    });
    return { success: true, job };
  } catch (error: any) {
    console.error('Error updating scraping job:', error);
    return { success: false, error: error.message };
  }
}

export async function getScrapingJobs(userId: string, limit = 50) {
  try {
    const jobs = await prisma.rEScrapingJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return jobs;
  } catch (error: any) {
    console.error('Error fetching scraping jobs:', error);
    return [];
  }
}

export async function deleteScrapingJob(jobId: string, userId: string) {
  try {
    await prisma.rEScrapingJob.deleteMany({
      where: { id: jobId, userId }
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting scraping job:', error);
    return { success: false, error: error.message };
  }
}

export async function getJobsDueForRun() {
  try {
    const now = new Date();
    const jobs = await prisma.rEScrapingJob.findMany({
      where: {
        isActive: true,
        OR: [
          { nextRunAt: { lte: now } },
          { lastRunAt: null }
        ]
      }
    });
    return jobs;
  } catch (error: any) {
    console.error('Error fetching due jobs:', error);
    return [];
  }
}

export async function runScrapingJob(jobId: string) {
  try {
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: { 
        status: 'RUNNING',
        lastRunAt: new Date()
      }
    });
    return { success: true, message: 'Job started' };
  } catch (error: any) {
    console.error('Error running scraping job:', error);
    return { success: false, error: error.message };
  }
}
