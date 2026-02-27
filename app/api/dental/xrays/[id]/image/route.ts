/**
 * X-Ray Image Download API
 * Serves X-ray images for display and AI analysis.
 * Prefers cloud URLs (fullUrl/previewUrl/thumbnailUrl), falls back to
 * downloading and decrypting from Canadian storage.
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

    const xray = await (db as any).dentalXRay.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!xray) {
      return apiErrors.notFound(await t('api.xrayNotFound'));
    }

    // Prefer cloud-hosted compressed images (fastest)
    const cloudUrl = xray.fullUrl || xray.previewUrl || xray.thumbnailUrl || xray.imageUrl;
    if (cloudUrl) {
      return NextResponse.redirect(cloudUrl);
    }

    // Fall back to decrypting from Canadian storage
    if (xray.imageFile || xray.dicomFile) {
      const storagePath = xray.imageFile || xray.dicomFile;
      const encryptionKey = process.env.DENTAL_STORAGE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';

      if (!encryptionKey) {
        console.error('[X-Ray Image] No encryption key configured — set DENTAL_STORAGE_ENCRYPTION_KEY');
        return NextResponse.json(
          { error: 'Storage encryption key not configured. Set DENTAL_STORAGE_ENCRYPTION_KEY in .env' },
          { status: 500 }
        );
      }

      try {
        const storageService = new CanadianStorageService();
        const imageBuffer = await storageService.downloadDocument(storagePath, encryptionKey);

        const contentType = storagePath.endsWith('.dcm')
          ? 'application/dicom'
          : storagePath.endsWith('.tiff') || storagePath.endsWith('.tif')
          ? 'image/tiff'
          : 'image/jpeg';

        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(imageBuffer.length),
            'Cache-Control': 'private, max-age=3600',
          },
        });
      } catch (storageError: any) {
        console.error('[X-Ray Image] Storage download failed:', storageError.message);
        return NextResponse.json(
          { error: 'Failed to retrieve image from storage: ' + storageError.message },
          { status: 500 }
        );
      }
    }

    return apiErrors.notFound(await t('api.noImageAvailable'));
  } catch (error) {
    console.error('Error fetching X-ray image:', error);
    return apiErrors.internal(await t('api.failedToFetchImage'));
  }
}
