/**
 * Listings API - Fetch property listings from service template DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { getWebsiteListings } from '@/lib/website-builder/listings-service';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
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

    const { templateType, neonDatabaseUrl } = website;
    if (templateType !== 'SERVICE') {
      return NextResponse.json({
        listings: [],
        message: 'Listings are only available for real estate service websites',
      });
    }

    if (!neonDatabaseUrl) {
      return NextResponse.json({
        listings: [],
        message: 'Website database not configured yet',
      });
    }

    const listings = await getWebsiteListings(params.id);
    return NextResponse.json({ listings });
  } catch (error: any) {
    console.error('Listings GET error:', error);
    return apiErrors.internal(error.message || 'Failed to fetch listings');
  }
}
