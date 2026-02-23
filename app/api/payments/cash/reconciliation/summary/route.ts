
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { calculateReconciliationSummary } from '@/lib/payments/cash-service';
import { apiErrors } from '@/lib/api-error';

/**
 * POST /api/payments/cash/reconciliation/summary
 * Calculate reconciliation summary for a date range (without creating the reconciliation)
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { startDate, endDate, merchantId } = body;

    // Validation
    if (!startDate || !endDate) {
      return apiErrors.badRequest('Start date and end date are required');
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
    return apiErrors.internal('Failed to calculate reconciliation summary', error.message);
  }
}
