
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { clubOSPaymentService } from '@/lib/clubos-payment-service';
import { apiErrors } from '@/lib/api-error';

// GET /api/clubos/payments/statistics - Get payment statistics for admin

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    const stats = await clubOSPaymentService.getPaymentStatistics(
      session.user.id,
      dateRange
    );

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error fetching payment statistics:', error);
    return apiErrors.internal(error.message || 'Failed to fetch statistics');
  }
}
