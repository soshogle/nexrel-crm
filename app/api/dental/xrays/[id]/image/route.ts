/**
 * X-Ray Image Download API
 * Serves X-ray images for display and AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CanadianStorageService } from '@/lib/storage/canadian-storage-service';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find X-ray
    const xray = await (prisma as any).dentalXRay.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!xray) {
      return NextResponse.json(
        { error: 'X-ray not found' },
        { status: 404 }
      );
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
        { error: 'Image download not yet implemented. Please use imageUrl field.' },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'No image available' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching X-ray image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
