/**
 * POST /api/real-estate/properties/sync-status-to-website
 *
 * Pushes SOLD/RENTED status from CRM to the owner's website.
 * Matches listings by MLS number and hides price for sold/rented.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncStatusChangesToWebsite } from '@/lib/website-builder/listings-service';
import { apiErrors } from '@/lib/api-error';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const result = await syncStatusChangesToWebsite(session.user.id);

    return NextResponse.json({
      success: true,
      soldUpdated: result.soldUpdated,
      rentedUpdated: result.rentedUpdated,
      message: `Updated ${result.soldUpdated} sold and ${result.rentedUpdated} rented listings on your website.`,
    });
  } catch (error: any) {
    console.error('Sync status to website error:', error);
    return apiErrors.internal(error.message || 'Failed to sync status');
  }
}
