import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { linkedInScraperService } from '@/lib/linkedin-scraper-service';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/linkedin-scraper/limit - Check weekly scraping limit
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const limitStatus = await linkedInScraperService.checkWeeklyLimit(session.user.id);

    return NextResponse.json(limitStatus);
  } catch (error: any) {
    console.error('❌ LinkedIn limit check error:', error);
    return apiErrors.internal(error.message || 'Failed to check scraping limit');
  }
}
