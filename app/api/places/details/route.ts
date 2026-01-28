export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const placeId = searchParams.get('placeId');

    if (!placeId) {
      return NextResponse.json({ error: 'placeId required' }, { status: 400 });
    }

    // Get user's Google Places API key from database
    const apiKeyRecord = await prisma.apiKey.findFirst({
      where: {
        userId: session.user.id,
        service: 'google_places',
        isActive: true,
      },
    });

    if (!apiKeyRecord?.keyValue) {
      return NextResponse.json({ error: 'Google Places API key not configured' }, { status: 400 });
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=place_id,name,formatted_address,address_components,geometry&key=${apiKeyRecord.keyValue}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return NextResponse.json({ error: data.status }, { status: 400 });
    }

    const result = data.result;
    const placeData: any = {
      placeId: result.place_id,
      description: result.formatted_address,
      lat: result.geometry?.location?.lat,
      lng: result.geometry?.location?.lng,
    };

    // Extract city, state, country from address components
    result.address_components?.forEach((comp: any) => {
      if (comp.types.includes('locality')) placeData.city = comp.long_name;
      if (comp.types.includes('administrative_area_level_1')) placeData.state = comp.short_name;
      if (comp.types.includes('country')) placeData.country = comp.long_name;
    });

    return NextResponse.json({ place: placeData });
  } catch (error) {
    console.error('Place details error:', error);
    return NextResponse.json({ error: 'Failed to fetch details' }, { status: 500 });
  }
}
