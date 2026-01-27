/**
 * DuProprio.com Scraper for Canadian FSBO Listings
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource, REFSBOStatus } from '../types';

export interface DuProprioListing {
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
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  photos?: string[];
}

export interface ScrapeDuProprioConfig {
  userId: string;
  targetCities: string[];
  minPrice?: number;
  maxPrice?: number;
}

export async function scrapeDuProprio(config: ScrapeDuProprioConfig): Promise<{
  success: boolean;
  listings: DuProprioListing[];
  errors: string[];
  jobId?: string;
}> {
  const apifyToken = getApifyToken();
  
  if (!apifyToken) {
    return { success: false, listings: [], errors: ['APIFY_API_TOKEN not configured'] };
  }

  try {
    const job = await prisma.rEScrapingJob.create({
      data: {
        userId: config.userId,
        name: `DuProprio - ${config.targetCities.join(', ')}`,
        source: 'DUPROPRIO' as REFSBOSource,
        sources: ['DUPROPRIO'],
        targetCities: config.targetCities,
        minPrice: config.minPrice,
        maxPrice: config.maxPrice,
        country: 'CA',
        status: 'RUNNING',
        lastRunAt: new Date()
      }
    });

    return { success: true, listings: [], errors: [], jobId: job.id };
  } catch (error: any) {
    console.error('DuProprio scrape error:', error);
    return { success: false, listings: [], errors: [error.message] };
  }
}

export async function checkDuProprioJobStatus(jobId: string): Promise<{
  status: string;
  listings: DuProprioListing[];
}> {
  try {
    const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
    if (!job) return { status: 'NOT_FOUND', listings: [] };

    const fsboListings = await prisma.rEFSBOListing.findMany({
      where: { 
        assignedUserId: job.userId,
        source: 'DUPROPRIO'
      },
      orderBy: { firstSeenAt: 'desc' },
      take: 100
    });

    const listings: DuProprioListing[] = fsboListings.map(l => ({
      sourceUrl: l.sourceUrl,
      sourceListingId: l.sourceListingId || undefined,
      address: l.address,
      city: l.city,
      state: l.state,
      zip: l.zip || undefined,
      listPrice: l.listPrice || undefined,
      beds: l.beds || undefined,
      baths: l.baths || undefined,
      sqft: l.sqft || undefined,
      propertyType: l.propertyType || undefined,
      description: l.description || undefined,
      sellerName: l.sellerName || undefined,
      sellerPhone: l.sellerPhone || undefined,
      sellerEmail: l.sellerEmail || undefined,
      photos: (l.photos as string[]) || undefined
    }));

    return { status: job.status || 'UNKNOWN', listings };
  } catch (error: any) {
    console.error('Error checking DuProprio job status:', error);
    return { status: 'ERROR', listings: [] };
  }
}

export async function saveDuProprioListings(
  userId: string, 
  listings: DuProprioListing[]
): Promise<{ saved: number; errors: string[] }> {
  let saved = 0;
  const errors: string[] = [];

  for (const listing of listings) {
    try {
      await prisma.rEFSBOListing.upsert({
        where: { sourceUrl: listing.sourceUrl },
        create: {
          assignedUserId: userId,
          source: 'DUPROPRIO' as REFSBOSource,
          status: 'NEW' as REFSBOStatus,
          sourceUrl: listing.sourceUrl,
          sourceListingId: listing.sourceListingId,
          address: listing.address,
          city: listing.city,
          state: listing.state,
          zip: listing.zip,
          country: 'CA',
          listPrice: listing.listPrice,
          beds: listing.beds,
          baths: listing.baths,
          sqft: listing.sqft,
          propertyType: listing.propertyType,
          description: listing.description,
          sellerName: listing.sellerName,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          photos: listing.photos,
          firstSeenAt: new Date(),
          lastSeenAt: new Date()
        },
        update: {
          listPrice: listing.listPrice,
          description: listing.description,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          lastSeenAt: new Date()
        }
      });
      saved++;
    } catch (error: any) {
      errors.push(`Failed to save ${listing.sourceUrl}: ${error.message}`);
    }
  }

  return { saved, errors };
}
