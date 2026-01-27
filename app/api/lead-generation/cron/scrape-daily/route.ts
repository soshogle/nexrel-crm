import { NextRequest, NextResponse } from 'next/server';
import { runDailyGoogleMapsScraping, testCronJob } from '@/lib/lead-generation/cron-scraper';

/**
 * GET /api/lead-generation/cron/scrape-daily
 * Cron endpoint for daily Google Maps scraping
 * 
 * This endpoint should be called by a cron job daily at 2 AM
 * Can also be triggered manually for testing
 */
export async function GET(request: NextRequest) {
  try {
    // Check for authorization (optional: add a secret key)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'test-secret';
    
    // In production, require authorization
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if test mode
    const searchParams = request.nextUrl.searchParams;
    const testMode = searchParams.get('test') === 'true';
    
    if (testMode) {
      console.log('[CRON] Running in test mode...');
      const result = await testCronJob();
      
      return NextResponse.json({
        success: true,
        testMode: true,
        result
      });
    }
    
    // Run full scraping
    console.log('[CRON] Running daily Google Maps scraping...');
    const result = await runDailyGoogleMapsScraping();
    
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('[CRON] Error in daily scraping:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run daily scraping',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lead-generation/cron/scrape-daily
 * Manually trigger daily scraping (for testing)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
