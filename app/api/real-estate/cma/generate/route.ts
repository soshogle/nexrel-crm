export const dynamic = "force-dynamic";
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateCMA } from '@/lib/real-estate/cma';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const body = await request.json();
    const { address, city, state, zip, beds, baths, sqft, yearBuilt } = body;

    if (!address) {
      return apiErrors.badRequest('Property address is required');
    }
    if (!beds || !baths || !sqft) {
      return apiErrors.badRequest('Beds, baths, and square footage are required');
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
    return apiErrors.internal('Failed to generate CMA report');
  }
}
