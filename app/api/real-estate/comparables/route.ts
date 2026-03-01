/**
 * Geo-Based Comparable Properties API
 *
 * POST: Find comparable sold properties for a subject property using
 *       geolocation, postal code proximity, and property criteria scoring.
 *
 * GET:  Backfill lat/lng coordinates for REProperty records that are
 *       missing them (required for accurate distance-based comparables).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';
import { findGeoComparables, backfillPropertyCoordinates } from '@/lib/real-estate/geo-comps';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return apiErrors.unauthorized();

  const body = await req.json();
  const {
    address, city, state, zip, postalCode,
    latitude, longitude,
    beds, baths, sqft, yearBuilt, lotSize,
    propertyType,
    limit = 10,
    maxDistanceKm = 25,
    includeActive = false,
  } = body;

  if (!address || !city) {
    return NextResponse.json(
      { error: 'address and city are required' },
      { status: 400 }
    );
  }

  const result = await findGeoComparables(
    {
      address,
      city,
      state: state || 'QC',
      zip,
      postalCode,
      latitude: latitude != null ? parseFloat(latitude) : undefined,
      longitude: longitude != null ? parseFloat(longitude) : undefined,
      beds: beds || 3,
      baths: baths || 1,
      sqft: sqft || 1200,
      yearBuilt: yearBuilt || undefined,
      lotSize: lotSize || undefined,
      propertyType: propertyType || 'SINGLE_FAMILY',
    },
    session.user.id,
    { limit, maxDistanceKm, includeActive, verbose: true }
  );

  return NextResponse.json({
    ok: true,
    ...result,
    comparables: result.comparables.map((c) => ({
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      price: c.price,
      soldPrice: c.soldPrice,
      listPrice: c.listPrice,
      soldDate: c.soldDate,
      daysOnMarket: c.daysOnMarket,
      beds: c.beds,
      baths: c.baths,
      sqft: c.sqft,
      yearBuilt: c.yearBuilt,
      lotSize: c.lotSize,
      propertyType: c.propertyType,
      mlsNumber: c.mlsNumber,
      status: c.status,
      distanceKm: c.distanceKm,
      postalMatch: c.postalMatch,
      proximityScore: c.proximityScore,
      criteriaScore: c.criteriaScore,
      totalScore: c.totalScore,
      pricePerSqft: c.pricePerSqft,
      adjustedPrice: c.adjustedPrice,
      adjustments: c.adjustments,
    })),
  });
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return apiErrors.unauthorized();

  const action = req.nextUrl.searchParams.get('action');

  if (action === 'backfill-coords') {
    const result = await backfillPropertyCoordinates(session.user.id, {
      limit: 50,
      verbose: true,
    });
    return NextResponse.json({ ok: true, ...result });
  }

  return NextResponse.json({
    ok: true,
    endpoints: {
      'POST /api/real-estate/comparables': 'Find geo-based comparables for a subject property',
      'GET /api/real-estate/comparables?action=backfill-coords': 'Backfill lat/lng for properties missing coordinates',
    },
  });
}
