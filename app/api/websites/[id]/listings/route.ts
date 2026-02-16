/**
 * Listings API - Fetch property listings from service template DB
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getWebsiteListings } from '@/lib/website-builder/listings-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
      select: { id: true, templateType: true, neonDatabaseUrl: true },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    if (website.templateType !== 'SERVICE') {
      return NextResponse.json({
        listings: [],
        message: 'Listings are only available for real estate service websites',
      });
    }

    if (!website.neonDatabaseUrl) {
      return NextResponse.json({
        listings: [],
        message: 'Website database not configured yet',
      });
    }

    const listings = await getWebsiteListings(params.id);
    return NextResponse.json({ listings });
  } catch (error: any) {
    console.error('Listings GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch listings' },
      { status: 500 }
    );
  }
}
