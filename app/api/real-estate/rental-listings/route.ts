/**
 * Rental listings API - separate section for rental properties
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return apiErrors.unauthorized();

    const ctx = getDalContextFromSession(session);
    if (!ctx) return apiErrors.unauthorized();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '200');

    const rentals = await getCrmDb(ctx).rERentalListing.findMany({
      where: {
        userId: session.user.id,
        ...(status && status !== 'ALL' && { listingStatus: status as any }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ rentals });
  } catch (error) {
    console.error('Rental listings GET error:', error);
    return apiErrors.internal('Failed to fetch rental listings');
  }
}
