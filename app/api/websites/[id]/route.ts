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
        // Delete website stock settings first (has unique constraint)
        // Check if exists to avoid errors
        try {
          const stockSettings = await tx.websiteStockSettings.findUnique({
            where: { websiteId: params.id },
          });
          if (stockSettings) {
            await tx.websiteStockSettings.delete({
              where: { websiteId: params.id },
            });
          }
        } catch (stockError: any) {
          // Stock settings might not exist, continue with deletion
          console.log('[Website Delete] No stock settings found, continuing...');
        }

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

        // Delete website visitors
        await tx.websiteVisitor.deleteMany({
          where: { websiteId: params.id },
        });

        // Delete website change approvals
        await tx.websiteChangeApproval.deleteMany({
          where: { websiteId: params.id },
        });

        // Finally delete the website (regardless of status)
        // This will work even if status is BUILDING
        // Prisma will handle any remaining cascade deletes
        await tx.website.delete({
          where: { id: params.id },
        });
      }, {
        timeout: 10000, // 10 second timeout
      });

      // TODO: Clean up external resources (GitHub repo, Vercel project, etc.)
      // await resourceProvisioning.cleanupResources(...)

      return NextResponse.json({ success: true });
    } catch (deleteError: any) {
      // Log the full error for debugging
      console.error('❌ [Website Delete] Full error object:', JSON.stringify(deleteError, Object.getOwnPropertyNames(deleteError), 2));
      console.error('❌ [Website Delete] Error deleting website and related records:', deleteError);
      console.error('❌ [Website Delete] Error details:', {
        message: deleteError.message,
        code: deleteError.code,
        meta: deleteError.meta,
        stack: deleteError.stack,
        name: deleteError.name,
      });
      
      // Check for specific Prisma errors
      if (deleteError.code === 'P2003') {
        return NextResponse.json(
          { 
            error: 'Cannot delete website: Related records still exist. Please contact support.',
            details: process.env.NODE_ENV === 'development' ? deleteError.meta : undefined,
          },
          { status: 400 }
        );
      }
      
      if (deleteError.code === 'P2025') {
        return NextResponse.json(
          { 
            error: 'Website not found or already deleted',
          },
          { status: 404 }
        );
      }
      
      // Return a more specific error message
      const errorMessage = deleteError.message || 'Failed to delete website';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            code: deleteError.code,
            meta: deleteError.meta,
            stack: deleteError.stack,
            name: deleteError.name,
          } : undefined,
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
