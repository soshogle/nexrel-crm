/**
 * Website CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { websiteVoiceAI } from '@/lib/website-builder/voice-ai';
import { triggerWebsiteDeploy } from '@/lib/website-builder/deploy-trigger';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    let website;
    try {
      website = await prisma.website.findFirst({
        where: {
          id: websiteId,
          userId: session.user.id,
        },
        include: {
          builds: {
            orderBy: { startedAt: 'desc' },
            take: 3,
          },
          websiteIntegrations: true,
        },
      });
    } catch (queryError: any) {
      console.error('[Website GET] Prisma query error:', queryError);
      // Fallback: try without includes (can fail if structure/json is corrupted)
      try {
        website = await prisma.website.findFirst({
          where: { id: websiteId, userId: session.user.id },
        });
        if (website) {
          (website as any).builds = [];
          (website as any).websiteIntegrations = [];
        }
      } catch (fallbackError: any) {
        console.error('[Website GET] Fallback query also failed:', fallbackError);
        throw queryError;
      }
    }

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    try {
      return NextResponse.json({ website });
    } catch (serializeError: any) {
      console.error('[Website GET] JSON serialization failed:', serializeError);
      // Return minimal payload if full serialization fails (e.g. huge/corrupt structure)
      const safe = {
        id: website.id,
        name: website.name,
        status: website.status,
        type: website.type,
        userId: website.userId,
        structure: {},
        seoData: {},
        builds: (website as any).builds ?? [],
        websiteIntegrations: (website as any).websiteIntegrations ?? [],
      };
      return NextResponse.json({ website: safe });
    }
  } catch (error: any) {
    console.error('[Website GET] Error fetching website:', error);
    const message = error?.message || 'Failed to fetch website';
    const code = error?.code;
    return NextResponse.json(
      {
        error: message,
        ...(process.env.NODE_ENV === 'development' && { details: code, stack: error?.stack }),
      },
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
    const { name, structure, seoData, voiceAIEnabled, voiceAIConfig, enableTavusAvatar, status, agencyConfig } = body;

    // Merge voiceAIConfig with existing if partial update
    let finalVoiceAIConfig = voiceAIConfig;
    if (voiceAIConfig !== undefined) {
      const existing = await prisma.website.findUnique({
        where: { id: params.id, userId: session.user.id },
        select: { voiceAIConfig: true },
      });
      const existingConfig = (existing?.voiceAIConfig as Record<string, unknown>) || {};
      finalVoiceAIConfig = { ...existingConfig, ...voiceAIConfig };
    }

    // Merge agencyConfig with existing if partial update
    let finalAgencyConfig = agencyConfig;
    if (agencyConfig !== undefined) {
      const existing = await prisma.website.findUnique({
        where: { id: params.id, userId: session.user.id },
        select: { agencyConfig: true },
      });
      const existingConfig = (existing?.agencyConfig as Record<string, unknown>) || {};
      finalAgencyConfig = { ...existingConfig, ...agencyConfig };
    }

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
        ...(finalVoiceAIConfig !== undefined && { voiceAIConfig: finalVoiceAIConfig }),
        ...(enableTavusAvatar !== undefined && { enableTavusAvatar }),
        ...(status && ['BUILDING', 'READY', 'PUBLISHED', 'FAILED'].includes(status) && { status }),
        ...(finalAgencyConfig !== undefined && { agencyConfig: finalAgencyConfig }),
      },
    });

    // Auto-sync owner's custom prompt to ElevenLabs agent (no manual {{custom_prompt}} setup needed)
    const customPrompt = (finalVoiceAIConfig as { customPrompt?: string })?.customPrompt;
    if (
      voiceAIConfig !== undefined &&
      customPrompt !== undefined &&
      website.elevenLabsAgentId
    ) {
      websiteVoiceAI
        .syncCustomPromptToAgent(
          website.elevenLabsAgentId,
          website.name,
          customPrompt,
          website.userId
        )
        .then((result) => {
          if (!result.success) {
            console.warn('[Website PATCH] ElevenLabs prompt sync failed:', result.error);
          }
        })
        .catch((err) => console.warn('[Website PATCH] ElevenLabs prompt sync error:', err));
    }

    // Trigger deploy when structure changes (Eyal, Theodora, future sites)
    if (structure) {
      triggerWebsiteDeploy(params.id).then((r) => {
        if (!r.ok) console.warn('[Website PATCH] Deploy trigger:', r.error);
      });
    }

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
