/**
 * DuProprio.com Scraper for Canadian FSBO Listings
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource, REFSBOStatus } from '../types';

export interface DuProprioListing {
  externalId: string;
  address: string;
  city: string;
  province: string;
  postalCode?: string;
  price: number;
  propertyType: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  description?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  listingUrl: string;
  imageUrls: string[];
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
      where: { assignedUserId: job.userId, source: 'DUPROPRIO' },
      orderBy: { firstSeenAt: 'desc' },
      take: 100
    });

    const listings: DuProprioListing[] = fsboListings.map(l => ({
      externalId: l.sourceListingId || l.id,
      address: l.address,
      city: l.city,
      province: l.state,
      postalCode: l.zip || undefined,
      price: l.listPrice || 0,
      propertyType: l.propertyType || 'OTHER',
      bedrooms: l.beds || undefined,
      bathrooms: l.baths || undefined,
      squareFeet: l.sqft || undefined,
      description: l.description || undefined,
      sellerName: l.sellerName || undefined,
      sellerPhone: l.sellerPhone || undefined,
      sellerEmail: l.sellerEmail || undefined,
      listingUrl: l.sourceUrl,
      imageUrls: (l.photos as string[]) || []
    }));

    return { status: job.status || 'UNKNOWN', listings };
  } catch (error: any) {
    console.error('Error checking job status:', error);
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
        where: { sourceUrl: listing.listingUrl },
        create: {
          assignedUserId: userId,
          source: 'DUPROPRIO' as REFSBOSource,
          status: 'NEW' as REFSBOStatus,
          sourceListingId: listing.externalId,
          sourceUrl: listing.listingUrl,
          address: listing.address,
          city: listing.city,
          state: listing.province,
          zip: listing.postalCode,
          country: 'CA',
          listPrice: listing.price,
          propertyType: listing.propertyType || 'OTHER',
          beds: listing.bedrooms,
          baths: listing.bathrooms,
          sqft: listing.squareFeet,
          description: listing.description,
          sellerName: listing.sellerName,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          photos: listing.imageUrls,
          firstSeenAt: new Date(),
          lastSeenAt: new Date()
        },
        update: {
          listPrice: listing.price,
          description: listing.description,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          lastSeenAt: new Date()
        }
      });
      saved++;
    } catch (error: any) {
      errors.push(`Failed to save ${listing.externalId}: ${error.message}`);
    }
  }

  return { saved, errors };
}
