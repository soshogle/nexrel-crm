
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCashStatistics } from '@/lib/payments/cash-service';

/**
 * GET /api/payments/cash/statistics
 * Get cash transaction statistics for a date range
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const merchantId = searchParams.get('merchantId');

    // Default to last 30 days if no dates provided
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const statistics = await getCashStatistics(
      session.user.id,
      start,
      end,
      merchantId || undefined
    );

    return NextResponse.json({
      success: true,
      statistics,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  } catch (error: any) {
    console.error('Error fetching cash statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash statistics', details: error.message },
      { status: 500 }
    );
  }
}
