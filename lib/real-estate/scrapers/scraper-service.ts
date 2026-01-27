/**
 * Unified Scraper Service
 */

import { prisma } from '@/lib/db';

const VALID_SOURCES = ['DUPROPRIO', 'PURPLEBRICKS', 'FSBO_COM', 'CRAIGSLIST', 'FACEBOOK_MARKETPLACE', 'KIJIJI', 'ZILLOW_FSBO', 'MANUAL_IMPORT', 'OTHER'] as const;
type ValidSource = typeof VALID_SOURCES[number];

export interface ScrapingJobConfig {
  userId: string;
  name?: string;
  source?: ValidSource;
  sources?: ValidSource[];
  targetCities?: string[];
  targetStates?: string[];
  minPrice?: number;
  maxPrice?: number;
}

export async function createScrapingJob(input: ScrapingJobConfig) {
  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: input.userId,
        name: input.name || 'FSBO Scraping Job',
        source: input.source || 'OTHER',
        sources: input.sources || [],
        targetCities: input.targetCities || [],
        targetStates: input.targetStates || [],
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        status: 'PENDING'
      }
    });
    return { success: true, job };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getScrapingJobs(userId: string) {
  try {
    return await prisma.rEScrapingJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function updateJobStatus(
  jobId: string, 
  status: string,
  results?: { totalFound?: number; newLeads?: number }
) {
  try {
    const data: any = { status, lastRunStatus: status };
    if (status === 'COMPLETED' || status === 'FAILED') {
      data.lastRunAt = new Date();
    }
    if (results?.totalFound) {
      data.totalListingsFound = results.totalFound;
    }
    if (results?.newLeads) {
      data.totalScraped = results.newLeads;
    }
    
    await prisma.rEScrapingJob.update({ where: { id: jobId }, data });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveFSBOListing(userId: string, listing: {
  source: ValidSource;
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
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  description?: string;
  daysOnMarket?: number;
}) {
  try {
    // Check for duplicates by sourceUrl (unique field)
    const existing = await prisma.rEFSBOListing.findUnique({
      where: { sourceUrl: listing.sourceUrl }
    });

    if (existing) return { success: true, listing: existing, duplicate: true };

    const newListing = await prisma.rEFSBOListing.create({
      data: {
        assignedUserId: userId,
        source: listing.source,
        sourceUrl: listing.sourceUrl,
        sourceListingId: listing.sourceListingId,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        listPrice: listing.listPrice,
        beds: listing.beds,
        baths: listing.baths,
        sqft: listing.sqft,
        propertyType: listing.propertyType,
        sellerName: listing.sellerName,
        sellerPhone: listing.sellerPhone,
        sellerEmail: listing.sellerEmail,
        description: listing.description,
        daysOnMarket: listing.daysOnMarket || 0,
        status: 'NEW'
      }
    });

    return { success: true, listing: newListing, duplicate: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFSBOListings(userId: string, filters?: {
  status?: string;
  source?: ValidSource;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  try {
    const where: any = { assignedUserId: userId };
    if (filters?.status) where.status = filters.status;
    if (filters?.source) where.source = filters.source;
    if (filters?.city) where.city = filters.city;
    if (filters?.minPrice) where.listPrice = { gte: filters.minPrice };
    if (filters?.maxPrice) where.listPrice = { ...where.listPrice, lte: filters.maxPrice };

    return await prisma.rEFSBOListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100
    });
  } catch (error) {
    return [];
  }
}

export async function updateFSBOStatus(listingId: string, userId: string, status: string) {
  try {
    await prisma.rEFSBOListing.updateMany({
      where: { id: listingId, assignedUserId: userId },
      data: { status }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
