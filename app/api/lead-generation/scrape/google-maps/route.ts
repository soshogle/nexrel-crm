import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { scrapeGoogleMaps, GoogleMapsSearchQuery, DEFAULT_SEARCH_QUERIES } from '@/lib/lead-generation/google-maps-scraper';
import { batchScoreLeads } from '@/lib/lead-generation/lead-scoring-db';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal/db';
import { leadService } from '@/lib/dal/lead-service';

/**
 * POST /api/lead-generation/scrape/google-maps
 * Scrape Google Maps for business leads
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const queries: GoogleMapsSearchQuery[] = body.queries || DEFAULT_SEARCH_QUERIES.slice(0, 2); // Default: 2 queries
    
    // Scrape Google Maps
    console.log(`Starting Google Maps scraping for ${queries.length} queries...`);
    const result = await scrapeGoogleMaps(session.user.id, queries);
    
    console.log('Scraping completed:', result);
    
    // Automatically score all new leads
    if (result.success > 0) {
      console.log(`Scoring ${result.success} new leads...`);
      
      const scoringResult = await batchScoreLeads(session.user.id, {
        source: 'google_maps'
      });
      
      console.log('Scoring completed:', scoringResult);
      
      return NextResponse.json({
        success: true,
        scraping: result,
        scoring: scoringResult
      });
    }
    
    return NextResponse.json({
      success: true,
      scraping: result
    });
  } catch (error) {
    console.error('Error in Google Maps scraper:', error);
    return NextResponse.json(
      { 
        error: 'Failed to scrape Google Maps',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/lead-generation/scrape/google-maps
 * Get default search queries and stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = getCrmDb(ctx);

    // Get stats
    const stats = await db.lead.aggregate({
      where: {
        userId: ctx.userId,
        source: 'google_maps'
      },
      _count: true
    });

    // Get latest leads
    const latestLeads = await leadService.findMany(ctx, {
      where: { source: 'google_maps' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        businessName: true,
        city: true,
        state: true,
        leadScore: true,
        createdAt: true
      }
    });
    
    return NextResponse.json({
      success: true,
      defaultQueries: DEFAULT_SEARCH_QUERIES,
      stats: {
        totalLeads: stats._count,
        latestLeads
      }
    });
  } catch (error) {
    console.error('Error fetching Google Maps stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
