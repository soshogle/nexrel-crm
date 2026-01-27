/**
 * Scraping Job Manager
 * Manages scraping jobs for FSBO listings
 */

import { prisma } from '@/lib/db';
import type { REFSBOSource, ScrapingJobStatus } from '../types';

export interface CreateJobInput {
  userId: string;
  source: REFSBOSource;
  location?: string;
  filters?: Record<string, any>;
  scheduledFor?: Date;
  isRecurring?: boolean;
  recurringSchedule?: string;
}

export interface UpdateJobInput {
  status?: ScrapingJobStatus;
  listingsFound?: number;
  listingsProcessed?: number;
  errors?: string[];
  completedAt?: Date;
}

export async function createScrapingJob(input: CreateJobInput) {
  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: input.userId,
        source: input.source,
        status: 'PENDING',
        location: input.location,
        filters: input.filters || {},
        listingsFound: 0,
        listingsProcessed: 0,
        isRecurring: input.isRecurring || false,
        recurringSchedule: input.recurringSchedule,
        scheduledFor: input.scheduledFor,
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
        OR: [
          { scheduledFor: { lte: now }, status: 'PENDING' },
          { isRecurring: true, status: { not: 'RUNNING' } }
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
    // Mark as running
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data: { 
        status: 'RUNNING',
        startedAt: new Date()
      }
    });
    
    // Actual scraping would be triggered here
    // For now, return success
    return { success: true, message: 'Job started' };
  } catch (error: any) {
    console.error('Error running scraping job:', error);
    return { success: false, error: error.message };
  }
}
