/**
 * Upload Image for Swapping
 * Handles image upload when user wants to swap an image via conversational AI
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiModificationService } from '@/lib/website-builder/ai-modification-service';
import { websiteService } from '@/lib/dal';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { apiErrors } from '@/lib/api-error';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const websiteId = formData.get('websiteId') as string;
    const imagePath = formData.get('imagePath') as string; // Path to replace

    if (!file || !websiteId || !imagePath) {
      return apiErrors.badRequest('File, websiteId, and imagePath are required');
    }

    // Verify website belongs to user
    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return apiErrors.notFound('Website not found');
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
    return apiErrors.internal(error.message || 'Failed to upload image');
  }
}
