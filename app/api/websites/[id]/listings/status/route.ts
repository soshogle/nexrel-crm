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
import { apiErrors } from '@/lib/api-error';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return apiErrors.notFound('Website not found');
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
    return apiErrors.internal((err as Error).message || 'Failed to get status');
  }
}
