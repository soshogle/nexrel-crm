/**
 * GET /api/websites/[id]/listings/status
 * Returns listings count for SERVICE template websites (Centris sync status).
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { getWebsiteListingsCount } from '@/lib/website-builder/listings-service';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (website.templateType !== 'SERVICE') {
      return NextResponse.json({
        count: 0,
        message: 'Listings are only available for real estate service websites',
      });
    }

    const { count, error } = await getWebsiteListingsCount(params.id);
    return NextResponse.json({ count, error: error ?? null });
  } catch (err: unknown) {
    console.error('Listings status error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to get status' },
      { status: 500 }
    );
  }
}
