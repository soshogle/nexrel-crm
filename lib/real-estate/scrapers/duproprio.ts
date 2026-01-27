/**
 * DuProprio.com Scraper for Canadian FSBO Listings
 * Uses Apify for web scraping
 */

import { prisma } from '@/lib/db';
import { getApifyToken } from './utils';
import type { REFSBOSource, REFSBOStatus, REPropertyType } from '../types';

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
  propertyTypes?: string[];
}

export async function scrapeDuProprio(config: ScrapeDuProprioConfig): Promise<{
  success: boolean;
  listings: DuProprioListing[];
  errors: string[];
  jobId?: string;
}> {
  const apifyToken = getApifyToken();
  const errors: string[] = [];
  
  if (!apifyToken) {
    return { 
      success: false, 
      listings: [], 
      errors: ['APIFY_API_TOKEN not configured'] 
    };
  }

  try {
    // Create scraping job record
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

    // Apify actor call would go here
    // For now return the job ID for async processing

    return {
      success: true,
      listings: [],
      errors: [],
      jobId: job.id
    };

  } catch (error: any) {
    console.error('DuProprio scrape error:', error);
    errors.push(error.message);
    return { success: false, listings: [], errors };
  }
}

export async function checkDuProprioJobStatus(jobId: string): Promise<{
  status: string;
  listings: DuProprioListing[];
}> {
  try {
    const job = await prisma.rEScrapingJob.findUnique({
      where: { id: jobId }
    });

    if (!job) {
      return { status: 'NOT_FOUND', listings: [] };
    }

    // Get listings for this user
    const fsboListings = await prisma.rEFSBOListing.findMany({
      where: { 
        assignedUserId: job.userId,
        source: 'DUPROPRIO'
      },
      orderBy: { scrapedAt: 'desc' },
      take: 100
    });

    const listings: DuProprioListing[] = fsboListings.map(l => ({
      externalId: l.externalId || l.id,
      address: l.address,
      city: l.city || '',
      province: l.state || '',
      postalCode: l.zip || undefined,
      price: l.price ? Number(l.price) : 0,
      propertyType: l.propertyType || 'OTHER',
      bedrooms: l.bedrooms || undefined,
      bathrooms: l.bathrooms ? Number(l.bathrooms) : undefined,
      squareFeet: l.sqft || undefined,
      description: l.description || undefined,
      sellerName: l.sellerName || undefined,
      sellerPhone: l.sellerPhone || undefined,
      sellerEmail: l.sellerEmail || undefined,
      listingUrl: l.listingUrl || '',
      imageUrls: (l.imageUrls as string[]) || []
    }));

    return { 
      status: job.status || 'UNKNOWN', 
      listings 
    };
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
        where: {
          source_externalId: {
            source: 'DUPROPRIO' as REFSBOSource,
            externalId: listing.externalId
          }
        },
        create: {
          assignedUserId: userId,
          source: 'DUPROPRIO' as REFSBOSource,
          status: 'NEW' as REFSBOStatus,
          externalId: listing.externalId,
          address: listing.address,
          city: listing.city,
          state: listing.province,
          zip: listing.postalCode,
          country: 'CA',
          price: listing.price,
          propertyType: (listing.propertyType || 'OTHER') as REPropertyType,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms ? String(listing.bathrooms) : null,
          sqft: listing.squareFeet,
          description: listing.description,
          sellerName: listing.sellerName,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          listingUrl: listing.listingUrl,
          imageUrls: listing.imageUrls,
          scrapedAt: new Date()
        },
        update: {
          price: listing.price,
          description: listing.description,
          sellerPhone: listing.sellerPhone,
          sellerEmail: listing.sellerEmail,
          updatedAt: new Date()
        }
      });
      saved++;
    } catch (error: any) {
      errors.push(`Failed to save ${listing.externalId}: ${error.message}`);
    }
  }

  return { saved, errors };
}
