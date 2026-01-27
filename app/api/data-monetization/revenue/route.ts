
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';

/**
 * GET /api/data-monetization/revenue
 * Get revenue summary for user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startPeriod = searchParams.get('startPeriod') || undefined;
    const endPeriod = searchParams.get('endPeriod') || undefined;

    const revenueSummary = await dataMonetizationService.getRevenueSummary(
      session.user.id,
      {
        startPeriod,
        endPeriod,
      }
    );

    return NextResponse.json(revenueSummary);
  } catch (error: any) {
    console.error('Error fetching revenue:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch revenue' },
      { status: 500 }
    );
  }
}
