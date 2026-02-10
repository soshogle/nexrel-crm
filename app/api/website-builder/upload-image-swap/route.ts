/**
 * Upload Image for Swapping
 * Handles image upload when user wants to swap an image via conversational AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiModificationService } from '@/lib/website-builder/ai-modification-service';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const websiteId = formData.get('websiteId') as string;
    const imagePath = formData.get('imagePath') as string; // Path to replace

    if (!file || !websiteId || !imagePath) {
      return NextResponse.json(
        { error: 'File, websiteId, and imagePath are required' },
        { status: 400 }
      );
    }

    // Verify website belongs to user
    const website = await prisma.website.findFirst({
      where: {
        id: websiteId,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload and swap image
    const swappedImage = await aiModificationService.swapImage(
      imagePath,
      buffer,
      file.type || 'image/jpeg',
      session.user.id,
      websiteId
    );

    return NextResponse.json({
      success: true,
      url: swappedImage.url,
      path: swappedImage.path,
    });
  } catch (error: any) {
    console.error('Error uploading image swap:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
