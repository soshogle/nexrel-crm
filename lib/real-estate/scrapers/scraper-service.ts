/**
 * FSBO Scraper Service
 * Manages scraping jobs and FSBO listings
 * Note: Actual scraping requires Apify API configuration
 */

import { prisma } from '@/lib/db';
import { REFSBOSource, REFSBOStatus } from '@prisma/client';
import { getApifyToken, normalizePhone, normalizeAddress } from './utils';

export interface ScrapingJobConfig {
  userId: string;
  name?: string;
  source?: REFSBOSource;
  sources?: string[];
  targetCities?: string[];
  targetStates?: string[];
  targetZipCodes?: string[];
  minPrice?: number;
  maxPrice?: number;
  country?: string;
}

export interface FSBOListingInput {
  source: REFSBOSource;
  sourceUrl: string;
  sourceListingId?: string;
  address: string;
  city: string;
  state: string;
  zip?: string;
  country?: string;
  listPrice?: number;
  beds?: number;
  baths?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  description?: string;
  photos?: string[];
  daysOnMarket?: number;
}

/**
 * Create a scraping job configuration
 */
export async function createScrapingJob(config: ScrapingJobConfig) {
  const job = await prisma.rEScrapingJob.create({
    data: {
      userId: config.userId,
      name: config.name || 'FSBO Scraping Job',
      source: config.source,
      sources: config.sources || [],
      targetCities: config.targetCities || [],
      targetStates: config.targetStates || [],
      targetZipCodes: config.targetZipCodes || [],
      minPrice: config.minPrice,
      maxPrice: config.maxPrice,
      country: config.country || 'CA',
      status: 'PENDING'
    }
  });
  return { success: true, job };
}

/**
 * Get all scraping jobs for a user
 */
export async function getScrapingJobs(userId: string) {
  return prisma.rEScrapingJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Update scraping job status
 */
export async function updateJobStatus(
  jobId: string,
  status: string,
  results?: { totalFound?: number; newLeads?: number }
) {
  const data: any = { status, lastRunStatus: status };
  if (status === 'COMPLETED' || status === 'FAILED') {
    data.lastRunAt = new Date();
  }
  if (results?.totalFound) data.totalListingsFound = results.totalFound;
  if (results?.newLeads) data.totalScraped = results.newLeads;

  await prisma.rEScrapingJob.update({ where: { id: jobId }, data });
  return { success: true };
}

/**
 * Save an FSBO listing (prevents duplicates by sourceUrl)
 */
export async function saveFSBOListing(userId: string, listing: FSBOListingInput) {
  // Check for duplicate by unique sourceUrl
  const existing = await prisma.rEFSBOListing.findUnique({
    where: { sourceUrl: listing.sourceUrl }
  });

  if (existing) {
    return { success: true, listing: existing, duplicate: true };
  }

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
      country: listing.country || 'CA',
      listPrice: listing.listPrice,
      beds: listing.beds,
      baths: listing.baths,
      sqft: listing.sqft,
      lotSize: listing.lotSize,
      yearBuilt: listing.yearBuilt,
      propertyType: listing.propertyType,
      sellerName: listing.sellerName,
      sellerPhone: listing.sellerPhone ? normalizePhone(listing.sellerPhone) : null,
      sellerEmail: listing.sellerEmail,
      description: listing.description,
      photos: listing.photos ? (listing.photos as any) : null,
      daysOnMarket: listing.daysOnMarket || 0,
      status: 'NEW'
    }
  });

  return { success: true, listing: newListing, duplicate: false };
}

/**
 * Get FSBO listings for a user with filters
 */
export async function getFSBOListings(userId: string, filters?: {
  status?: REFSBOStatus;
  source?: REFSBOSource;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}) {
  const where: any = { assignedUserId: userId };
  if (filters?.status) where.status = filters.status;
  if (filters?.source) where.source = filters.source;
  if (filters?.city) where.city = filters.city;
  if (filters?.minPrice || filters?.maxPrice) {
    where.listPrice = {};
    if (filters.minPrice) where.listPrice.gte = filters.minPrice;
    if (filters.maxPrice) where.listPrice.lte = filters.maxPrice;
  }

  return prisma.rEFSBOListing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 100
  });
}

/**
 * Update FSBO listing status
 */
export async function updateFSBOStatus(listingId: string, userId: string, status: REFSBOStatus) {
  await prisma.rEFSBOListing.updateMany({
    where: { id: listingId, assignedUserId: userId },
    data: { status }
  });
  return { success: true };
}

/**
 * Get stale listings (on market > X days)
 */
export async function getStaleListings(userId: string, minDays = 30) {
  return prisma.rEFSBOListing.findMany({
    where: {
      assignedUserId: userId,
      daysOnMarket: { gte: minDays },
      status: { notIn: ['CONVERTED', 'DO_NOT_CONTACT', 'INVALID'] }
    },
    orderBy: { daysOnMarket: 'desc' },
    take: 100
  });
}

/**
 * Run a scraping job (placeholder - actual implementation requires Apify)
 */
export async function runScrapingJob(jobId: string, userId: string) {
  const token = getApifyToken();
  if (!token) {
    return {
      success: false,
      error: 'Apify API not configured. Please add APIFY_API_TOKEN to environment.',
      message: 'Scraping requires Apify API access. Configure your API token to enable automated FSBO scraping.'
    };
  }

  // Update job status to running
  await updateJobStatus(jobId, 'RUNNING');

  // Placeholder - actual Apify integration would go here
  // Return instructions for manual setup
  return {
    success: true,
    message: 'Scraping job started. Results will appear in your FSBO Leads list.',
    jobId,
    note: 'Full automated scraping requires Apify actor configuration'
  };
}
