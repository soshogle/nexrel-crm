export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  scrapeFSBOListings,
  validateApifyConnection,
  createScrapingJob,
  getScrapingJobs
} from '@/lib/real-estate/scrapers';
import { REFSBOSource } from '@prisma/client';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const jobs = await getScrapingJobs(session.user.id);
    const apifyStatus = await validateApifyConnection();

    return NextResponse.json({
      success: true,
      apifyConnected: apifyStatus.valid,
      jobs,
    });
  } catch (error) {
    console.error('[FSBO Scrape] GET error:', error);
    return apiErrors.internal('Failed to get scrape status');
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const {
      sources = ['ZILLOW_FSBO'],
      targetCities = [],
      targetStates = [],
      targetZipCodes = [],
      minPrice,
      maxPrice,
      maxListings = 100,
      jobName,
    } = body;

    const validation = await validateApifyConnection();
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Lead Finder not configured',
        message: validation.error || 'Please configure your API token',
      }, { status: 400 });
    }

    const job = await createScrapingJob({
      userId: session.user.id,
      name: jobName || `FSBO Scrape - ${new Date().toLocaleDateString()}`,
      sources,
      targetCities,
      targetStates,
      targetZipCodes,
      minPrice,
      maxPrice,
    });

    const validSources = sources.filter((s: string) =>
      ['ZILLOW_FSBO', 'FSBO_COM', 'DUPROPRIO', 'KIJIJI', 'CRAIGSLIST', 'PURPLEBRICKS', 'FACEBOOK_MARKETPLACE'].includes(s)
    ) as REFSBOSource[];

    const result = await scrapeFSBOListings({
      userId: session.user.id,
      jobId: job.job.id,
      sources: validSources.length > 0 ? validSources : ['ZILLOW_FSBO'],
      targetCities,
      targetStates,
      targetZipCodes,
      minPrice,
      maxPrice,
      maxListings,
    });

    return NextResponse.json({
      success: result.success,
      jobId: job.job.id,
      totalFound: result.totalFound,
      newLeads: result.newLeads,
      message: result.success
        ? `Found ${result.totalFound} listings, added ${result.newLeads} new leads`
        : 'Scraping completed with errors',
    });
  } catch (error) {
    console.error('[FSBO Scrape] POST error:', error);
    return NextResponse.json({ success: false, error: 'Scraping failed' }, { status: 500 });
  }
}
