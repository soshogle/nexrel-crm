import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAnalyticsDashboard } from '@/lib/lead-generation/analytics';

/**
 * GET /api/lead-generation/analytics/dashboard
 * Get analytics dashboard data
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const dashboard = await getAnalyticsDashboard(session.user.id);
    
    return NextResponse.json({
      success: true,
      dashboard
    });
  } catch (error) {
    console.error('Error fetching analytics dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
