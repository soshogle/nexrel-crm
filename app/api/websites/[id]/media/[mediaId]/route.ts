/**
 * PATCH - Update media metadata (alt, description) for SEO
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, websiteService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const website = await websiteService.findUnique(ctx, params.id);
    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const db = getCrmDb(ctx);
    const body = await request.json();
    const { alt, description } = body;

    const existing = await db.websiteMedia.findFirst({
      where: { id: params.mediaId, websiteId: params.id },
    });
    if (!existing) {
      return apiErrors.notFound('Media not found');
    }

    const updateData: Record<string, unknown> = {};
    if (alt !== undefined) updateData.alt = alt || null;
    if (description !== undefined) {
      const metadata = { ...((existing.metadata as Record<string, unknown>) || {}) };
      if (description) metadata.description = description;
      else delete metadata.description;
      updateData.metadata = Object.keys(metadata).length ? metadata : null;
    }

    const media = await db.websiteMedia.update({
      where: { id: params.mediaId },
      data: updateData,
    });

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Media update error:', error);
    return apiErrors.internal(error.message || 'Failed to update media');
  }
}
