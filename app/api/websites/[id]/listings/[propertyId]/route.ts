/**
 * Listings API - Update property gallery (motion toggles)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService } from '@/lib/dal';
import { updatePropertyGallery } from '@/lib/website-builder/listings-service';
import { apiErrors } from '@/lib/api-error';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; propertyId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const propertyId = parseInt(params.propertyId, 10);
    if (isNaN(propertyId)) {
      return apiErrors.badRequest('Invalid property ID');
    }

    const body = await request.json();
    const { galleryImages } = body;

    if (!Array.isArray(galleryImages)) {
      return apiErrors.badRequest('galleryImages must be an array');
    }

    await updatePropertyGallery(params.id, propertyId, galleryImages);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Listings PATCH error:', error);
    return apiErrors.internal(error.message || 'Failed to update listing');
  }
}
