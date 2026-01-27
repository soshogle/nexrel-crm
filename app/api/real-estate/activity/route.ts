import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/real-estate/activity
 * Returns recent activity for the real estate dashboard
 * Currently returns empty data - will aggregate real activity later
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return empty activity for now
    // This will aggregate from various sources in Phase 2
    return NextResponse.json({
      activities: [],
      message: 'Activity tracking will be available after connecting data sources'
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
