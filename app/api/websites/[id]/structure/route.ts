/**
 * Website structure partial updates (layout, global styles)
 * PATCH merges updates into structure without full replace
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updateSectionLayout } from '@/lib/website-builder/granular-tools';
import { triggerWebsiteDeploy } from '@/lib/website-builder/deploy-trigger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { type, sectionType, sectionIndex, layout, globalStyles, props, pagePath: reqPagePath, pageSeo } = body;
    const pagePath = reqPagePath ?? '/';

    const structure = (website.structure || {}) as any;

    if (type === 'section_props' && props && sectionType) {
      const newStructure = JSON.parse(JSON.stringify(structure));
      if (!Array.isArray(newStructure.pages)) {
        newStructure.pages = [];
      }

      let pageIndex = newStructure.pages.findIndex((p: any) => p.path === pagePath);

      // If page doesn't exist, create it so navConfig-derived pages can be saved
      if (pageIndex < 0) {
        const pageId = pagePath === '/' ? 'home' : pagePath.slice(1).replace(/\//g, '-') || 'page';
        const pageName = pagePath === '/'
          ? 'Home'
          : pagePath.slice(1).split(/[-/]/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        newStructure.pages.push({
          id: pageId,
          name: pageName,
          path: pagePath,
          components: [{ id: `${sectionType}-1`, type: sectionType, props }],
        });
        await prisma.website.update({
          where: { id: params.id },
          data: { structure: newStructure },
        });
        const deployResult = await triggerWebsiteDeploy(params.id);
        if (!deployResult.ok) console.warn('[Structure PATCH] Deploy:', deployResult.error);
        return NextResponse.json({ success: true, deploy: deployResult });
      }

      if (!Array.isArray(newStructure.pages[pageIndex].components)) {
        newStructure.pages[pageIndex].components = [];
      }

      const compIndex = newStructure.pages[pageIndex].components.findIndex((c: any) => c.type === sectionType);
      if (compIndex >= 0) {
        newStructure.pages[pageIndex].components[compIndex].props = {
          ...(newStructure.pages[pageIndex].components[compIndex].props || {}),
          ...props,
        };
      } else {
        // Section type doesn't exist on this page yet — add it
        newStructure.pages[pageIndex].components.push({
          id: `${sectionType}-${Date.now()}`,
          type: sectionType,
          props,
        });
      }

      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      const deployResult = await triggerWebsiteDeploy(params.id);
      if (!deployResult.ok) {
        console.warn('[Structure PATCH] Deploy failed:', deployResult.error);
      }
      return NextResponse.json({ success: true, deploy: deployResult });
    }

    if (type === 'section_layout' && layout) {
      const newStructure = updateSectionLayout(structure, {
        pagePath,
        sectionType,
        sectionIndex,
        layout: {
          padding: layout.padding,
          margin: layout.margin,
          alignment: layout.alignment,
          visibility: layout.visibility,
        },
      });

      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      const deployResult = await triggerWebsiteDeploy(params.id);
      if (!deployResult.ok) console.warn('[Structure PATCH] Deploy:', deployResult.error);
      return NextResponse.json({ success: true, deploy: deployResult });
    }

    if (type === 'global_styles' && globalStyles) {
      const newStructure = JSON.parse(JSON.stringify(structure));
      newStructure.globalStyles = {
        ...(newStructure.globalStyles || {}),
        ...(globalStyles.fonts && { fonts: { ...(newStructure.globalStyles?.fonts || {}), ...globalStyles.fonts } }),
        ...(globalStyles.colors && { colors: { ...(newStructure.globalStyles?.colors || {}), ...globalStyles.colors } }),
        ...(globalStyles.spacing && { spacing: { ...(newStructure.globalStyles?.spacing || {}), ...globalStyles.spacing } }),
      };

      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      const deployResult = await triggerWebsiteDeploy(params.id);
      if (!deployResult.ok) console.warn('[Structure PATCH] Deploy:', deployResult.error);
      return NextResponse.json({ success: true, deploy: deployResult });
    }

    if (type === 'page_seo' && pageSeo && typeof pageSeo === 'object') {
      const newStructure = JSON.parse(JSON.stringify(structure));
      const pages = newStructure?.pages || [];
      for (const [path, seo] of Object.entries(pageSeo)) {
        const idx = pages.findIndex((p: any) => (p.path || '/') === path);
        if (idx >= 0) {
          pages[idx].seo = { ...(pages[idx].seo || {}), ...(seo as object) };
        }
      }
      newStructure.pages = pages;
      await prisma.website.update({
        where: { id: params.id },
        data: { structure: newStructure },
      });
      const deployResult = await triggerWebsiteDeploy(params.id);
      if (!deployResult.ok) console.warn('[Structure PATCH] Deploy:', deployResult.error);
      return NextResponse.json({ success: true, deploy: deployResult });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error: any) {
    console.error('Structure update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update structure' },
      { status: 500 }
    );
  }
}
