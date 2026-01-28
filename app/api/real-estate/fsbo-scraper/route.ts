/**
 * FSBO Scraper API
 * Trigger FSBO listing scrapes using Apify
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { REFSBOSource } from '@prisma/client';
import {
  scrapeFSBOListings,
  scrapeExpiredListings,
  validateApifyConnection,
  createScrapingJob,
  getScrapingJobs
} from '@/lib/real-estate/scrapers';

export const dynamic = 'force-dynamic';

// GET - Check scraper status and list jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Validate Apify connection
    if (action === 'validate') {
      const validation = await validateApifyConnection();
      return NextResponse.json(validation);
    }

    // List scraping jobs
    const jobs = await getScrapingJobs(session.user.id);
    
    // Also get Apify status
    const apifyStatus = await validateApifyConnection();

    return NextResponse.json({
      success: true,
      apifyConnected: apifyStatus.valid,
      apifyUser: apifyStatus.user,
      jobs,
      sources: [
        { id: 'ZILLOW_FSBO', name: 'Zillow FSBO', country: 'US' },
        { id: 'FSBO_COM', name: 'FSBO.com', country: 'US' },
        { id: 'DUPROPRIO', name: 'DuProprio', country: 'CA' },
        { id: 'KIJIJI', name: 'Kijiji', country: 'CA' },
        { id: 'CRAIGSLIST', name: 'Craigslist', country: 'US/CA' },
        { id: 'PURPLEBRICKS', name: 'Purplebricks', country: 'CA/UK' },
        { id: 'FACEBOOK_MARKETPLACE', name: 'Facebook Marketplace', country: 'US/CA' }
      ]
    });
  } catch (error) {
    console.error('[FSBO Scraper API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get scraper status' },
      { status: 500 }
    );
  }
}

// POST - Start a scraping job
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = 'fsbo', // 'fsbo' or 'expired'
      sources = ['ZILLOW_FSBO'],
      targetCities = [],
      targetStates = [],
      targetZipCodes = [],
      minPrice,
      maxPrice,
      maxListings = 100,
      jobName
    } = body;

    // Validate Apify connection first
    const validation = await validateApifyConnection();
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Apify not configured',
        message: validation.error || 'Please configure your Apify API token'
      }, { status: 400 });
    }

    // Create a scraping job record
    const job = await createScrapingJob({
      userId: session.user.id,
      name: jobName || `${type.toUpperCase()} Scrape - ${new Date().toLocaleDateString()}`,
      sources,
      targetCities,
      targetStates,
      targetZipCodes,
      minPrice,
      maxPrice
    });

    // Run the appropriate scraper
    let result;
    if (type === 'expired') {
      result = await scrapeExpiredListings({
        userId: session.user.id,
        targetCities,
        targetStates,
        targetZipCodes,
        minPrice,
        maxPrice,
        maxListings
      });
    } else {
      // Default to FSBO scraping
      const validSources = sources.filter((s: string) =>
        ['ZILLOW_FSBO', 'FSBO_COM', 'DUPROPRIO', 'KIJIJI', 'CRAIGSLIST', 'PURPLEBRICKS', 'FACEBOOK_MARKETPLACE'].includes(s)
      ) as REFSBOSource[];

      result = await scrapeFSBOListings({
        userId: session.user.id,
        jobId: job.job.id,
        sources: validSources.length > 0 ? validSources : ['ZILLOW_FSBO'],
        targetCities,
        targetStates,
        targetZipCodes,
        minPrice,
        maxPrice,
        maxListings
      });
    }

    return NextResponse.json({
      success: result.success,
      jobId: job.job.id,
      totalFound: result.totalFound,
      newLeads: result.newLeads,
      duplicates: 'duplicates' in result ? result.duplicates : 0,
      bySource: 'bySource' in result ? result.bySource : {},
      errors: result.errors,
      message: result.success
        ? `Found ${result.totalFound} listings, added ${result.newLeads} new leads`
        : 'Scraping completed with errors'
    });
  } catch (error) {
    console.error('[FSBO Scraper API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Scraping failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
