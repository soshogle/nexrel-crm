/**
 * AI Website Modification API
 * Processes chat messages and generates website changes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCrmDb, websiteService } from '@/lib/dal';
import { getDalContextFromSession, createDalContext } from '@/lib/context/industry-context';
import { changeApproval } from '@/lib/website-builder/approval';
import { aiModificationService } from '@/lib/website-builder/ai-modification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const internalSecret = request.headers.get('x-internal-secret');
    const internalUserId = body._internalUserId;
    const isInternalCall = internalSecret === process.env.NEXTAUTH_SECRET && internalUserId;

    let userId: string;
    const session = await getServerSession(authOptions);
    if (isInternalCall) {
      userId = internalUserId;
    } else {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      userId = session.user.id;
    }

    const { websiteId, message, imageUpload } = body; // imageUpload for image swapping

    if (!websiteId || !message) {
      return NextResponse.json(
        { error: 'Website ID and message are required' },
        { status: 400 }
      );
    }

    const ctx = isInternalCall ? createDalContext(userId) : getDalContextFromSession(session);
    if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const website = await websiteService.findUnique(ctx, websiteId);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Handle image upload if provided (for image swapping)
    let imagePathToReplace: string | null = null;
    let newImageUrl: string | null = null;
    
    if (imageUpload) {
      // First, get the image path from the message context
      // We'll need to call AI to identify which image to replace
      const tempResult = await aiModificationService.generateChanges({
        message,
        websiteStructure: website.structure as any,
        userId,
        websiteId,
        extractedData: website.extractedData as any,
      });

      if (tempResult.requiresImageUpload) {
        imagePathToReplace = tempResult.requiresImageUpload.currentImagePath;
        
        // Upload the new image
        const imageBuffer = Buffer.from(imageUpload.data, 'base64');
        const swappedImage = await aiModificationService.swapImage(
          imagePathToReplace,
          imageBuffer,
          imageUpload.contentType || 'image/jpeg',
          userId,
          websiteId
        );
        
        newImageUrl = swappedImage.url;
      }
    }

    // Use AI to interpret the message and generate changes
    // If we have a new image URL, include it in the context
    const modificationMessage = newImageUrl && imagePathToReplace
      ? `${message} (use image URL: ${newImageUrl} for path: ${imagePathToReplace})`
      : message;

    const modificationResult = await aiModificationService.generateChanges({
      message: modificationMessage,
      websiteStructure: website.structure as any,
      userId,
      websiteId,
      extractedData: website.extractedData as any,
    });

    // If we uploaded an image, ensure the change is included
    let changes = modificationResult.changes;
    if (newImageUrl && imagePathToReplace) {
      // Check if change already exists, otherwise add it
      const existingChange = changes.find(
        (ch: any) => ch.path === imagePathToReplace && ch.type === 'update'
      );
      
      if (!existingChange) {
        changes.push({
          type: 'update',
          path: imagePathToReplace,
          data: newImageUrl,
          description: 'Replace image with uploaded image',
        });
      } else {
        // Update existing change with new URL
        existingChange.data = newImageUrl;
      }
    }

    // Generate preview
    const preview = changeApproval.generatePreview(
      website.structure as any,
      changes
    );

    // Create approval request
    const approval = await getCrmDb(ctx).websiteChangeApproval.create({
      data: {
        websiteId,
        changeType: 'AI_MODIFICATION',
        changes: changes as any,
        preview: preview as any,
        status: 'PENDING',
        requestedBy: userId,
      },
    });

    // Update website with pending changes
    await websiteService.update(ctx, websiteId, {
        pendingChanges: {
          approvalId: approval.id,
          changes,
          preview,
        },
      } as any,
    });

    return NextResponse.json({
      success: true,
      approvalId: approval.id,
      changes,
      preview,
      requiresImageUpload: !imageUpload ? modificationResult.requiresImageUpload : undefined,
      explanation: modificationResult.explanation,
    });
  } catch (error: any) {
    console.error('Error processing modification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process modification' },
      { status: 500 }
    );
  }
}

// Legacy functions removed - now using AIModificationService
