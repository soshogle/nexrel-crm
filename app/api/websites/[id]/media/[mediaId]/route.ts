/**
 * PATCH - Update media metadata (alt, description) for SEO
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: { id: params.id, userId: session.user.id },
    });
    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    const body = await request.json();
    const { alt, description } = body;

    const existing = await prisma.websiteMedia.findFirst({
      where: { id: params.mediaId, websiteId: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (alt !== undefined) updateData.alt = alt || null;
    if (description !== undefined) {
      const metadata = { ...((existing.metadata as Record<string, unknown>) || {}) };
      if (description) metadata.description = description;
      else delete metadata.description;
      updateData.metadata = Object.keys(metadata).length ? metadata : null;
    }

    const media = await prisma.websiteMedia.update({
      where: { id: params.mediaId },
      data: updateData,
    });

    return NextResponse.json({ media });
  } catch (error: any) {
    console.error('Media update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update media' },
      { status: 500 }
    );
  }
}
