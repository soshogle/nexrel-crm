/**
 * Apply a template's structure to an existing website page
 * Used as fallback when Import from URL fails
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDalContextFromSession } from '@/lib/context/industry-context';
import { websiteService, getCrmDb } from '@/lib/dal';
import { apiErrors } from '@/lib/api-error';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const ctx = getDalContextFromSession(session);
    if (!ctx) {
      return apiErrors.unauthorized();
    }

    const website = await websiteService.findUnique(ctx, params.id);

    if (!website) {
      return apiErrors.notFound('Website not found');
    }

    const body = await request.json();
    const { templateId, pagePath = '/' } = body;
    if (!templateId) {
      return apiErrors.badRequest('Template ID is required');
    }

    const template = await (getCrmDb(ctx) as any).websiteTemplate.findUnique({
      where: { id: templateId },
    } as any);

    if (!template) {
      return apiErrors.notFound('Template not found');
    }

    const templateStructure = template.structure as any;
    const templatePages = templateStructure?.pages || [];
    const homePage = templatePages.find(
      (p: any) => p.path === '/' || p.id === 'home'
    ) || templatePages[0];

    if (!homePage?.components?.length) {
      return apiErrors.badRequest('Template has no components to apply');
    }

    const structure = (website.structure || {}) as any;
    let pages = structure?.pages || [];
    if (pages.length === 0) {
      pages = [{ id: 'home', name: 'Home', path: '/', components: [] }];
      structure.pages = pages;
    }
    let pageIndex = pages.findIndex((p: any) => p.path === pagePath);
    if (pageIndex < 0) {
      pageIndex = pages.findIndex((p: any) => p.path === '/');
    }
    if (pageIndex < 0) pageIndex = 0;

    const newStructure = JSON.parse(JSON.stringify(structure));
    const targetPage = newStructure.pages[pageIndex];
    if (!targetPage) {
      return apiErrors.badRequest('Page not found in website structure');
    }

    // Add template components with fresh IDs to avoid collisions
    const ts = Date.now();
    const newComponents = homePage.components.map((c: any, i: number) => ({
      ...c,
      id: `${c.type?.toLowerCase() || 'comp'}-${ts}-${i}`,
    }));

    targetPage.components = targetPage.components || [];
    targetPage.components.push(...newComponents);

    await websiteService.update(ctx, params.id, { structure: newStructure });

    const { triggerWebsiteDeploy } = await import('@/lib/website-builder/deploy-trigger');
    triggerWebsiteDeploy(params.id).catch((e) => console.warn('[Apply template] Deploy:', e));

    return NextResponse.json({
      success: true,
      addedCount: newComponents.length,
      structure: newStructure,
    });
  } catch (error: any) {
    console.error('[Apply template]', error);
    return apiErrors.internal(error?.message || 'Failed to apply template');
  }
}
