export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { searchWebsiteListings } from '@/lib/website-builder/listings-service';

/**
 * Search the owner's website Neon DB for listings by MLS# or address.
 * Used to find and import listings that were created on Centris/Realtor into the CRM.
 * GET /api/real-estate/properties/search-website?q=12345
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const { results, error } = await searchWebsiteListings(session.user.id, q);

    if (error) {
      return NextResponse.json({ results: [], warning: error });
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search website listings error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
