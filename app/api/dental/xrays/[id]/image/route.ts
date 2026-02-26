/**
 * X-Ray Image Download API
 * Serves X-ray images for display and AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRouteDb } from '@/lib/dal/get-route-db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';
import { t } from '@/lib/i18n-server';
import { apiErrors } from '@/lib/api-error';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET /api/dental/xrays/[id]/image - Get X-ray image
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized(await t('api.unauthorized'));
    }
    const db = getRouteDb(session);

    // Find X-ray
    const xray = await (db as any).dentalXRay.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!xray) {
      return apiErrors.notFound(await t('api.xrayNotFound'));
    }

    // If imageUrl is already available, redirect to it
    if (xray.imageUrl) {
      return NextResponse.redirect(xray.imageUrl);
    }

    // Otherwise, download from storage and serve
    if (xray.imageFile) {
      const storageService = new CanadianStorageService();
      // Note: This would need encryption key - for now, return error
      // In production, you'd store the encryption key with the X-ray record
      return NextResponse.json(
        { error: await t('api.imageDownloadNotImplemented') },
        { status: 501 }
      );
    }

    return apiErrors.notFound(await t('api.noImageAvailable'));
  } catch (error) {
    console.error('Error fetching X-ray image:', error);
    return apiErrors.internal(await t('api.failedToFetchImage'));
  }
}
