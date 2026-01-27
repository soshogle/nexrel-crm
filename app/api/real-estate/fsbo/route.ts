import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/real-estate/fsbo
 * Returns FSBO leads for the authenticated user
 * Currently returns empty data - will be connected to scrapers later
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return empty data structure for now
    // This will be connected to real FSBO scrapers in Phase 2
    return NextResponse.json({
      leads: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0
      },
      sources: [],
      message: 'FSBO data will be available after connecting data sources'
    });
  } catch (error) {
    console.error('Error fetching FSBO leads:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
