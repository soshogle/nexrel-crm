
/**
 * Payment Analytics API
 * GET /api/payments/analytics?range=30d
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyticsService } from '@/lib/payments/analytics-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get('range') as '7d' | '30d' | '90d' | '1y') || '30d';

    // Validate range
    if (!['7d', '30d', '90d', '1y'].includes(range)) {
      return apiErrors.badRequest('Invalid date range. Must be one of: 7d, 30d, 90d, 1y');
    }

    // Get analytics data
    const analytics = await analyticsService.getPaymentAnalytics(
      session.user.id,
      range
    );

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return apiErrors.internal('Failed to fetch analytics');
  }
}

/**
 * Export analytics to CSV
 * GET /api/payments/analytics/export?range=30d
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const range = (searchParams.get('range') as '7d' | '30d' | '90d' | '1y') || '30d';

    // Generate CSV
    const csv = await analyticsService.exportToCSV(session.user.id, range);

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payment-analytics-${range}.csv"`,
      },
    });
  } catch (error) {
    console.error('[Analytics Export API] Error:', error);
    return apiErrors.internal('Failed to export analytics');
  }
}
