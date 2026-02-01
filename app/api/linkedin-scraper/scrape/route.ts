import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { linkedInScraperService } from '@/lib/linkedin-scraper-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// POST /api/linkedin-scraper/scrape - Start LinkedIn scraping
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { searchQuery, maxResults = 20 } = body;

    if (!searchQuery) {
      return NextResponse.json(
        { error: 'Missing required field: searchQuery' },
        { status: 400 }
      );
    }

    console.log(`🔍 LinkedIn scrape request from user ${session.user.id}: "${searchQuery}"`);

    // Execute scraping
    const result = await linkedInScraperService.scrapeLinkedInProfiles(
      session.user.id,
      searchQuery,
      maxResults
    );

    if (!result.success && result.errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: result.errors[0],
          leadsScraped: result.leadsScraped,
          leadsCreated: result.leadsCreated,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      leadsScraped: result.leadsScraped,
      leadsCreated: result.leadsCreated,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('❌ LinkedIn scrape API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to scrape LinkedIn profiles' },
      { status: 500 }
    );
  }
}
