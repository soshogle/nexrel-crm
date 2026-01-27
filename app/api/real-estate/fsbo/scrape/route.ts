export const dynamic = "force-dynamic";

/**
 * FSBO Scraping API - Trigger scraping jobs
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  createScrapingJob,
  runScrapingJob,
  getScrapingJobs,
  updateScrapingJob,
  deleteScrapingJob,
  type ScrapingJobConfig,
  // Canadian sources
  scrapeDuProprio,
  checkDuProprioJobStatus,
  scrapeCentris,
  checkCentrisJobStatus,
  scrapeRealtorCA,
  checkRealtorCAJobStatus,
  // US sources  
  scrapeUSFSBO,
  scrapeRealtorCom,
  checkRealtorComJobStatus,
  scrapeZillow,
  checkZillowJobStatus,
  scrapeCraigslist,
  checkCraigslistJobStatus
} from '@/lib/real-estate/scrapers';

// Log activity for FSBO events
async function logFSBOActivity(userId: string, action: string, description: string, metadata?: any) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'CREATE', // Use CREATE for new FSBO events
        entityType: 'FSBO_LISTING',
        severity: 'LOW',
        metadata: {
          fsboAction: action,
          description,
          ...metadata
        }
      }
    });
  } catch (error) {
    console.error('Failed to log FSBO activity:', error);
  }
}

// GET - List scraping jobs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobs = await getScrapingJobs(session.user.id);
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Scraping jobs GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scraping jobs' },
      { status: 500 }
    );
  }
}

// POST - Create job or run immediate scrape
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    // Handle check_status action - poll for job completion
    if (action === 'check_status') {
      const { jobId, source } = body;
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
      }
      
      console.log('🔍 Checking job status:', jobId, 'source:', source);
      
      // Get the job to determine which status checker to use
      const job = await prisma.rEScrapingJob.findUnique({ where: { id: jobId } });
      const jobSource = source || job?.sources?.[0] || 'DUPROPRIO';
      
      let statusResult;
      try {
        switch (jobSource.toUpperCase()) {
          case 'CENTRIS':
            statusResult = await checkCentrisJobStatus(jobId, session.user.id);
            break;
          case 'REALTOR_CA':
            statusResult = await checkRealtorCAJobStatus(jobId, session.user.id);
            break;
          case 'REALTOR_COM':
            statusResult = await checkRealtorComJobStatus(jobId, session.user.id);
            break;
          case 'ZILLOW_FSBO':
          case 'ZILLOW':
            statusResult = await checkZillowJobStatus(jobId, session.user.id);
            break;
          case 'CRAIGSLIST':
            statusResult = await checkCraigslistJobStatus(jobId, session.user.id);
            break;
          default:
            statusResult = await checkDuProprioJobStatus(jobId, session.user.id);
        }
      } catch (error: any) {
        console.error('Status check error:', error);
        return NextResponse.json({
          success: false,
          jobId,
          status: 'failed',
          error: error.message
        });
      }
      
      // Log activity when scrape completes with new listings
      if (statusResult.status === 'completed' && statusResult.listings.length > 0) {
        await logFSBOActivity(
          session.user.id,
          'SCRAPE_COMPLETED',
          `Found ${statusResult.listings.length} new FSBO listings from ${jobSource}`,
          { jobId, source: jobSource, listingsFound: statusResult.listings.length }
        );
      }
      
      return NextResponse.json({
        success: true,
        jobId,
        status: statusResult.status,
        progress: statusResult.progress,
        listingsFound: statusResult.listings?.length || 0,
        error: statusResult.error
      });
    }

    // Handle frontend format (location object) or legacy format
    const isNewFormat = body.location && !body.targetCities;
    
    // Normalize parameters
    let sources = body.sources || [];
    let targetCities: string[] = [];
    let targetStates: string[] = [];
    let minPrice = body.minPrice ?? body.priceMin ?? 0;
    let maxPrice = body.maxPrice ?? body.priceMax ?? 99999999;
    let maxListings = body.maxListings || 50;

    if (isNewFormat && body.location) {
      // Frontend format: { location: { city, state, country }, sources, priceMin, priceMax, ... }
      targetCities = body.location.city ? [body.location.city] : [];
      targetStates = body.location.state ? [body.location.state] : [];
    } else {
      // Legacy format: { targetCities, targetStates, sources, minPrice, maxPrice }
      targetCities = body.targetCities || [];
      targetStates = body.targetStates || [];
    }

    // Immediate scrape (default action if not specified)
    if (!action || action === 'scrape_now') {
      console.log('🔍 FSBO Scrape request:', { sources, targetCities, targetStates, minPrice, maxPrice });
      
      if (!sources || sources.length === 0 || targetCities.length === 0) {
        return NextResponse.json(
          { error: 'Sources and location required' },
          { status: 400 }
        );
      }

      const results: any = { listings: [], errors: [], bySource: {}, jobs: [] };

      // ========== CANADIAN SOURCES ==========
      
      // DuProprio (Quebec FSBO)
      if (sources.includes('duproprio')) {
        console.log('🇨🇦 Starting DuProprio scrape for:', targetCities);
        const dpResult = await scrapeDuProprio({
          userId: session.user.id,
          targetCities,
          minPrice,
          maxPrice,
          maxListings
        });
        
        if (dpResult.jobId) {
          results.jobs.push({ source: 'duproprio', jobId: dpResult.jobId, status: dpResult.status });
          results.bySource['duproprio'] = 'pending';
        } else {
          results.errors.push(...dpResult.errors);
          results.bySource['duproprio'] = 0;
        }
      }

      // Centris (Quebec MLS)
      if (sources.includes('centris') || sources.includes('centris.ca')) {
        console.log('🇨🇦 Starting Centris scrape for:', targetCities);
        const centrisResult = await scrapeCentris({
          userId: session.user.id,
          targetCities,
          minPrice,
          maxPrice,
          maxListings
        });
        
        if (centrisResult.jobId) {
          results.jobs.push({ source: 'centris', jobId: centrisResult.jobId, status: centrisResult.status });
          results.bySource['centris'] = 'pending';
        } else {
          results.errors.push(...centrisResult.errors);
          results.bySource['centris'] = 0;
        }
      }

      // Realtor.ca (Canada MLS)
      if (sources.includes('realtor.ca') || sources.includes('realtor_ca') || sources.includes('realtorca')) {
        console.log('🇨🇦 Starting Realtor.ca scrape for:', targetCities);
        const rcaResult = await scrapeRealtorCA({
          userId: session.user.id,
          targetCities,
          minPrice,
          maxPrice,
          maxListings
        });
        
        if (rcaResult.jobId) {
          results.jobs.push({ source: 'realtor.ca', jobId: rcaResult.jobId, status: rcaResult.status });
          results.bySource['realtor.ca'] = 'pending';
        } else {
          results.errors.push(...rcaResult.errors);
          results.bySource['realtor.ca'] = 0;
        }
      }

      // Kijiji (Canada classifieds)
      if (sources.includes('kijiji')) {
        console.log('🇨🇦 Kijiji for:', targetCities);
        results.bySource['kijiji'] = 0;
        results.errors.push('Kijiji scraper coming soon');
      }

      // ========== US SOURCES ==========

      // Realtor.com (US)
      if (sources.includes('realtor.com') || sources.includes('realtor_com') || sources.includes('realtorcom')) {
        console.log('🇺🇸 Starting Realtor.com scrape for:', targetCities);
        const rcomResult = await scrapeRealtorCom({
          userId: session.user.id,
          targetCities,
          targetStates: targetStates.length > 0 ? targetStates : ['TX', 'FL', 'CA', 'AZ', 'NY'],
          minPrice,
          maxPrice,
          maxListings
        });
        
        if (rcomResult.jobId) {
          results.jobs.push({ source: 'realtor.com', jobId: rcomResult.jobId, status: rcomResult.status });
          results.bySource['realtor.com'] = 'pending';
        } else {
          results.errors.push(...rcomResult.errors);
          results.bySource['realtor.com'] = 0;
        }
      }

      // Zillow FSBO (US)
      if (sources.includes('zillow') || sources.includes('zillow_fsbo') || sources.includes('zillowfsbo')) {
        console.log('🇺🇸 Starting Zillow FSBO scrape for:', targetCities);
        const zillowResult = await scrapeZillow({
          userId: session.user.id,
          targetCities,
          targetStates: targetStates.length > 0 ? targetStates : ['TX', 'FL', 'CA', 'AZ', 'NY'],
          minPrice,
          maxPrice,
          maxListings,
          fsboOnly: true
        });
        
        if (zillowResult.jobId) {
          results.jobs.push({ source: 'zillow', jobId: zillowResult.jobId, status: zillowResult.status });
          results.bySource['zillow'] = 'pending';
        } else {
          results.errors.push(...zillowResult.errors);
          results.bySource['zillow'] = 0;
        }
      }

      // FSBO.com & ForSaleByOwner.com (US)
      const usFsboSources = sources.filter((s: string) => 
        ['fsbo', 'fsbo.com', 'forsalebyowner', 'forsalebyowner.com'].includes(s.toLowerCase())
      );
      if (usFsboSources.length > 0) {
        console.log('🇺🇸 Scraping US FSBO sources:', usFsboSources, 'for:', targetCities);
        const usResult = await scrapeUSFSBO({
          userId: session.user.id,
          targetCities,
          targetStates: targetStates.length > 0 ? targetStates : ['TX', 'FL', 'CA', 'AZ', 'NY'],
          minPrice,
          maxPrice,
          maxListings,
          sources: usFsboSources.map((s: string) => s === 'fsbo' ? 'fsbo.com' : s === 'forsalebyowner' ? 'forsalebyowner.com' : s) as any
        });
        results.listings.push(...usResult.listings);
        results.errors.push(...usResult.errors);
        Object.assign(results.bySource, usResult.bySource);
      }

      // ========== MULTI-REGION SOURCES ==========

      // Craigslist (US & Canada)
      if (sources.includes('craigslist')) {
        console.log('🌐 Starting Craigslist scrape for:', targetCities);
        const clResult = await scrapeCraigslist({
          userId: session.user.id,
          targetCities,
          minPrice,
          maxPrice,
          maxListings
        });
        
        if (clResult.jobId) {
          results.jobs.push({ source: 'craigslist', jobId: clResult.jobId, status: clResult.status });
          results.bySource['craigslist'] = 'pending';
        } else {
          results.errors.push(...clResult.errors);
          results.bySource['craigslist'] = 0;
        }
      }

      // MLS.ca - redirect to Realtor.ca (same data)
      if (sources.includes('mls.ca') || sources.includes('mls_ca')) {
        console.log('🇨🇦 MLS.ca redirects to Realtor.ca');
        results.bySource['mls.ca'] = 'use realtor.ca';
      }

      // UK sources
      if (sources.includes('rightmove') || sources.includes('purplebricks')) {
        console.log('🇬🇧 UK sources requested');
        results.errors.push('UK sources (Rightmove, PurpleBricks) coming soon');
      }

      console.log('📊 Scrape results:', { 
        total: results.listings.length, 
        bySource: results.bySource,
        pendingJobs: results.jobs.length
      });

      // Log activity for scrape start
      await logFSBOActivity(
        session.user.id,
        'SCRAPE_STARTED',
        `Started FSBO scrape for ${targetCities.join(', ')} from ${sources.join(', ')}`,
        { sources, targetCities, pendingJobs: results.jobs.length }
      );

      // If we have pending async jobs, return job IDs for polling
      if (results.jobs.length > 0) {
        return NextResponse.json({
          success: true,
          status: 'started',
          message: 'Scraping job started. This takes 2-3 minutes. Poll for status using the jobId.',
          jobs: results.jobs,
          totalListings: results.listings.length,
          bySource: results.bySource,
          errors: results.errors.length > 0 ? results.errors : undefined
        });
      }

      return NextResponse.json({
        success: true,
        status: 'completed',
        totalListings: results.listings.length,
        bySource: results.bySource,
        errors: results.errors.length > 0 ? results.errors : undefined
      });
    }

    // Create scheduled job
    if (action === 'create_job') {
      const config: ScrapingJobConfig = {
        userId: session.user.id,
        name: body.name || 'FSBO Scraping Job',
        sources: body.sources || ['duproprio', 'fsbo.com'],
        targetCities: body.targetCities || [],
        targetStates: body.targetStates,
        targetZipCodes: body.targetZipCodes,
        minPrice: body.minPrice,
        maxPrice: body.maxPrice,
        propertyTypes: body.propertyTypes,
        maxListingsPerRun: body.maxListingsPerRun || 100,
        frequency: body.frequency || 'weekly',
        isActive: body.isActive !== false
      };

      const result = await createScrapingJob(config);
      return NextResponse.json(result);
    }

    // Run existing job
    if (action === 'run_job') {
      const { jobId } = body;
      if (!jobId) {
        return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
      }
      const result = await runScrapingJob(jobId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Scraping POST error:', error);
    return NextResponse.json(
      { error: 'Scraping operation failed' },
      { status: 500 }
    );
  }
}

// PATCH - Update job
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, ...updates } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const result = await updateScrapingJob(jobId, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Scraping PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE - Delete job
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    const result = await deleteScrapingJob(jobId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Scraping DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
