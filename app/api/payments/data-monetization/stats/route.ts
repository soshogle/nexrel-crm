
/**
 * Data Monetization Stats API
 * Returns aggregated statistics for dashboard overview
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dataMonetizationService } from '@/lib/payments/data-monetization-service';
import { apiErrors } from '@/lib/api-error';


export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const stats = await dataMonetizationService.getAggregatedStats(
      session.user.id
    );

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    return apiErrors.internal('Failed to fetch stats', error.message);
  }
}
