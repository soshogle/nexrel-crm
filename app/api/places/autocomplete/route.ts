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
    const input = searchParams.get('input');
    const types = searchParams.get('types') || '(cities)';

    if (!input || input.length < 2) {
      return NextResponse.json({ predictions: [] });
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
      // Return empty predictions if no API key - component will work as text input
      return NextResponse.json({ predictions: [], noApiKey: true });
    }

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}&key=${apiKeyRecord.keyValue}`;

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
