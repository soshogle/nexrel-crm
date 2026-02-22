/**
 * Listings API - Update property gallery (motion toggles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { updatePropertyGallery } from '@/lib/website-builder/listings-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const propertyId = parseInt(params.propertyId, 10);
    if (isNaN(propertyId)) {
      return NextResponse.json({ error: 'Invalid property ID' }, { status: 400 });
    }

    const body = await request.json();
    const { galleryImages } = body;

    if (!Array.isArray(galleryImages)) {
      return NextResponse.json({ error: 'galleryImages must be an array' }, { status: 400 });
    }

    await updatePropertyGallery(params.id, propertyId, galleryImages);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Listings PATCH error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update listing' },
      { status: 500 }
    );
  }
}
