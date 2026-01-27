export const dynamic = "force-dynamic";

/**
 * Stale Listing Diagnostic API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { analyzeStaleListing, getStaleListings } from '@/lib/real-estate/market-intelligence';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get stale listings (default action)
    if (!action || action === 'stale_listings') {
      const minDays = parseInt(searchParams.get('minDays') || '21');
      const listings = await getStaleListings(session.user.id, minDays);
      return NextResponse.json({ listings });
    }

    // Get past diagnostics
    if (action === 'history') {
      const diagnostics = await prisma.rEStaleDiagnostic.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: 20
      });
      return NextResponse.json({ diagnostics });
    }

    return NextResponse.json({ listings: [] });
  } catch (error) {
    console.error('Stale diagnostic GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { listing, marketContext } = body;

    if (!listing || !listing.address || !listing.price) {
      return NextResponse.json(
        { error: 'Listing data required (address, price, city, state, daysOnMarket)' },
        { status: 400 }
      );
    }

    const diagnostic = await analyzeStaleListing(
      {
        mlsNumber: listing.mlsNumber || `MANUAL_${Date.now()}`,
        address: listing.address,
        city: listing.city || '',
        state: listing.state || '',
        price: listing.price,
        daysOnMarket: listing.daysOnMarket || 30,
        originalPrice: listing.originalPrice,
        priceReductions: listing.priceReductions,
        bedrooms: listing.bedrooms || 3,
        bathrooms: listing.bathrooms || 2,
        squareFeet: listing.squareFeet || 1500,
        yearBuilt: listing.yearBuilt,
        propertyType: listing.propertyType || 'Single Family',
        description: listing.description,
        photos: listing.photos,
        features: listing.features,
        agentNotes: listing.agentNotes
      },
      session.user.id,
      marketContext
    );

    return NextResponse.json({
      success: true,
      diagnostic
    });
  } catch (error) {
    console.error('Stale diagnostic POST error:', error);
    return NextResponse.json(
      { error: 'Diagnostic analysis failed' },
      { status: 500 }
    );
  }
}
