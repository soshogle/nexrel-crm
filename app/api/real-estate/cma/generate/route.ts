export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCMA } from '@/lib/real-estate/cma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { address, city, state, zip, beds, baths, sqft, yearBuilt } = body;

    if (!address) {
      return NextResponse.json({ error: 'Property address is required' }, { status: 400 });
    }
    if (!beds || !baths || !sqft) {
      return NextResponse.json({ error: 'Beds, baths, and square footage are required' }, { status: 400 });
    }

    const subject = {
      address,
      city: city || '',
      state: state || '',
      zip: zip || '',
      propertyType: body.propertyType || 'Single Family',
      beds: parseInt(beds),
      baths: parseFloat(baths),
      sqft: parseInt(sqft),
      yearBuilt: yearBuilt ? parseInt(yearBuilt) : undefined,
    };

    const result = await generateCMA(subject, session.user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('CMA generate error:', error);
    return NextResponse.json({ error: 'Failed to generate CMA report' }, { status: 500 });
  }
}
