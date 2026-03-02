export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { apiErrors } from '@/lib/api-error';

// Global Google Maps API key for all users
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const { searchParams } = new URL(request.url);
    const input = searchParams.get('input');
    const types = searchParams.get('types') || '(cities)';
    const country = searchParams.get('country');

    if (!input || input.length < 2) {
      return NextResponse.json({ predictions: [] });
    }

    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return NextResponse.json({ predictions: [], noApiKey: true });
    }

    const countryParam = country ? `&components=${encodeURIComponent(`country:${country.split(',').join('|country:')}`)}` : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}${countryParam}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places Autocomplete error:', data.status, data.error_message);
      return NextResponse.json({ predictions: [], error: data.status });
    }

    return NextResponse.json({
      predictions: data.predictions || [],
    });
  } catch (error) {
    console.error('Places autocomplete error:', error);
    return NextResponse.json({ predictions: [], error: 'Failed to fetch predictions' });
  }
}
