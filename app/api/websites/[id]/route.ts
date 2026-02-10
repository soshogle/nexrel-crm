/**
 * Website CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        builds: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        websiteIntegrations: true,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json({ website });
  } catch (error: any) {
    console.error('Error fetching website:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, structure, seoData, voiceAIEnabled, voiceAIConfig } = body;

    const website = await prisma.website.update({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      data: {
        ...(name && { name }),
        ...(structure && { structure }),
        ...(seoData && { seoData }),
        ...(voiceAIEnabled !== undefined && { voiceAIEnabled }),
        ...(voiceAIConfig && { voiceAIConfig }),
      },
    });

    return NextResponse.json({ website });
  } catch (error: any) {
    console.error('Error updating website:', error);
    return NextResponse.json(
      { error: 'Failed to update website' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const website = await prisma.website.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    // Delete related records first (cascading deletes)
    // Use a transaction to ensure atomicity
    try {
      await prisma.$transaction(async (tx) => {
        // Delete website products
        await tx.websiteProduct.deleteMany({
          where: { websiteId: params.id },
        });

        // Delete website orders
        await tx.websiteOrder.deleteMany({
          where: { websiteId: params.id },
        });

        // Delete website builds
        await tx.websiteBuild.deleteMany({
          where: { websiteId: params.id },
        });

        // Delete website integrations
        await tx.websiteIntegration.deleteMany({
          where: { websiteId: params.id },
        });

        // Delete website stock settings
        await tx.websiteStockSettings.deleteMany({
          where: { websiteId: params.id },
        });

        // Finally delete the website (regardless of status)
        // This will work even if status is BUILDING
        await tx.website.delete({
          where: { id: params.id },
        });
      });

      // TODO: Clean up external resources (GitHub repo, Vercel project, etc.)
      // await resourceProvisioning.cleanupResources(...)

      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      console.error('Error deleting website and related records:', deleteError);
      console.error('Delete error details:', {
        message: deleteError.message,
        code: deleteError.code,
        meta: deleteError.meta,
      });
      
      // Return a more specific error message
      const errorMessage = deleteError.message || 'Failed to delete website';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? deleteError.stack : undefined,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error deleting website:', error);
    return NextResponse.json(
      { error: 'Failed to delete website' },
      { status: 500 }
    );
  }
}
