
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateReconciliationSummary } from '@/lib/payments/cash-service';

/**
 * POST /api/payments/cash/reconciliation/summary
 * Calculate reconciliation summary for a date range (without creating the reconciliation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, merchantId } = body;

    // Validation
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const summary = await calculateReconciliationSummary(
      session.user.id,
      new Date(startDate),
      new Date(endDate),
      merchantId
    );

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('Error calculating reconciliation summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate reconciliation summary', details: error.message },
      { status: 500 }
    );
  }
}
