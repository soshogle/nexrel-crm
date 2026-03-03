/**
 * Website CRUD API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService, getCrmDb } from '@/lib/dal';
import { resolveWebsiteDb } from '@/lib/dal/resolve-website-db';
import { websiteVoiceAI } from '@/lib/website-builder/voice-ai';
import { triggerWebsiteDeploy } from '@/lib/website-builder/deploy-trigger';
import { resourceProvisioning } from '@/lib/website-builder/provisioning';
import { apiErrors } from '@/lib/api-error';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const websiteId = params.id;
    if (!websiteId) {
      return apiErrors.badRequest('Website ID is required');
    }

    let website;
    const tryFindWebsite = async (db: any) => {
      try {
        return await db.website.findFirst({
          where: { id: websiteId, userId: ctx.userId },
          include: {
            builds: { orderBy: { startedAt: 'desc' }, take: 3 },
            websiteIntegrations: true,
          },
        });
      } catch {
        const w = await db.website.findFirst({
          where: { id: websiteId, userId: ctx.userId },
        });
        if (w) { (w as any).builds = []; (w as any).websiteIntegrations = []; }
        return w;
      }
    };

    website = await tryFindWebsite(getCrmDb(ctx));

    // Fallback: resolve via multi-DB scan if session routing missed it
    if (!website) {
      const resolved = await resolveWebsiteDb(websiteId);
      if (resolved) {
        website = await tryFindWebsite(resolved.db);
      }
    }

    if (!website) {
      return apiErrors.notFound('Website not found');
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
      return apiErrors.unauthorized();
    }

    const ctx = getDalContextFromSession(session) ?? { userId: session?.user?.id || '', industry: null };

    const body = await request.json();
    const { name, structure, seoData, voiceAIEnabled, voiceAIConfig, enableTavusAvatar, status, agencyConfig, navConfig, pageLabels, neonDatabaseUrl, vercelDeployHookUrl } = body;

    // Merge voiceAIConfig with existing if partial update
    let finalVoiceAIConfig = voiceAIConfig;
    if (voiceAIConfig !== undefined) {
      const existing = await websiteService.findUnique(ctx, params.id);
      const existingConfig = existing ? ((existing.voiceAIConfig as Record<string, unknown>) || {}) : {};
      finalVoiceAIConfig = { ...existingConfig, ...voiceAIConfig };
    }

    // Merge agencyConfig with existing if partial update
    let finalAgencyConfig = agencyConfig;
    if (agencyConfig !== undefined) {
      const existingForAgency = await websiteService.findUnique(ctx, params.id);
      const existingConfig = existingForAgency ? ((existingForAgency.agencyConfig as Record<string, unknown>) || {}) : {};
      finalAgencyConfig = { ...existingConfig, ...agencyConfig };
    }

    const website: any = await websiteService.update(ctx, params.id, {
      ...(name && { name }),
      ...(structure && { structure }),
      ...(seoData && { seoData }),
      ...(voiceAIEnabled !== undefined && { voiceAIEnabled }),
      ...(finalVoiceAIConfig !== undefined && { voiceAIConfig: finalVoiceAIConfig }),
      ...(enableTavusAvatar !== undefined && { enableTavusAvatar }),
      ...(status && ['BUILDING', 'READY', 'PUBLISHED', 'FAILED'].includes(status) && { status }),
      ...(finalAgencyConfig !== undefined && { agencyConfig: finalAgencyConfig }),
      ...(navConfig !== undefined && { navConfig }),
      ...(pageLabels !== undefined && { pageLabels }),
      ...(neonDatabaseUrl !== undefined && { neonDatabaseUrl: neonDatabaseUrl || null }),
      ...(vercelDeployHookUrl !== undefined && { vercelDeployHookUrl: (vercelDeployHookUrl as string)?.trim() || null }),
    } as any);

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

    // Trigger deploy when structure, nav, or content changes (Model B: auto-deploy on save)
    const contentChanged = structure || navConfig !== undefined || pageLabels !== undefined || agencyConfig !== undefined;
    if (contentChanged) {
      triggerWebsiteDeploy(params.id).then((r) => {
        if (!r.ok) console.warn('[Website PATCH] Deploy trigger:', r.error);
      });
    }

    return NextResponse.json({ website });
  } catch (error: any) {
    console.error('Error updating website:', error);
    return apiErrors.internal('Failed to update website');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    // SERVICE websites with active deployments require SUPER_ADMIN or explicit confirmation
    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const isServiceSite = (website as any).templateType === 'SERVICE' && (website as any).status === 'READY';
    if (isServiceSite && session?.user?.role !== 'SUPER_ADMIN') {
      const url = new URL(request.url);
      const confirm = url.searchParams.get('confirm');
      if (confirm !== 'true') {
        return NextResponse.json(
          { error: 'Active SERVICE website deletion requires ?confirm=true. This will remove the live site, Vercel project, and database.' },
          { status: 400 }
        );
      }
    }

    // Log critical config before deletion for recovery
    console.log(`[Website Delete] Archiving config for ${params.id}:`, JSON.stringify({
      id: params.id,
      name: (website as any).name,
      userId: (website as any).userId,
      templateType: (website as any).templateType,
      vercelDeploymentUrl: (website as any).vercelDeploymentUrl,
      agencyConfig: (website as any).agencyConfig,
      navConfig: (website as any).navConfig,
    }));

    // Delete related records first (cascading deletes)
    // Use a transaction to ensure atomicity
    try {
      await getCrmDb(ctx).$transaction(async (tx: any) => {
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

      // Clean up external resources (best-effort, don't block response)
      const cleanup = resourceProvisioning.cleanupResources({
        githubRepoUrl: website.githubRepoUrl,
        vercelProjectId: website.vercelProjectId,
        neonDatabaseUrl: website.neonDatabaseUrl,
        elevenLabsAgentId: website.elevenLabsAgentId,
        userId: ctx.userId,
        websiteId: params.id,
      });
      // Fire-and-forget but log errors
      cleanup.then(({ errors }) => {
        if (errors.length > 0) {
          console.warn(`[Website Delete] External cleanup had ${errors.length} error(s):`, errors);
        } else {
          console.log(`[Website Delete] All external resources cleaned up for ${params.id}`);
        }
      });

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
        return apiErrors.notFound('Website not found or already deleted',);
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
    return apiErrors.internal('Failed to delete website');
  }
}
