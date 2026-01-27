import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { linkedInScraperService } from '@/lib/linkedin-scraper-service';

export const dynamic = 'force-dynamic';

// GET /api/linkedin-scraper/limit - Check weekly scraping limit
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitStatus = await linkedInScraperService.checkWeeklyLimit(session.user.id);

    return NextResponse.json(limitStatus);
  } catch (error: any) {
    console.error('❌ LinkedIn limit check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check scraping limit' },
      { status: 500 }
    );
  }
}
