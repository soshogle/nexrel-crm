/**
 * Unified Scraper Service - Coordinates all FSBO scrapers
 */

import { prisma } from '@/lib/db';

// Valid sources from Prisma enum
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
    console.error('Error creating scraping job:', error);
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
    console.error('Error fetching scraping jobs:', error);
    return [];
  }
}

export async function updateJobStatus(
  jobId: string, 
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
  results?: { totalFound?: number; newLeads?: number; errors?: string[] }
) {
  try {
    const data: any = { status };
    if (status === 'COMPLETED' || status === 'FAILED') {
      data.completedAt = new Date();
    }
    if (results) {
      data.totalFound = results.totalFound;
      data.newLeads = results.newLeads;
      data.errors = results.errors;
    }
    
    await prisma.rEScrapingJob.update({
      where: { id: jobId },
      data
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function saveFSBOListing(userId: string, listing: {
  source: ValidSource;
  externalId?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  propertyType?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  description?: string;
  listingUrl?: string;
  daysOnMarket?: number;
}) {
  try {
    // Check for duplicates
    const existing = await prisma.rEFSBOListing.findFirst({
      where: {
        OR: [
          { externalId: listing.externalId },
          { address: listing.address, assignedUserId: userId }
        ]
      }
    });

    if (existing) {
      return { success: true, listing: existing, duplicate: true };
    }

    const newListing = await prisma.rEFSBOListing.create({
      data: {
        assignedUserId: userId,
        source: listing.source,
        externalId: listing.externalId,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        price: listing.price,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sqft: listing.sqft,
        propertyType: listing.propertyType,
        sellerName: listing.sellerName,
        sellerPhone: listing.sellerPhone,
        sellerEmail: listing.sellerEmail,
        description: listing.description,
        listingUrl: listing.listingUrl,
        daysOnMarket: listing.daysOnMarket || 0,
        status: 'NEW'
      }
    });

    return { success: true, listing: newListing, duplicate: false };
  } catch (error: any) {
    console.error('Error saving FSBO listing:', error);
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
    if (filters?.minPrice) where.price = { gte: filters.minPrice };
    if (filters?.maxPrice) where.price = { ...where.price, lte: filters.maxPrice };

    return await prisma.rEFSBOListing.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100
    });
  } catch (error) {
    console.error('Error fetching FSBO listings:', error);
    return [];
  }
}

export async function updateFSBOStatus(
  listingId: string, 
  userId: string, 
  status: 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'INTERESTED' | 'NOT_INTERESTED' | 'CONVERTED' | 'DEAD'
) {
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
